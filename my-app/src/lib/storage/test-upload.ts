/**
 * MINIMAL TEST UPLOAD
 * 
 * Stripped down to the absolute basics to debug the 413 error.
 * No frills, just the essentials.
 */

export interface SimpleUploadResult {
  success: boolean;
  error?: string;
  details?: {
    fileName: string;
    fileSize: number;
    fileSizeMB: string;
    bucketLimit: number;
    bucketLimitMB: string;
    statusCode?: number;
    response?: string;
  };
}

/**
 * Test upload - minimal implementation
 */
export async function testSimpleUpload(file: File): Promise<SimpleUploadResult> {
  const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
  
  console.log('='.repeat(60));
  console.log('🧪 MINIMAL TEST UPLOAD');
  console.log('='.repeat(60));
  console.log(`File: ${file.name}`);
  console.log(`Size: ${fileSizeMB} MB (${file.size} bytes)`);
  console.log(`Type: ${file.type}`);
  console.log('-'.repeat(60));

  // Step 1: Get credentials
  console.log('Step 1: Getting credentials...');
  let token: string;
  let supabaseUrl: string;
  
  try {
    const credRes = await fetch('/api/videos/get-upload-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!credRes.ok) {
      const err = await credRes.text();
      console.error('❌ Failed to get credentials:', err);
      return { success: false, error: `Credentials failed: ${err}` };
    }
    
    const creds = await credRes.json();
    token = creds.token;
    supabaseUrl = creds.supabaseUrl;
    console.log('✅ Got credentials');
    console.log(`   Supabase URL: ${supabaseUrl}`);
  } catch (e) {
    console.error('❌ Credentials error:', e);
    return { success: false, error: `Credentials error: ${e}` };
  }

  // Step 2: Get bucket info
  console.log('Step 2: Checking bucket limit...');
  let bucketLimit = 0;
  
  try {
    const bucketRes = await fetch('/api/videos/bucket-info');
    if (bucketRes.ok) {
      const bucketInfo = await bucketRes.json();
      bucketLimit = bucketInfo.file_size_limit_bytes;
      console.log(`✅ Bucket limit: ${bucketInfo.file_size_limit_mb} MB`);
      
      if (file.size > bucketLimit) {
        console.error(`❌ FILE TOO LARGE! ${fileSizeMB} MB > ${bucketInfo.file_size_limit_mb} MB`);
        return { 
          success: false, 
          error: `File ${fileSizeMB} MB exceeds bucket limit ${bucketInfo.file_size_limit_mb} MB` 
        };
      }
      console.log(`✅ File size OK: ${fileSizeMB} MB < ${bucketInfo.file_size_limit_mb} MB`);
    }
  } catch (e) {
    console.warn('⚠️ Could not check bucket limit:', e);
  }

  // Step 3: Upload directly
  console.log('Step 3: Uploading file...');
  const storagePath = `test/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/fight-videos/${storagePath}`;
  
  console.log(`   Storage path: ${storagePath}`);
  console.log(`   Upload URL: ${uploadUrl}`);
  
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        console.log(`   Progress: ${pct}%`);
      }
    };
    
    xhr.onload = () => {
      console.log('-'.repeat(60));
      console.log(`Response Status: ${xhr.status}`);
      console.log(`Response Body: ${xhr.responseText}`);
      console.log('='.repeat(60));
      
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log('✅ UPLOAD SUCCESSFUL!');
        resolve({ 
          success: true,
          details: {
            fileName: file.name,
            fileSize: file.size,
            fileSizeMB,
            bucketLimit,
            bucketLimitMB: (bucketLimit / 1024 / 1024).toFixed(2),
            statusCode: xhr.status,
            response: xhr.responseText
          }
        });
      } else {
        console.error('❌ UPLOAD FAILED');
        console.error(`Status: ${xhr.status}`);
        console.error(`Response: ${xhr.responseText}`);
        
        // Parse the error to understand it better
        try {
          const errObj = JSON.parse(xhr.responseText);
          console.error('Error details:', errObj);
          
          if (errObj.statusCode === '413' || errObj.error === 'Payload too large') {
            console.error('');
            console.error('🔴 413 PAYLOAD TOO LARGE ERROR DETECTED');
            console.error('   But your file is within the bucket limit!');
            console.error('   This suggests an infrastructure-level limit.');
            console.error('   Possible causes:');
            console.error('   1. Supabase compute instance limit (Nano = 50MB)');
            console.error('   2. CDN/proxy limit');
            console.error('   3. Plan upgrade not yet propagated');
            console.error('');
          }
        } catch {}
        
        resolve({ 
          success: false, 
          error: xhr.responseText,
          details: {
            fileName: file.name,
            fileSize: file.size,
            fileSizeMB,
            bucketLimit,
            bucketLimitMB: (bucketLimit / 1024 / 1024).toFixed(2),
            statusCode: xhr.status,
            response: xhr.responseText
          }
        });
      }
    };
    
    xhr.onerror = () => {
      console.error('❌ Network error');
      resolve({ success: false, error: 'Network error' });
    };
    
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.send(file);
  });
}
