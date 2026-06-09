/**
 * External API Integration
 * Handles communication with the dev's backend for user permissions and account management
 */

export interface PermissionResponse {
  username: string;
  email: string;
  accountType: string;
  permissions: {
    QC?: boolean;
    Upload?: boolean;
    ViewAssignments?: boolean;
  };
}

interface CreateUserRequest {
  username: string;
  email: string;
  accountType: 'admin' | 'labeller';
}

// DEV's API Base URL
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'https://www.huemanapi.com';
const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || '';

/**
 * Create a new user in the external permission system (DEV's API)
 */
export async function createExternalUser(userData: CreateUserRequest): Promise<boolean> {
  try {
    const response = await fetch(`${EXTERNAL_API_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(EXTERNAL_API_KEY && { 'Authorization': `Bearer ${EXTERNAL_API_KEY}` }),
      },
      body: JSON.stringify({
        username: userData.username,
        email: userData.email,
        accountType: userData.accountType.toLowerCase(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to create external user:', response.status, errorText);
      return false;
    }

    console.log('✅ User created in DEV API:', userData.username);
    return true;
  } catch (error) {
    console.error('❌ Error creating external user:', error);
    return false;
  }
}

/**
 * Fetch ALL accounts from DEV API for debugging
 */
export async function getAllAccounts(): Promise<PermissionResponse[] | null> {
  try {
    console.log('🔍 DEBUG: Fetching all accounts from DEV API...');
    console.log('🔍 DEBUG: URL:', `${EXTERNAL_API_URL}/accounts`);
    
    const response = await fetch(`${EXTERNAL_API_URL}/accounts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(EXTERNAL_API_KEY && { 'Authorization': `Bearer ${EXTERNAL_API_KEY}` }),
      },
    });

    console.log('🔍 DEBUG: Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch all accounts:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('✅ DEBUG: All accounts from DEV API:');
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ Error fetching all accounts:', error);
    return null;
  }
}

/**
 * Get account data from DEV's API by username
 */
