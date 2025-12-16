import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/videos/bucket-info
 * Get bucket configuration including file_size_limit using Storage API
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 });
    }

    // Use the Storage API directly to get bucket info
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket/fight-videos`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Bucket Info] Storage API error:', errText);
      return NextResponse.json({ 
        error: 'Could not fetch bucket info via API',
        details: errText
      }, { status: 500 });
    }

    const bucketData = await response.json();
    const limitBytes = bucketData.file_size_limit || 0;
    const limitMB = (limitBytes / 1024 / 1024).toFixed(2);
    const limitGB = (limitBytes / 1024 / 1024 / 1024).toFixed(3);

    console.log('========================================');
    console.log('[Bucket Info] fight-videos bucket configuration:');
    console.log(`[Bucket Info] file_size_limit: ${limitBytes} bytes`);
    console.log(`[Bucket Info] file_size_limit: ${limitMB} MB`);
    console.log(`[Bucket Info] file_size_limit: ${limitGB} GB`);
    console.log(`[Bucket Info] public: ${bucketData.public}`);
    console.log('========================================');

    return NextResponse.json({
      bucket: 'fight-videos',
      file_size_limit_bytes: limitBytes,
      file_size_limit_mb: parseFloat(limitMB),
      file_size_limit_gb: parseFloat(limitGB),
      public: bucketData.public,
      allowed_mime_types: bucketData.allowed_mime_types,
      raw: bucketData
    });

  } catch (error) {
    console.error('[Bucket Info] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to get bucket info' 
    }, { status: 500 });
  }
}
