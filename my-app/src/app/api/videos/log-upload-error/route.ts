import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/videos/log-upload-error
 * Log upload errors from the client for debugging
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      fileName, 
      fileSize, 
      fileSizeMB, 
      errorMessage, 
      errorCode,
      uploadMethod,
      storagePath 
    } = body;

    console.log('========================================');
    console.log('[Upload Error] ❌ UPLOAD FAILED');
    console.log('========================================');
    console.log(`[Upload Error] File name: ${fileName}`);
    console.log(`[Upload Error] File size: ${fileSizeMB} MB (${fileSize} bytes)`);
    console.log(`[Upload Error] Storage path: ${storagePath}`);
    console.log(`[Upload Error] Upload method: ${uploadMethod}`);
    console.log(`[Upload Error] Error code: ${errorCode}`);
    console.log(`[Upload Error] Error message: ${errorMessage}`);
    console.log('----------------------------------------');
    
    // Check if it's a size-related error
    if (errorCode === 413 || errorMessage?.includes('too large') || errorMessage?.includes('Content Too Large')) {
      console.log('[Upload Error] ⚠️  SIZE LIMIT EXCEEDED');
      console.log(`[Upload Error] The file (${fileSizeMB} MB) exceeded the allowed size limit.`);
      console.log('[Upload Error] Check Supabase Dashboard > Storage > fight-videos > Settings > file_size_limit');
      console.log('[Upload Error] Current bucket limit should be 5GB (5368709120 bytes)');
      
      if (fileSize > 5368709120) {
        console.log('[Upload Error] ⛔ File exceeds 5GB Pro plan limit!');
      } else if (fileSize > 52428800) {
        console.log('[Upload Error] ⚠️  File exceeds 50MB (default bucket limit). Bucket limit may not be updated.');
      }
    }
    
    console.log('========================================');

    return NextResponse.json({ 
      logged: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Upload Error API] Failed to log error:', error);
    return NextResponse.json({ logged: false }, { status: 500 });
  }
}