export async function getExternalAccount(username: string): Promise<PermissionResponse | null> {
  try {
    const response = await fetch(`${EXTERNAL_API_URL}/accounts/${username}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(EXTERNAL_API_KEY && { 'Authorization': `Bearer ${EXTERNAL_API_KEY}` }),
      },
    });

    if (!response.ok) {
      console.error('⚠️ Failed to fetch account from DEV API:', response.status);
      return null;
    }

    const data: PermissionResponse = await response.json();
    console.log('✅ Fetched account from DEV API:', username);
    return data;
  } catch (error) {
    console.error('❌ Error fetching account from DEV API:', error);
    return null;
  }
}

/**
 * Get account data from DEV's API by EMAIL (more reliable than username)
 * Fetches all accounts and finds the one matching the email
 */
export async function getExternalAccountByEmail(email: string): Promise<PermissionResponse | null> {
  try {
    console.log('\n🌐 [getExternalAccountByEmail] ========================');
    console.log('📧 Looking up external account by email:', email);
    console.log('🔗 API URL:', EXTERNAL_API_URL);
    console.log('🔑 Has API Key:', EXTERNAL_API_KEY ? 'YES' : 'NO');
    console.log('📡 Fetching from:', `${EXTERNAL_API_URL}/accounts`);
    
    const startTime = performance.now();
    const response = await fetch(`${EXTERNAL_API_URL}/accounts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(EXTERNAL_API_KEY && { 'Authorization': `Bearer ${EXTERNAL_API_KEY}` }),
      },
    });
    const endTime = performance.now();

    const contentType = response.headers.get('content-type') ?? '';
    const contentLength = response.headers.get('content-length') ?? 'unknown';
    console.log('⏱️  Fetch took:', (endTime - startTime).toFixed(2), 'ms');
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
      console.error('❌ Failed to fetch accounts from DEV API:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        looksLikeHtml,
        bodySnippet: bodyText.slice(0, 500),
      });
      console.log('🌐 [getExternalAccountByEmail] ========================\n');
      return null;
    }

    if (looksLikeHtml || !contentType.includes('application/json')) {
      console.error('❌ Upstream returned non-JSON / error response:', {
        finalUrl: response.url,
        status: response.status,
        contentType,
        looksLikeHtml,
        bodySnippet: bodyText.slice(0, 500),
      });
      console.log('🌐 [getExternalAccountByEmail] ========================\n');
      return null;
    }

    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (err) {
      console.error('❌ JSON parse failed despite JSON content-type:', {
        error: String(err),
        bodySnippet: bodyText.slice(0, 500),
      });
      console.log('🌐 [getExternalAccountByEmail] ========================\n');
      return null;
    }
    console.log('📦 Raw response data type:', Array.isArray(data) ? 'ARRAY' : typeof data);
    console.log('📦 Response keys:', typeof data === 'object' ? Object.keys(data).join(', ') : 'N/A');
    
    // The response might be { accounts: [...] } or just an array
    const accounts: PermissionResponse[] = Array.isArray(data) ? data : data.accounts;
    
    if (!accounts || !Array.isArray(accounts)) {
      console.error('❌ Unexpected response format from /accounts');
      console.error('❌ Data:', JSON.stringify(data, null, 2));
      console.log('🌐 [getExternalAccountByEmail] ========================\n');
      return null;
    }

    console.log('📊 Total accounts in external system:', accounts.length);
    console.log('📋 All emails in external system:', accounts.map(a => a.email).join(', '));
    console.log('🔍 Searching for:', email.toLowerCase());

    // Find account by email (case-insensitive)
    const matchedAccount = accounts.find(
      (acc) => acc.email?.toLowerCase() === email.toLowerCase()
    );

    if (matchedAccount) {
      console.log('✅ Found external account by email:', email);
      console.log('   👤 Username:', matchedAccount.username);
      console.log('   🏷️  Account Type:', matchedAccount.accountType);
      console.log('   🔐 Permissions:', JSON.stringify(matchedAccount.permissions));
      console.log('🌐 [getExternalAccountByEmail] ========================\n');
      return matchedAccount;
    } else {
      console.log('❌ No external account found for email:', email);
      console.log('   📋 Available emails:', accounts.map(a => a.email).join(', '));
      console.log('   ⚠️  User needs to be added to external system!');
      console.log('🌐 [getExternalAccountByEmail] ========================\n');
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching account by email from DEV API:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
    console.log('🌐 [getExternalAccountByEmail] ========================\n');
    return null;
  }
}

/**
 * Fetch user permissions from external API (legacy - now uses getExternalAccount)
 */
export async function fetchUserPermissions(
  userId: string,
  email: string
): Promise<PermissionResponse | null> {
  // Try by username first (extract from email or use userId)
  // For now, we'll use email as fallback
  console.warn('⚠️ fetchUserPermissions is deprecated, use getExternalAccount instead');
  
  try {
    const response = await fetch(`${EXTERNAL_API_URL}/accounts/${email}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(EXTERNAL_API_KEY && { 'Authorization': `Bearer ${EXTERNAL_API_KEY}` }),
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch permissions:', response.statusText);
      return null;
    }

    const data: PermissionResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return null;
  }
}

/**
 * Normalize accountType from external API (lowercase) to internal enum (uppercase)
 */
export function normalizeAccountType(externalType: string): 'ADMIN' | 'LABELER' | 'QUALITY_CONTROL' {
  const normalized = externalType.toUpperCase();
  if (normalized === 'ADMIN') return 'ADMIN';
  if (normalized === 'QUALITY_CONTROL' || normalized === 'QC') return 'QUALITY_CONTROL';
  return 'LABELER';
}

/**
 * Convert internal accountType to external format
 */
export function toExternalAccountType(internalType: string): 'admin' | 'labeller' {
  if (internalType === 'ADMIN') return 'admin';
  // QUALITY_CONTROL and LABELER both map to 'labeller' (double l as per dev API)
  // QC is now a permission, not an account type
  return 'labeller';
}
