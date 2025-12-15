/**
 * Client-side direct upload utilities
 * Uploads files directly to Supabase Storage, bypassing Vercel's serverless function limits
 */

export interface UploadUrlInfo {
  camera: number;
  signedUrl: string;
  storagePath: string;
}

export interface DirectUploadProgress {
  camera: number;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface VideoMetadata {
  boxer1: string;
  boxer2: string;
  weightClass: string;
  round: number;
  fightDate: string;
  fps: number;
}

/**
 * Upload a file directly to Supabase using a signed URL
 * Uses XMLHttpRequest for progress tracking (fetch doesn't support upload progress)
 */
export function uploadFileDirect(
  file: File,
  signedUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress?.(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Open and send
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.send(file);
  });
}

/**
 * Get signed upload URLs from the API
 */
export async function getUploadUrls(
  boxer1: string,
  boxer2: string,
  round: number,
  numCameras: number
): Promise<{ uploadUrls: UploadUrlInfo[]; expiresIn: number }> {
  const response = await fetch('/api/videos/get-upload-urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boxer1, boxer2, round, numCameras })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get upload URLs');
  }

  return response.json();
}

/**
 * Finalize upload by creating the database record
 */
export async function finalizeUpload(
  metadata: VideoMetadata,
  storagePaths: string[]
): Promise<{ videoId: string; urls: string[] }> {
  const response = await fetch('/api/videos/finalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...metadata,
      storagePaths
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to finalize upload');
  }

  return response.json();
}

/**
 * Complete upload workflow:
 * 1. Get signed URLs
 * 2. Upload files directly to Supabase
 * 3. Finalize by creating database record
 */
export async function uploadVideos(
  files: { cam1: File | null; cam2: File | null; cam3: File | null },
  metadata: VideoMetadata,
  onProgress?: (progress: DirectUploadProgress[]) => void
): Promise<{ videoId: string; urls: string[] }> {
  // Filter out null files and create ordered array
  const filesToUpload: { camera: number; file: File }[] = [];
  if (files.cam1) filesToUpload.push({ camera: 1, file: files.cam1 });
  if (files.cam2) filesToUpload.push({ camera: 2, file: files.cam2 });
  if (files.cam3) filesToUpload.push({ camera: 3, file: files.cam3 });

  if (filesToUpload.length === 0) {
    throw new Error('At least one camera file is required');
  }

  // Initialize progress tracking
  const progressState: DirectUploadProgress[] = filesToUpload.map(({ camera }) => ({
    camera,
    progress: 0,
    status: 'pending' as const
  }));

  const updateProgress = (camera: number, update: Partial<DirectUploadProgress>) => {
    const idx = progressState.findIndex(p => p.camera === camera);
    if (idx !== -1) {
      progressState[idx] = { ...progressState[idx], ...update };
      onProgress?.([...progressState]);
    }
  };

  // Step 1: Get signed upload URLs
  const { uploadUrls } = await getUploadUrls(
    metadata.boxer1,
    metadata.boxer2,
    metadata.round,
    filesToUpload.length
  );

  // Step 2: Upload files directly to Supabase in parallel
  const uploadPromises = filesToUpload.map(async ({ camera, file }, index) => {
    const urlInfo = uploadUrls[index];
    updateProgress(camera, { status: 'uploading' });

    try {
      await uploadFileDirect(file, urlInfo.signedUrl, (progress) => {
        updateProgress(camera, { progress });
      });
      updateProgress(camera, { status: 'complete', progress: 100 });
      return urlInfo.storagePath;
    } catch (error) {
      updateProgress(camera, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Upload failed' 
      });
      throw error;
    }
  });

  const storagePaths = await Promise.all(uploadPromises);

  // Step 3: Finalize by creating database record
  return finalizeUpload(metadata, storagePaths);
}
