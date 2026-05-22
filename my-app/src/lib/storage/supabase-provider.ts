import { createClient } from '@supabase/supabase-js';
import { StorageProvider, VideoUploadOptions, VideoUploadResult } from './types';

/**
 * Supabase Storage implementation of StorageProvider
 * Handles video uploads to Supabase Storage buckets
 */
export class SupabaseStorageProvider implements StorageProvider {
  private client;
  private bucketName = 'fight-videos';
  
  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
    
    this.client = createClient(supabaseUrl, supabaseKey);
  }
  
  async upload(options: VideoUploadOptions): Promise<VideoUploadResult> {
    const { file, path, onProgress } = options;
    
    // Upload with progress tracking
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .upload(path, file, {
        // 30 days. Videos are immutable once uploaded, so a long TTL is safe
        // and cuts repeat-egress dramatically (was '3600' = 1h, causing hourly re-downloads).
        cacheControl: '2592000',
        upsert: false, // Prevent overwriting existing files
      });
    
    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }
    
    // Simulate progress callback for now (Supabase client doesn't support onProgress in browser yet)
    onProgress?.(100);
    
    return {
      url: this.getPublicUrl(path),
      storagePath: path,
      provider: 'supabase'
    };
  }
  
  async delete(path: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucketName)
      .remove([path]);
      
    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
  }
  
  getPublicUrl(path: string): string {
    const { data } = this.client.storage
      .from(this.bucketName)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }
  
  async exists(path: string): Promise<boolean> {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .list(path.split('/').slice(0, -1).join('/'));
      
      if (error) return false;
      
      const fileName = path.split('/').pop();
      return data?.some(file => file.name === fileName) ?? false;
    } catch {
      return false;
    }
  }
  
  async getSignedUrl(path: string, expiresIn: number): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .createSignedUrl(path, expiresIn);
      
    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }
    
    return data.signedUrl;
  }
  
  /**
   * Generate a signed URL for uploading a file directly from the client
   * This bypasses serverless function size limits
   * @param path - Storage path for the file
   * @param expiresIn - Expiration time in seconds (default 10 minutes)
   * @returns Signed upload URL
   */
  async getSignedUploadUrl(path: string, expiresIn: number = 600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .createSignedUploadUrl(path);
      
    if (error) {
      throw new Error(`Failed to create signed upload URL: ${error.message}`);
    }
    
    return data.signedUrl;
  }
}
