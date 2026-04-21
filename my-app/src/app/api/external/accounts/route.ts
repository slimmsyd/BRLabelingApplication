import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'https://www.huemanapi.com';

export async function GET(request: Request) {
  try {
    console.log('\n🔐 [ACCOUNTS API DEBUG] ===========================');
    console.log('📡 GET /api/external/accounts called');
    console.log('🕐 Timestamp:', new Date().toISOString());
    
    // Get session to log who is accessing
    const { getSession } = await import('@/lib/session');
    const session = await getSession();
    
    if (session) {
      console.log('👤 Requested by user:', session.email);
      console.log('🔑 User ID:', session.userId);
    } else {
      console.log('⚠️  No session found - unauthenticated request');
    }
    
    console.log('🔍 Proxying to DEV API...');
    console.log('🌐 URL:', `${EXTERNAL_API_URL}/accounts`);
    
    const response = await fetch(`${EXTERNAL_API_URL}/accounts`, {
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
      console.error('\n❌❌❌ EXTERNAL API ERROR ❌❌❌');
      console.error('🌐 URL Attempted:', `${EXTERNAL_API_URL}/accounts`);
      console.error('🌐 Final URL (after redirects):', response.url);
      console.error('📊 Status Code:', response.status);
      console.error('📊 Status Text:', response.statusText);
      console.error('📄 Response Headers:', Object.fromEntries(response.headers.entries()));
      console.error('📄 Looks like HTML:', looksLikeHtml);
      console.error('📄 Error Body:', bodyText.substring(0, 500));
      console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n');
      console.log('🔐 [ACCOUNTS API DEBUG] ===========================\n');

      return NextResponse.json(
        {
          error: 'Failed to fetch from DEV API',
          status: response.status,
          statusText: response.statusText,
          url: `${EXTERNAL_API_URL}/accounts`,
          details: bodyText.substring(0, 500),
          suggestion: 'The external API endpoint may not be available. Please check EXTERNAL_API_URL environment variable.'
        },
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
      console.log('🔐 [ACCOUNTS API DEBUG] ===========================\n');
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
      console.log('🔐 [ACCOUNTS API DEBUG] ===========================\n');
      return NextResponse.json(
        { error: 'Failed to connect to DEV API', details: String(err) },
        { status: 500 }
      );
    }
    console.log('✅ Successfully fetched accounts from DEV API');
    
    // Parse accounts array
    const accounts = Array.isArray(data) ? data : data.accounts;
    
    // Log each account individually with clear formatting
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 ALL ACCOUNTS IN EXTERNAL SYSTEM');
    console.log('═══════════════════════════════════════════════════════');
    
    if (Array.isArray(accounts)) {
      console.log(`\n📊 Total accounts found: ${accounts.length}\n`);
      
      accounts.forEach((account: any, index: number) => {
        console.log(`┌─ Account #${index + 1} ────────────────────────────────`);
        console.log(`│ 📧 Email:        ${account.email || 'N/A'}`);
        console.log(`│ 👤 Username:     ${account.username || 'N/A'}`);
        console.log(`│ 🏷️  Account Type: ${account.accountType || 'N/A'}`);
        console.log(`│ 🔐 Permissions:`);
        if (account.permissions) {
          console.log(`│    • QC:              ${account.permissions.QC ?? 'not set'}`);
          console.log(`│    • Upload:          ${account.permissions.Upload ?? 'not set'}`);
          console.log(`│    • ViewAssignments: ${account.permissions.ViewAssignments ?? 'not set'}`);
        } else {
          console.log(`│    ❌ No permissions set`);
        }
        console.log(`└────────────────────────────────────────────────────`);
        console.log('');
      });
      
      // Summary
      console.log('═══════════════════════════════════════════════════════');
      console.log('📋 QUICK REFERENCE - EMAIL LIST:');
      console.log('═══════════════════════════════════════════════════════');
      accounts.forEach((account: any, index: number) => {
        const qc = account.permissions?.QC ? '✅ QC' : '❌ No QC';
        console.log(`${index + 1}. ${account.email} (${account.accountType}) - ${qc}`);
      });
      console.log('═══════════════════════════════════════════════════════\n');
    } else {
      console.log('⚠️ Unexpected data format - not an array');
      console.log('Data type:', typeof data);
      console.log('Data:', JSON.stringify(data, null, 2));
    }
    
    console.log('🔐 [ACCOUNTS API DEBUG] ===========================\n');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying to DEV API:', error);
    console.log('🔐 [ACCOUNTS API DEBUG] ===========================\n');
    return NextResponse.json(
      { error: 'Failed to connect to DEV API', details: String(error) },
      { status: 500 }
    );
  }
}
