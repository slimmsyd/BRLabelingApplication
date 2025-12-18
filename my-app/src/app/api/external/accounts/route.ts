import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'https://www.huemanapi.com';

export async function GET() {
  try {
    console.log('🔍 DEBUG: Proxying GET /accounts to DEV API...');
    console.log('🔍 DEBUG: URL:', `${EXTERNAL_API_URL}/accounts`);
    
    const response = await fetch(`${EXTERNAL_API_URL}/accounts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('🔍 DEBUG: Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DEV API Error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch from DEV API', status: response.status, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ DEBUG: Accounts from DEV API:', JSON.stringify(data, null, 2));
    
    // Log each account individually
    console.log('\n📋 === ALL ACCOUNTS ===');
    if (Array.isArray(data)) {
      data.forEach((account: Record<string, unknown>, index: number) => {
        console.log(`\n🔹 Account ${index + 1}:`, JSON.stringify(account, null, 2));
      });
      console.log(`\n📊 Total accounts: ${data.length}`);
    } else if (data.accounts && Array.isArray(data.accounts)) {
      data.accounts.forEach((account: Record<string, unknown>, index: number) => {
        console.log(`\n🔹 Account ${index + 1}:`, JSON.stringify(account, null, 2));
      });
      console.log(`\n📊 Total accounts: ${data.accounts.length}`);
    } else {
      console.log('⚠️ Unexpected data format:', typeof data);
    }
    console.log('======================\n');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying to DEV API:', error);
    return NextResponse.json(
      { error: 'Failed to connect to DEV API', details: String(error) },
      { status: 500 }
    );
  }
}
