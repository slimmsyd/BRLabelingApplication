import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'https://www.huemanapi.com';

/**
 * GET /api/external/fights
 * Proxy to DEV API to get list of all fights
 */
export async function GET() {
  try {
    console.log('🔍 Proxying GET /fights to DEV API...');
    
    const response = await fetch(`${EXTERNAL_API_URL}/fights`, {
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
        { error: 'Failed to fetch fights from DEV API', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Fights from DEV API:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying to DEV API:', error);
    return NextResponse.json(
      { error: 'Failed to connect to DEV API', details: String(error) },
      { status: 500 }
    );
  }
}
