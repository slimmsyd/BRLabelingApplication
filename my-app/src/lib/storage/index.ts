import { StorageProvider } from './types';
import { SupabaseStorageProvider } from './supabase-provider';
import { S3StorageProvider } from './s3-provider';

// Singleton instance
let storageProvider: StorageProvider | null = null;

/**
 * Get the active storage provider based on environment configuration
 * Defaults to Supabase, can switch to S3 via STORAGE_PROVIDER env var
 * 
 * @returns Configured storage provider instance
 */
export function getStorageProvider(): StorageProvider {
  if (storageProvider) return storageProvider;
  
  const provider = process.env.STORAGE_PROVIDER || 'supabase';
  
  switch (provider.toLowerCase()) {
    case 'supabase':
      console.log('[Storage] Initializing Supabase Storage provider');
      storageProvider = new SupabaseStorageProvider();
      break;
    case 's3':
      console.log('[Storage] Initializing S3 Storage provider');
      storageProvider = new S3StorageProvider();
      break;
    default:
      throw new Error(`Unknown storage provider: ${provider}. Valid options: 'supabase', 's3'`);
  }
  
  return storageProvider;
}

/**
 * Reset the storage provider instance (useful for testing)
 */
export function resetStorageProvider(): void {
  storageProvider = null;
}

// Re-export types and providers for convenience
export * from './types';
export { SupabaseStorageProvider } from './supabase-provider';
export { S3StorageProvider } from './s3-provider';
