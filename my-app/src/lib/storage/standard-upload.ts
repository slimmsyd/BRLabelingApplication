/**
 * Standard Supabase Upload (No Signed URLs)
 * 
 * This bypasses the signed URL mechanism and uploads directly
 * to the standard Supabase Storage endpoint using the service role key.
 */

export interface StandardUploadProgress {
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

const BUCKET_NAME = 'fight-videos';

/**
 * Get Supabase credentials from server
 */
async function getCredentials(): Promise<{ token: string; supabaseUrl: string }> {
  const response = await fetch('/api/videos/get-upload-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Failed to get upload credentials');
  }

  return response.json();
}

/**
 * Generate storage path
 */
function generateStoragePath(boxer1: string, boxer2: string, round: number, camera: number): string {
  const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
  return `${sanitize(boxer1)}_${sanitize(boxer2)}/r${round}/cam${camera}.mp4`;
}

/**
 * Upload file using STANDARD Supabase endpoint (not signed URL)
 * Endpoint: /storage/v1/object/{bucket}/{path}
 */
export async function uploadFileStandard(
  file: File,
  storagePath: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const { token, supabaseUrl } = await getCredentials();
  
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  console.log('========================================');
  console.log('[Standard Upload] Starting upload (NO signed URL)');
  console.log(`[Standard Upload] File name: ${file.name}`);
  console.log(`[Standard Upload] File size: ${fileSizeMB} MB (${file.size} bytes)`);
  console.log(`[Standard Upload] Storage path: ${storagePath}`);
  console.log(`[Standard Upload] Endpoint: /storage/v1/object/${BUCKET_NAME}/${storagePath}`);
  console.log('========================================');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        console.log(`[Standard Upload] Progress: ${progress}%`);
        onProgress?.(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log('[Standard Upload] ✅ Upload successful!');
        onProgress?.(100);
        resolve(storagePath);
      } else {
        console.error('========================================');
        console.error('[Standard Upload] ❌ UPLOAD FAILED');
        console.error(`[Standard Upload] Status: ${xhr.status}`);
        console.error(`[Standard Upload] Response: ${xhr.responseText}`);
        console.error(`[Standard Upload] File size: ${fileSizeMB} MB`);
        console.error('========================================');
        reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => {
      console.error('[Standard Upload] ❌ Network error');
      reject(new Error('Network error during upload'));
    });

    // Use STANDARD endpoint (not signed URL endpoint)
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${storagePath}`;
    console.log(`[Standard Upload] URL: ${uploadUrl}`);
    
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.setRequestHeader('x-upsert', 'true'); // Allow overwriting
    xhr.send(file);
  });
}

/**
 * Finalize upload by creating database record
 */
async function finalizeUpload(
  metadata: VideoMetadata,
  storagePaths: string[]
): Promise<{ videoId: string; urls: string[] }> {
  const response = await fetch('/api/videos/finalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...metadata, storagePaths })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to finalize upload');
  }

  return response.json();
}

/**
 * Complete upload workflow using standard endpoint
 */
export async function uploadVideosStandard(
  files: { cam1: File | null; cam2: File | null; cam3: File | null },
  metadata: VideoMetadata,
  onProgress?: (progress: StandardUploadProgress[]) => void
): Promise<{ videoId: string; urls: string[] }> {
  const filesToUpload: { camera: number; file: File }[] = [];
  if (files.cam1) filesToUpload.push({ camera: 1, file: files.cam1 });
  if (files.cam2) filesToUpload.push({ camera: 2, file: files.cam2 });
  if (files.cam3) filesToUpload.push({ camera: 3, file: files.cam3 });

  if (filesToUpload.length === 0) {
    throw new Error('At least one camera file is required');
  }

  const progressState: StandardUploadProgress[] = filesToUpload.map(({ camera }) => ({
    camera,
    progress: 0,
    status: 'pending' as const
  }));

  const updateProgress = (camera: number, update: Partial<StandardUploadProgress>) => {
    const idx = progressState.findIndex(p => p.camera === camera);
    if (idx !== -1) {
      progressState[idx] = { ...progressState[idx], ...update };
      onProgress?.([...progressState]);
    }
  };

  const storagePaths: string[] = [];

  for (const { camera, file } of filesToUpload) {
    const storagePath = generateStoragePath(
      metadata.boxer1,
      metadata.boxer2,
      metadata.round,
      camera
    );

    updateProgress(camera, { status: 'uploading' });

    try {
      await uploadFileStandard(file, storagePath, (progress) => {
        updateProgress(camera, { progress });
      });
      updateProgress(camera, { status: 'complete', progress: 100 });
      storagePaths.push(storagePath);
    } catch (error) {
      updateProgress(camera, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      });
      throw error;
    }
  }

  return finalizeUpload(metadata, storagePaths);
}
