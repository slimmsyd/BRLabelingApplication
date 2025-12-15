import { NextRequest, NextResponse } from 'next/server';
import { SupabaseStorageProvider } from '@/lib/storage/supabase-provider';
import { generateStoragePath } from '@/lib/video-helpers';

interface SignedUrlRequest {
  boxer1: string;
  boxer2: string;
  round: number;
  numCameras: number;
}

/**
 * POST /api/videos/get-upload-urls
 * Generate signed upload URLs for client-side direct uploads to Supabase
 * This bypasses Vercel's 4.5MB body size limit
 */
export async function POST(request: NextRequest) {
  try {
    const body: SignedUrlRequest = await request.json();
    const { boxer1, boxer2, round, numCameras } = body;

    // Validate required fields
    if (!boxer1 || !boxer2 || !round || !numCameras) {
      return NextResponse.json(
        { error: 'Missing required fields: boxer1, boxer2, round, numCameras' },
        { status: 400 }
      );
    }

    if (numCameras < 1 || numCameras > 3) {
      return NextResponse.json(
        { error: 'numCameras must be between 1 and 3' },
        { status: 400 }
      );
    }

    // Initialize storage provider
    const storageProvider = new SupabaseStorageProvider();

    // Generate signed upload URLs for each camera
    const uploadUrls: { camera: number; signedUrl: string; storagePath: string }[] = [];

    for (let cam = 1; cam <= numCameras; cam++) {
      const storagePath = generateStoragePath(boxer1, boxer2, round, cam);
      const signedUrl = await storageProvider.getSignedUploadUrl(storagePath);

      uploadUrls.push({
        camera: cam,
        signedUrl,
        storagePath
      });
    }

    return NextResponse.json({
      success: true,
      uploadUrls,
      expiresIn: 600 // 10 minutes
    });

  } catch (error) {
    console.error('[Get Upload URLs API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate upload URLs' },
      { status: 500 }
    );
  }
}
