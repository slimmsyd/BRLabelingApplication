/**
 * Resumable Upload Utility using TUS Protocol
 * 
 * This handles large video uploads (up to 5GB) by:
 * 1. Breaking files into small chunks (6MB each)
 * 2. Uploading chunks one at a time
 * 3. Resuming from where it left off if interrupted
 * 
 * This bypasses all size limits that affect regular uploads.
 */

import * as tus from 'tus-js-client';

export interface ResumableUploadProgress {
  camera: number;
  progress: number;
  bytesUploaded: number;
  bytesTotal: number;
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
 * Fetch upload credentials from the server
 * This uses the service role key on the server side
 */
async function getUploadCredentials(): Promise<{ token: string; supabaseUrl: string }> {
  const response = await fetch('/api/videos/get-upload-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get upload credentials');
  }

  return response.json();
}

/**
 * Generate a storage path for a video file
 */
function generateStoragePath(boxer1: string, boxer2: string, round: number, camera: number): string {
  const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
  const b1 = sanitize(boxer1);
  const b2 = sanitize(boxer2);
  return `${b1}_${b2}/r${round}/cam${camera}.mp4`;
}

/**
 * Upload a single file using TUS resumable upload
 */
export async function uploadFileResumable(
  file: File,
  storagePath: string,
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void
): Promise<string> {
  // Get credentials from server
  const { token, supabaseUrl } = await getUploadCredentials();

  // Log upload details
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  console.log('========================================');
  console.log('[Resumable Upload] Starting TUS upload');
  console.log(`[Resumable Upload] File name: ${file.name}`);
  console.log(`[Resumable Upload] File type: ${file.type}`);
  console.log(`[Resumable Upload] File size: ${fileSizeMB} MB (${file.size} bytes)`);
  console.log(`[Resumable Upload] Storage path: ${storagePath}`);
  console.log(`[Resumable Upload] Chunk size: 5 MB`);
  console.log(`[Resumable Upload] Supabase URL: ${supabaseUrl}`);
  console.log(`[Resumable Upload] Total file size in bytes: ${file.size}`);
  console.log(`[Resumable Upload] NOTE: If 413 error occurs, check bucket file_size_limit in Supabase Dashboard`);
  console.log('========================================');

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000], // Retry delays in ms
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
      headers: {
        authorization: `Bearer ${token}`,
        'x-upsert': 'true', // Allow overwriting existing files
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET_NAME,
        objectName: storagePath,
        contentType: file.type || 'video/mp4',
        // 30 days. Matches supabase-provider.ts — long TTL is safe for immutable video files.
        cacheControl: '2592000',
      },
      onError: (error) => {
        console.error('[Resumable Upload] Error:', error);
        reject(new Error(`TUS upload failed: ${error.message}`));
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
        console.log(`[Resumable Upload] Progress: ${percentage}% (${(bytesUploaded / 1024 / 1024).toFixed(2)} MB / ${(bytesTotal / 1024 / 1024).toFixed(2)} MB)`);
        onProgress?.(bytesUploaded, bytesTotal);
      },
      onSuccess: () => {
        console.log('[Resumable Upload] Upload complete!');
        console.log(`[Resumable Upload] File URL: ${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`);
        resolve(storagePath);
      },
    });

    // Check for previous upload attempts and resume if possible
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        console.log('[Resumable Upload] Found previous upload, resuming...');
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      
      // Start the upload
      upload.start();
    });
  });
}

/**
 * Get the public URL for an uploaded file
 */
export function getPublicUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
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
 * Complete upload workflow using resumable uploads:
 * 1. Upload files directly to Supabase using TUS protocol
 * 2. Finalize by creating database record
 * 
 * This is simpler than the signed URL approach and handles large files better.
 */
export async function uploadVideosResumable(
  files: { cam1: File | null; cam2: File | null; cam3: File | null },
  metadata: VideoMetadata,
  onProgress?: (progress: ResumableUploadProgress[]) => void
): Promise<{ videoId: string; urls: string[] }> {
  // Filter out null files and create ordered array
  const filesToUpload: { camera: number; file: File }[] = [];
  if (files.cam1) filesToUpload.push({ camera: 1, file: files.cam1 });
  if (files.cam2) filesToUpload.push({ camera: 2, file: files.cam2 });
  if (files.cam3) filesToUpload.push({ camera: 3, file: files.cam3 });

  if (filesToUpload.length === 0) {
    throw new Error('At least one camera file is required');
  }

  console.log('========================================');
  console.log('[Resumable Upload] Starting upload workflow');
  console.log(`[Resumable Upload] Total files: ${filesToUpload.length}`);
  console.log(`[Resumable Upload] Boxer 1: ${metadata.boxer1}`);
  console.log(`[Resumable Upload] Boxer 2: ${metadata.boxer2}`);
  console.log(`[Resumable Upload] Round: ${metadata.round}`);
  console.log('========================================');

  // Initialize progress tracking
  const progressState: ResumableUploadProgress[] = filesToUpload.map(({ camera, file }) => ({
    camera,
    progress: 0,
    bytesUploaded: 0,
    bytesTotal: file.size,
    status: 'pending' as const
  }));

  const updateProgress = (camera: number, update: Partial<ResumableUploadProgress>) => {
    const idx = progressState.findIndex(p => p.camera === camera);
    if (idx !== -1) {
      progressState[idx] = { ...progressState[idx], ...update };
      onProgress?.([...progressState]);
    }
  };

  // Upload files using TUS protocol (sequentially for better reliability)
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
      await uploadFileResumable(file, storagePath, (bytesUploaded, bytesTotal) => {
        const progress = Math.round((bytesUploaded / bytesTotal) * 100);
        updateProgress(camera, { progress, bytesUploaded, bytesTotal });
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

  // Finalize by creating database record
  console.log('[Resumable Upload] All files uploaded, finalizing...');
  return finalizeUpload(metadata, storagePaths);
}
