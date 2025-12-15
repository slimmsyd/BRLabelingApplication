/**
 * External API Integration
 * Handles communication with the dev's backend for user permissions and account management
 */

interface PermissionResponse {
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
    console.log('🔍 Looking up external account by email:', email);
    
    const response = await fetch(`${EXTERNAL_API_URL}/accounts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(EXTERNAL_API_KEY && { 'Authorization': `Bearer ${EXTERNAL_API_KEY}` }),
      },
    });

    if (!response.ok) {
      console.error('⚠️ Failed to fetch accounts from DEV API:', response.status);
      return null;
    }

    const data = await response.json();
    
    // The response might be { accounts: [...] } or just an array
    const accounts: PermissionResponse[] = Array.isArray(data) ? data : data.accounts;
    
    if (!accounts || !Array.isArray(accounts)) {
      console.error('❌ Unexpected response format from /accounts:', data);
      return null;
    }

    // Find account by email (case-insensitive)
    const matchedAccount = accounts.find(
      (acc) => acc.email?.toLowerCase() === email.toLowerCase()
    );

    if (matchedAccount) {
      console.log('✅ Found external account by email:', email);
      console.log('   👤 Username:', matchedAccount.username);
      console.log('   🏷️  Account Type:', matchedAccount.accountType);
      console.log('   🔐 Permissions:', JSON.stringify(matchedAccount.permissions));
      return matchedAccount;
    } else {
      console.log('❌ No external account found for email:', email);
      console.log('   📋 Available emails:', accounts.map(a => a.email).join(', '));
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching account by email from DEV API:', error);
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
