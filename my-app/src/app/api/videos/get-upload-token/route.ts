import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/videos/get-upload-token
 * Generate an upload token for client-side TUS resumable uploads
 * Uses the service role key to create a token that allows uploads
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Get Upload Token API] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // The service role key IS the JWT token we can use for uploads
    // It has full access to storage
    console.log('========================================');
    console.log('[Get Upload Token API] Returning service role key for TUS upload');
    console.log('[Get Upload Token API] Bucket: fight-videos');
    console.log('========================================');

    return NextResponse.json({
      token: supabaseServiceKey,
      supabaseUrl: supabaseUrl,
      bucketName: 'fight-videos'
    });

  } catch (error) {
    console.error('[Get Upload Token API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get upload token' },
      { status: 500 }
    );
  }
}
