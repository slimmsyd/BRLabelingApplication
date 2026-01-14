import { NextResponse } from 'next/server';
import * as fs from 'fs';

const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'https://www.huemanapi.com';
const DEBUG_LOG_PATH = '/Users/sydneysanders/Desktop/Code_Projects/LabelingApp/.cursor/debug.log';

// Helper to write debug logs (server-side)
function debugLog(location: string, message: string, data: Record<string, unknown>, hypothesisId: string) {
  try {
    const logEntry = JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      hypothesisId,
    });
    fs.appendFileSync(DEBUG_LOG_PATH, logEntry + '\n');
  } catch (e) {
    console.error('Failed to write debug log:', e);
  }
}

/**
 * GET /api/external/fights/[title]
 * Proxy to DEV API to get specific fight data
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ title: string }> }
) {
  try {
    const { title } = await params;
    console.log('🔍 Proxying GET /fight/' + title + ' to DEV API...');
    
    const response = await fetch(`${EXTERNAL_API_URL}/fight/${title}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('🔍 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DEV API Error:', response.status, errorText);
      return NextResponse.json(
        { error: `Fight '${title}' not found`, status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Fight data from DEV API:', title);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying to DEV API:', error);
    return NextResponse.json(
      { error: 'Failed to connect to DEV API', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/external/fights/[title]
 * Proxy QC updates to DEV API
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ title: string }> }
) {
  try {
    const { title } = await params;
    const body = await request.json();
    
    const targetUrl = `${EXTERNAL_API_URL}/fight/${encodeURIComponent(title)}`;
    
    // #region agent log - Server-side PUT attempt
    debugLog('fights/[title]/route.ts:PUT', 'Server-side PUT to external API', {
      title,
      targetUrl,
      EXTERNAL_API_URL,
      payloadKeys: Object.keys(body),
      isQCReview: body.isQCReview,
    }, 'F');
    // #endregion
    
    console.log('📤 [SERVER] Proxying PUT /fight/' + title + ' to DEV API...');
    console.log('📤 [SERVER] Target URL:', targetUrl);
    console.log('📤 [SERVER] EXTERNAL_API_URL env:', EXTERNAL_API_URL);
    
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('📡 [SERVER] Response status:', response.status, response.statusText);
    console.log('📡 [SERVER] Response body:', responseText.substring(0, 500));
    
    // #region agent log - Server-side PUT response
    debugLog('fights/[title]/route.ts:PUT:response', 'External API response received (server-side)', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      responsePreview: responseText.substring(0, 200),
    }, 'F');
    // #endregion
    
    if (!response.ok) {
      console.error('❌ [SERVER] DEV API Error:', response.status, responseText);
      return NextResponse.json(
        { error: `Failed to update fight '${title}'`, status: response.status, details: responseText },
        { status: response.status }
      );
    }

    // Try to parse as JSON, fallback to text
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }
    
    console.log('✅ [SERVER] QC update sent to DEV API:', title);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ [SERVER] Error proxying PUT to DEV API:', error);
    // #region agent log - Server-side PUT error
    debugLog('fights/[title]/route.ts:PUT:error', 'Server-side PUT FAILED', {
      error: error instanceof Error ? error.message : String(error),
    }, 'F');
    // #endregion
    return NextResponse.json(
      { error: 'Failed to connect to DEV API', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/external/fights/[title]
 * Proxy new round submissions to DEV API
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ title: string }> }
) {
  try {
    const { title } = await params;
    const body = await request.json();
    
    // For POST, we typically post to /boxing_fight (not /fight/title)
    // But we'll keep this endpoint flexible
    const targetUrl = `${EXTERNAL_API_URL}/boxing_fight`;
    
    // #region agent log - Server-side POST attempt
    debugLog('fights/[title]/route.ts:POST', 'Server-side POST to external API', {
      title,
      targetUrl,
      EXTERNAL_API_URL,
      payloadKeys: Object.keys(body),
    }, 'F');
    // #endregion
    
    console.log('📤 [SERVER] Proxying POST to DEV API...');
    console.log('📤 [SERVER] Target URL:', targetUrl);
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('📡 [SERVER] Response status:', response.status, response.statusText);
    
    // #region agent log - Server-side POST response
    debugLog('fights/[title]/route.ts:POST:response', 'External API response received (server-side)', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    }, 'F');
    // #endregion
    
    if (!response.ok) {
      console.error('❌ [SERVER] DEV API Error:', response.status, responseText);
      return NextResponse.json(
        { error: 'Failed to submit to DEV API', status: response.status, details: responseText },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }
    
    console.log('✅ [SERVER] Submission sent to DEV API');
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('❌ [SERVER] Error proxying POST to DEV API:', error);
    return NextResponse.json(
      { error: 'Failed to connect to DEV API', details: String(error) },
      { status: 500 }
    );
  }
}
