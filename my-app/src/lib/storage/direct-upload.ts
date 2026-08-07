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
  // Log file details for debugging
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  const fileSizeBytes = file.size;
  console.log('========================================');
  console.log('[Direct Upload] Starting file upload');
  console.log(`[Direct Upload] File name: ${file.name}`);
  console.log(`[Direct Upload] File type: ${file.type}`);
  console.log(`[Direct Upload] File size: ${fileSizeMB} MB (${fileSizeBytes} bytes)`);
  console.log('========================================');

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
        console.log('[Direct Upload] ✅ Upload successful!');
        onProgress?.(100);
        resolve();
      } else {
        console.error('========================================');
        console.error('[Direct Upload] ❌ UPLOAD FAILED - SIZE LIMIT EXCEEDED');
        console.error('========================================');
        console.error(`[Direct Upload] FILE BEING UPLOADED:`);
        console.error(`[Direct Upload]   Name: ${file.name}`);
        console.error(`[Direct Upload]   Size: ${fileSizeMB} MB (${fileSizeBytes} bytes)`);
        console.error(`[Direct Upload]   Type: ${file.type}`);
        console.error('----------------------------------------');
        console.error(`[Direct Upload] KNOWN LIMITS:`);
        console.error(`[Direct Upload]   Supabase Free tier: 50 MB`);
        console.error(`[Direct Upload]   Supabase Pro tier: 5 GB (5368709120 bytes)`);
        console.error(`[Direct Upload]   Your bucket config: 5 GB (confirmed via SQL)`);
        console.error('----------------------------------------');
        console.error(`[Direct Upload] ERROR RESPONSE:`);
        console.error(`[Direct Upload]   Status: ${xhr.status}`);
        console.error(`[Direct Upload]   Response: ${xhr.responseText}`);
        console.error(`[Direct Upload]   URL: ${signedUrl.substring(0, 100)}...`);
        console.error('----------------------------------------');
        console.error(`[Direct Upload] ⚠️ POSSIBLE CAUSES:`);
        console.error(`[Direct Upload]   1. Bucket file_size_limit not actually updated`);
        console.error(`[Direct Upload]   2. Supabase edge/CDN has separate limits`);
        console.error(`[Direct Upload]   3. Signed URL method has different limits`);
        console.error(`[Direct Upload]   4. Contact Supabase support with this info`);
        console.error('========================================');
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => {
      console.error('[Direct Upload] ❌ Network error during upload');
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      console.error('[Direct Upload] ❌ Upload aborted');
      reject(new Error('Upload aborted'));
    });

    // Open and send
    xhr.open('PUT', signedUrl);
    const contentType = file.type || 'video/mp4';
    console.log(`[Direct Upload] Content-Type: ${contentType}`);
    console.log(`[Direct Upload] Signed URL (first 100 chars): ${signedUrl.substring(0, 100)}...`);
    console.log(`[Direct Upload] Sending PUT request...`);
    xhr.setRequestHeader('Content-Type', contentType);
    // 30 days. Without this Supabase defaults the stored cacheControl to 'no-cache',
    // which forces revalidation on every video request and burns cached-egress quota.
    xhr.setRequestHeader('Cache-Control', 'max-age=2592000');
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
  // Debug: Check payload size to ensure no File objects are being serialized
  const payload = { ...metadata, storagePaths };
  const payloadString = JSON.stringify(payload);
  console.log('========================================');
  console.log('[Finalize] PAYLOAD SIZE:', payloadString.length, 'bytes');
  console.log('[Finalize] Payload:', payloadString.substring(0, 500));
  if (payloadString.length > 10000) {
    console.error('[Finalize] ⚠️ WARNING: Payload is very large! May contain file data.');
  }
  console.log('========================================');

  const response = await fetch('/api/videos/finalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payloadString
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
