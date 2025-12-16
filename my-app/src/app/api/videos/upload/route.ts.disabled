import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { generateStoragePath, validateVideoFile, generatedVideoTitle, formatFightDate } from '@/lib/video-helpers';

// Route segment config - allow larger file uploads (Vercel default is 4.5MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
};

// For App Router - increase max duration for large uploads
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/videos/upload
 * Upload multi-camera fight videos to storage and create database records
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check when NextAuth is set up
    // const session = await getServerSession();
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Parse form data
    const formData = await request.formData();
    
    // Extract metadata
    const boxer1 = formData.get('boxer1') as string;
    const boxer2 = formData.get('boxer2') as string;
    const weightClass = formData.get('weightClass') as string;
    const round = parseInt(formData.get('round') as string);
    const fightDate = new Date(formData.get('fightDate') as string);
    const fps = parseInt(formData.get('fps') as string) || 25;
    
    // Validate required fields
    if (!boxer1 || !boxer2 || !round || !fightDate) {
      return NextResponse.json(
        { error: 'Missing required fields: boxer1, boxer2, round, fightDate' },
        { status: 400 }
      );
    }

    // Extract video files
    const cam1 = formData.get('cam1') as File | null;
    const cam2 = formData.get('cam2') as File | null;
    const cam3 = formData.get('cam3') as File | null;

    if (!cam1) {
      return NextResponse.json(
        { error: 'At least Camera 1 video is required' },
        { status: 400 }
      );
    }

    // Validate all uploaded files
    const files = [cam1, cam2, cam3].filter(Boolean) as File[];
    for (const file of files) {
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Get storage provider
    const storageProvider = getStorageProvider();
    
    // Upload videos
    const uploadPromises = files.map((file, index) => {
      const camNum = index + 1;
      const storagePath = generateStoragePath(boxer1, boxer2, round, camNum);
      
      return storageProvider.upload({
        file,
        path: storagePath,
        onProgress: (progress) => {
          console.log(`[Upload] Camera ${camNum}: ${progress}%`);
        }
      });
    });

    const uploadResults = await Promise.all(uploadPromises);
    
    // Check for duplicate storage path
    const primaryStoragePath = uploadResults[0].storagePath;
    const existing = await prisma.video.findUnique({
      where: { storagePath: primaryStoragePath }
    });

    if (existing) {
      // Rollback uploads
      await Promise.all(
        uploadResults.map(result => storageProvider.delete(result.storagePath))
      );
      
      return NextResponse.json(
        { error: 'Video already exists for this fight and round' },
        { status: 409 }
      );
    }

    // Create video record in database
    const video = await prisma.video.create({
      data: {
        storagePath: primaryStoragePath,
        storageProvider: uploadResults[0].provider.toUpperCase() as 'SUPABASE' | 'S3',
        title: generatedVideoTitle(boxer1, boxer2, round),
        description: `${boxer1} v ${boxer2} - ${formatFightDate(fightDate)}`,
        boxer1,
        boxer2,
        weightClass,
        round,
        fightDate,
        fps,
        numCameraViews: files.length,
        sourceUrls: uploadResults.map(r => r.url),
        // uploadedBy: session.user.id, // TODO: Add when auth is set up
      }
    });

    return NextResponse.json({
      success: true,
      videoId: video.id,
      urls: uploadResults.map(r => r.url),
      message: `Successfully uploaded ${files.length} camera angle(s)`
    }, { status: 201 });

  } catch (error) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
