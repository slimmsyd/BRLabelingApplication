/**
 * Supabase Client Upload Utility
 * 
 * Uses the official Supabase JS client for uploads which handles
 * large file uploads internally.
 */

import { createClient } from '@supabase/supabase-js';

export interface UploadProgress {
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
 * Get Supabase client with service role (needs server-side credentials)
 */
async function getSupabaseCredentials(): Promise<{ token: string; supabaseUrl: string }> {
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
 * Upload a single file using Supabase client
 */
export async function uploadFileWithClient(
  file: File,
  storagePath: string,
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void
): Promise<string> {
  const { token, supabaseUrl } = await getSupabaseCredentials();
  
  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, token, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  console.log('========================================');
  console.log('[Supabase Upload] Starting upload');
  console.log(`[Supabase Upload] File name: ${file.name}`);
  console.log(`[Supabase Upload] File type: ${file.type}`);
  console.log(`[Supabase Upload] File size: ${fileSizeMB} MB (${file.size} bytes)`);
  console.log(`[Supabase Upload] Storage path: ${storagePath}`);
  console.log(`[Supabase Upload] Using Supabase JS client upload`);
  console.log('========================================');

  // Simulate progress updates during upload
  let progressInterval: NodeJS.Timeout | null = null;
  if (onProgress) {
    let simulatedProgress = 0;
    progressInterval = setInterval(() => {
      simulatedProgress = Math.min(simulatedProgress + 5, 90);
      onProgress(Math.floor(file.size * simulatedProgress / 100), file.size);
    }, 500);
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        // 30 days. Matches the rest of the upload paths — videos are immutable.
        cacheControl: '2592000',
        upsert: true, // Allow overwriting
        contentType: file.type || 'video/mp4',
      });

    if (progressInterval) clearInterval(progressInterval);

    if (error) {
      console.error('[Supabase Upload] Error:', error);
      
      // Log error to server for debugging
      await logUploadError({
        fileName: file.name,
        fileSize: file.size,
        fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
        errorMessage: error.message,
        errorCode: (error as any).statusCode || (error as any).status || 'unknown',
        uploadMethod: 'supabase-client',
        storagePath
      });
      
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    console.log('[Supabase Upload] Upload complete!');
    console.log(`[Supabase Upload] Path: ${data.path}`);
    onProgress?.(file.size, file.size);
    
    return storagePath;
  } catch (err) {
    if (progressInterval) clearInterval(progressInterval);
    
    // Log error to server if not already logged
    const errorMessage = err instanceof Error ? err.message : 'Upload failed';
    if (!errorMessage.includes('Supabase upload failed')) {
      await logUploadError({
        fileName: file.name,
        fileSize: file.size,
        fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
        errorMessage,
        errorCode: 'unknown',
        uploadMethod: 'supabase-client',
        storagePath
      });
    }
    
    throw err;
  }
}

/**
 * Log upload errors to server for debugging
 */
async function logUploadError(errorInfo: {
  fileName: string;
  fileSize: number;
  fileSizeMB: string;
  errorMessage: string;
  errorCode: string | number;
  uploadMethod: string;
  storagePath: string;
}): Promise<void> {
  try {
    await fetch('/api/videos/log-upload-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorInfo)
    });
  } catch (e) {
    console.error('[Supabase Upload] Failed to log error to server:', e);
  }
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
 * Complete upload workflow using Supabase client:
 * 1. Upload files using Supabase JS client
 * 2. Finalize by creating database record
 */
export async function uploadVideosWithClient(
  files: { cam1: File | null; cam2: File | null; cam3: File | null },
  metadata: VideoMetadata,
  onProgress?: (progress: UploadProgress[]) => void
): Promise<{ videoId: string; urls: string[] }> {
  const filesToUpload: { camera: number; file: File }[] = [];
  if (files.cam1) filesToUpload.push({ camera: 1, file: files.cam1 });
  if (files.cam2) filesToUpload.push({ camera: 2, file: files.cam2 });
  if (files.cam3) filesToUpload.push({ camera: 3, file: files.cam3 });

  if (filesToUpload.length === 0) {
    throw new Error('At least one camera file is required');
  }

  console.log('========================================');
  console.log('[Supabase Upload] Starting upload workflow');
  console.log(`[Supabase Upload] Total files: ${filesToUpload.length}`);
  console.log(`[Supabase Upload] Boxer 1: ${metadata.boxer1}`);
  console.log(`[Supabase Upload] Boxer 2: ${metadata.boxer2}`);
  console.log(`[Supabase Upload] Round: ${metadata.round}`);
  console.log('========================================');

  // Initialize progress tracking
  const progressState: UploadProgress[] = filesToUpload.map(({ camera, file }) => ({
    camera,
    progress: 0,
    bytesUploaded: 0,
    bytesTotal: file.size,
    status: 'pending' as const
  }));

  const updateProgress = (camera: number, update: Partial<UploadProgress>) => {
    const idx = progressState.findIndex(p => p.camera === camera);
    if (idx !== -1) {
      progressState[idx] = { ...progressState[idx], ...update };
      onProgress?.([...progressState]);
    }
  };

  // Upload files sequentially
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
      await uploadFileWithClient(file, storagePath, (bytesUploaded, bytesTotal) => {
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

  console.log('[Supabase Upload] All files uploaded, finalizing...');
  return finalizeUpload(metadata, storagePaths);
}
