export interface VideoUploadOptions {
  file: File;
  path: string;
  onProgress?: (progress: number) => void;
}

export interface VideoUploadResult {
  url: string;           // Public URL to access the video
  storagePath: string;   // Internal storage path/key
  provider: 'supabase' | 's3' | 'hybrid';
}

export interface StorageProvider {
  /**
   * Upload a video file to storage
   * @param options - Upload configuration including file, path, and progress callback
   * @returns Upload result with public URL and storage path
   */
  upload(options: VideoUploadOptions): Promise<VideoUploadResult>;
  
  /**
   * Delete a video file from storage
   * @param path - Storage path of the video to delete
   */
  delete(path: string): Promise<void>;
  
  /**
   * Get the public URL for a stored video
   * @param path - Storage path of the video
   * @returns Public URL that can be used in video players
   */
  getPublicUrl(path: string): string;
  
  /**
   * Check if a file exists in storage
   * @param path - Storage path to check
   * @returns True if file exists, false otherwise
   */
  exists(path: string): Promise<boolean>;
  
  /**
   * Generate a pre-signed/temporary URL for private video access
   * @param path - Storage path of the video
   * @param expiresIn - Expiration time in seconds
   * @returns Temporary signed URL
   */
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
}
