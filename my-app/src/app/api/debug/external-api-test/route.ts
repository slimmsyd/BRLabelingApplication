import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'https://www.huemanapi.com';
const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || '';

export async function GET() {
  console.log('\n🧪 [EXTERNAL API TEST] ========================');
  console.log('🕐 Timestamp:', new Date().toISOString());
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    config: {
      EXTERNAL_API_URL,
      hasApiKey: !!EXTERNAL_API_KEY,
      apiKeyLength: EXTERNAL_API_KEY?.length || 0,
    },
    tests: [] as any[],
  };

  // Test 1: Check if URL is reachable
  try {
    console.log('🧪 Test 1: Fetching from', `${EXTERNAL_API_URL}/accounts`);
    const startTime = performance.now();
    
    const response = await fetch(`${EXTERNAL_API_URL}/accounts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(EXTERNAL_API_KEY && { 'Authorization': `Bearer ${EXTERNAL_API_KEY}` }),
      },
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log('📊 Response status:', response.status);
    console.log('⏱️  Request took:', duration.toFixed(2), 'ms');

    if (response.ok) {
      const data = await response.json();
      const accounts = Array.isArray(data) ? data : data.accounts;
      
      console.log('✅ Successfully fetched accounts');
      console.log('📊 Total accounts:', accounts?.length || 0);
      
      if (accounts && Array.isArray(accounts)) {
        console.log('📋 Accounts found:');
        accounts.forEach((acc: any, i: number) => {
          console.log(`   ${i + 1}. ${acc.email} (${acc.username}) - ${acc.accountType}`);
        });
      }

      diagnostics.tests.push({
        name: 'Fetch Accounts',
        status: 'SUCCESS',
        responseStatus: response.status,
        duration: `${duration.toFixed(2)}ms`,
        accountCount: accounts?.length || 0,
        accounts: accounts?.map((acc: any) => ({
          email: acc.email,
          username: acc.username,
          accountType: acc.accountType,
          hasPermissions: !!acc.permissions,
          permissions: acc.permissions,
        })),
      });
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to fetch accounts');
      console.error('❌ Status:', response.status);
      console.error('❌ Error:', errorText);

      diagnostics.tests.push({
        name: 'Fetch Accounts',
        status: 'FAILED',
        responseStatus: response.status,
        error: errorText,
        duration: `${duration.toFixed(2)}ms`,
      });
    }
  } catch (error) {
    console.error('❌ Exception during fetch:', error);
    diagnostics.tests.push({
      name: 'Fetch Accounts',
      status: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Check specific emails
  const testEmails = [
    'syd@boxraw.com',
    'dan@boxraw.com', // Add Dan's email
    'olly@boxraw.com', // Add Olly's email
  ];

  console.log('\n🧪 Test 2: Checking specific emails...');
  for (const email of testEmails) {
    try {
      console.log(`🔍 Looking for: ${email}`);
      const { getExternalAccountByEmail } = await import('@/lib/external-api');
      const account = await getExternalAccountByEmail(email);
      
      if (account) {
        console.log(`✅ Found: ${email}`);
        diagnostics.tests.push({
          name: `Check Email: ${email}`,
          status: 'FOUND',
          account: {
            username: account.username,
            accountType: account.accountType,
            permissions: account.permissions,
          },
        });
      } else {
        console.log(`❌ Not found: ${email}`);
        diagnostics.tests.push({
          name: `Check Email: ${email}`,
          status: 'NOT_FOUND',
        });
      }
    } catch (error) {
      console.error(`❌ Error checking ${email}:`, error);
      diagnostics.tests.push({
        name: `Check Email: ${email}`,
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Test 3: Check fight endpoint availability
  try {
    console.log('\n🧪 Test 3: Checking fight endpoint...');
    const fightTestUrl = `${EXTERNAL_API_URL}/fight/test`;
    const startTime = performance.now();

    const response = await fetch(fightTestUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const endTime = performance.now();
    const responseText = await response.text();

    diagnostics.tests.push({
      name: 'Fight Endpoint Reachable',
      status: response.ok ? 'SUCCESS' : 'REACHABLE_BUT_ERROR',
      responseStatus: response.status,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      body: responseText.substring(0, 300),
    });
  } catch (error) {
    diagnostics.tests.push({
      name: 'Fight Endpoint Reachable',
      status: 'UNREACHABLE',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  console.log('🧪 [EXTERNAL API TEST] ========================\n');

  return NextResponse.json(diagnostics, { status: 200 });
}

/**
 * POST /api/debug/external-api-test
 * Simulates a fight submission to diagnose why the external API is failing.
 * Read-only: only does GET requests against the external API.
 *
 * Body: { "fightTitle": "Abdullah Mason v Sam Noakes - R3" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fightTitle = body.fightTitle || 'Test Fight';

    const diagnostics = {
      timestamp: new Date().toISOString(),
      fightTitle,
      externalApiUrl: EXTERNAL_API_URL,
      tests: [] as any[],
    };

    // Test 1: Can we reach the external API at all?
    try {
      const startTime = performance.now();
      const response = await fetch(`${EXTERNAL_API_URL}/accounts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const endTime = performance.now();

      diagnostics.tests.push({
        name: 'API Reachable (/accounts)',
        status: response.ok ? 'UP' : 'ERROR',
        responseStatus: response.status,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
      });
    } catch (error) {
      diagnostics.tests.push({
        name: 'API Reachable (/accounts)',
        status: 'DOWN',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 2: Does this fight exist? (GET /fight/{title})
    try {
      const encodedTitle = encodeURIComponent(fightTitle);
      const fightUrl = `${EXTERNAL_API_URL}/fight/${encodedTitle}`;
      const startTime = performance.now();

      const response = await fetch(fightUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const endTime = performance.now();
      const responseText = await response.text();

      diagnostics.tests.push({
        name: `Fight Exists (GET /fight/${fightTitle})`,
        status: response.ok ? 'EXISTS' : 'NOT_FOUND',
        responseStatus: response.status,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        responseBody: responseText.substring(0, 500),
      });
    } catch (error) {
      diagnostics.tests.push({
        name: `Fight Exists (GET /fight/${fightTitle})`,
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 3: Check POST endpoint (GET /boxing_fight to see if endpoint exists)
    try {
      const startTime = performance.now();
      const response = await fetch(`${EXTERNAL_API_URL}/boxing_fight`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const endTime = performance.now();
      const responseText = await response.text();

      diagnostics.tests.push({
        name: 'Boxing Fight Endpoint (GET /boxing_fight)',
        status: response.ok ? 'AVAILABLE' : 'RETURNED_ERROR',
        responseStatus: response.status,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        responseBody: responseText.substring(0, 500),
      });
    } catch (error) {
      diagnostics.tests.push({
        name: 'Boxing Fight Endpoint (GET /boxing_fight)',
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Summary
    const allUp = diagnostics.tests.every(t => !['DOWN', 'UNREACHABLE'].includes(t.status));
    diagnostics.tests.push({
      name: 'SUMMARY',
      externalApiStatus: allUp ? 'REACHABLE' : 'CONNECTIVITY_ISSUE',
      message: allUp
        ? 'External API is reachable. If submissions still fail, the issue is likely payload format or the specific endpoint rejecting data.'
        : 'External API has connectivity issues. This is on their (huemanapi.com) end.',
    });

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

