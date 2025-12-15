import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'https://www.huemanapi.com';

/**
 * GET /api/external/fights/[title]/rounds
 * Proxy to DEV API to get list of rounds for a fight
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ title: string }> }
) {
  try {
    const { title } = await params;
    console.log('🔍 Proxying GET /fight/' + title + '/rounds to DEV API...');
    
    const response = await fetch(`${EXTERNAL_API_URL}/fight/${title}/rounds`, {
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
    console.log('✅ Rounds from DEV API:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying to DEV API:', error);
    return NextResponse.json(
      { error: 'Failed to connect to DEV API', details: String(error) },
      { status: 500 }
    );
  }
}
