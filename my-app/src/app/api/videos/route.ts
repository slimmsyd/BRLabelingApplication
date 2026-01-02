import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';

// #region agent log helper
const debugLog = (location: string, message: string, data: any, hypothesisId: string) => {
  const logEntry = JSON.stringify({location,message,data,timestamp:Date.now(),sessionId:'debug-session',hypothesisId}) + '\n';
  try { fs.appendFileSync('/Users/sydneysanders/Desktop/Code_Projects/LabelingApp/.cursor/debug.log', logEntry); } catch(e) {}
};
// #endregion

/**
 * GET /api/videos
 * Fetches all videos from the database
 */
export async function GET() {
  try {
    console.log('[Videos API] Fetching all videos with assignments...');
    
    const videos = await prisma.video.findMany({
      orderBy: {
        createdAt: 'desc', // Newest first
      },
      select: {
        id: true,
        title: true,
        boxer1: true,
        boxer2: true,
        round: true,
        fightDate: true,
        fps: true,
        numCameraViews: true,
        sourceUrls: true,
        // storagePath: true,
        // storageProvider: true,
        createdAt: true,
        updatedAt: true,
        assignments: {
          where: { 
            labelType: 'OFFENSE',
            // Exclude COMPLETED assignments to hide from landing page
            status: { notIn: ['COMPLETED'] }
          },
          orderBy: {
            assignedAt: 'desc'
          },
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                username: true,
                email: true,
              },
            },
            status: true,
            assignedAt: true,
          },
        },
      },
    });

    // #region agent log
    const assignedVideos = videos.filter(v => v.assignments.length > 0);
    const unassignedVideos = videos.filter(v => v.assignments.length === 0);
    console.log('[Videos API] Summary:', {
      total: videos.length,
      assigned: assignedVideos.length,
      unassigned: unassignedVideos.length
    });
    
    // Log each video's assignment status for debugging
    videos.forEach(v => {
      console.log(`[Videos API] Video "${v.title}": ${v.assignments.length > 0 ? `ASSIGNED to ${v.assignments[0].user.email} (${v.assignments[0].status})` : 'UNASSIGNED'}`);
    });
    
    debugLog('videos/route.ts:GET', 'Returning videos', { totalCount: videos.length, assignedCount: assignedVideos.length, unassignedCount: unassignedVideos.length, assignedVideoIds: assignedVideos.map(v => ({ id: v.id, title: v.title, status: v.assignments[0]?.status, assignedTo: v.assignments[0]?.user.email })) }, 'REFRESH');
    // #endregion

    return NextResponse.json({ videos }, { status: 200 });
  } catch (error) {
    console.error('[Videos API] Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
