import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'https://www.huemanapi.com';

/**
 * GET /api/external/fights
 * Proxy to DEV API to get list of all fights
 */
export async function GET() {
  const targetUrl = `${EXTERNAL_API_URL}/fights`;
  try {
    console.log('🔍 Proxying GET to:', targetUrl);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const contentType = response.headers.get('content-type') ?? '';
    const contentLength = response.headers.get('content-length') ?? 'unknown';
    console.log('🔍 Upstream response:', {
      finalUrl: response.url,
      status: response.status,
      statusText: response.statusText,
      contentType,
      contentLength,
    });

    const bodyText = await response.text();
    const looksLikeHtml = /^\s*<(!doctype|html)/i.test(bodyText);

    if (!response.ok) {
      console.error('❌ DEV API Error:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        looksLikeHtml,
        bodySnippet: bodyText.slice(0, 500),
      });
      return NextResponse.json(
        { error: 'Failed to fetch fights from DEV API', status: response.status },
        { status: response.status }
      );
    }

    if (looksLikeHtml || !contentType.includes('application/json')) {
      console.error('❌ Upstream returned non-JSON / error response:', {
        finalUrl: response.url,
        status: response.status,
        contentType,
        looksLikeHtml,
        bodySnippet: bodyText.slice(0, 500),
      });
      return NextResponse.json(
        { error: 'Failed to connect to DEV API', details: 'Upstream returned non-JSON response' },
        { status: 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (err) {
      console.error('❌ JSON parse failed despite JSON content-type:', {
        error: String(err),
        bodySnippet: bodyText.slice(0, 500),
      });
      return NextResponse.json(
        { error: 'Failed to connect to DEV API', details: String(err) },
        { status: 500 }
      );
    }

    console.log('✅ Fights from DEV API:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying to DEV API:', { targetUrl, error: String(error) });
    return NextResponse.json(
      { error: 'Failed to connect to DEV API', details: String(error) },
      { status: 500 }
    );
  }
}
