import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SupabaseStorageProvider } from '@/lib/storage/supabase-provider';
import { generatedVideoTitle, formatFightDate } from '@/lib/video-helpers';

interface FinalizeRequest {
  boxer1: string;
  boxer2: string;
  weightClass: string;
  round: number;
  fightDate: string;
  fps: number;
  storagePaths: string[];
}

/**
 * POST /api/videos/finalize
 * Create database record after successful client-side upload to Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const body: FinalizeRequest = await request.json();
    const { boxer1, boxer2, weightClass, round, fightDate, fps, storagePaths } = body;

    // Validate required fields
    if (!boxer1 || !boxer2 || !round || !fightDate || !storagePaths?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize storage provider
    const storageProvider = new SupabaseStorageProvider();

    // Verify all files exist in storage
    for (const path of storagePaths) {
      const exists = await storageProvider.exists(path);
      if (!exists) {
        return NextResponse.json(
          { error: `File not found: ${path}. Upload may have failed.` },
          { status: 400 }
        );
      }
    }

    // Check for duplicate
    const primaryStoragePath = storagePaths[0];
    const existing = await prisma.video.findUnique({
      where: { storagePath: primaryStoragePath }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Video already exists for this fight and round' },
        { status: 409 }
      );
    }

    // Get public URLs for all uploaded files
    const sourceUrls = storagePaths.map(path => storageProvider.getPublicUrl(path));

    // Create video record in database
    const video = await prisma.video.create({
      data: {
        storagePath: primaryStoragePath,
        storageProvider: 'SUPABASE',
        title: generatedVideoTitle(boxer1, boxer2, round),
        description: `${boxer1} v ${boxer2} - ${formatFightDate(new Date(fightDate))}`,
        boxer1,
        boxer2,
        weightClass,
        round,
        fightDate: new Date(fightDate),
        fps: fps || 25,
        numCameraViews: storagePaths.length,
        sourceUrls,
      }
    });

    return NextResponse.json({
      success: true,
      videoId: video.id,
      urls: sourceUrls,
      message: `Successfully created record for ${storagePaths.length} camera angle(s)`
    }, { status: 201 });

  } catch (error) {
    console.error('[Finalize Upload API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to finalize upload' },
      { status: 500 }
    );
  }
}
