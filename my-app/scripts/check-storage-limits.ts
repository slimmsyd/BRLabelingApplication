#!/usr/bin/env node
/**
 * Script to check Supabase Storage bucket configuration and limits
 * Usage: npx tsx scripts/check-storage-limits.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkStorageLimits() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables!');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
    process.exit(1);
  }

  console.log('🔍 Checking Supabase Storage Configuration...\n');
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('');

  try {
    // Fetch bucket configuration
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket/fight-videos`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch bucket info');
      console.error('Status:', response.status);
      console.error('Error:', errorText);
      process.exit(1);
    }

    const bucketData = await response.json();
    
    // Calculate sizes
    const limitBytes = bucketData.file_size_limit || 0;
    const limitMB = (limitBytes / 1024 / 1024).toFixed(2);
    const limitGB = (limitBytes / 1024 / 1024 / 1024).toFixed(3);

    console.log('📦 BUCKET: fight-videos');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📏 File Size Limits:');
    console.log(`   • Bytes: ${limitBytes.toLocaleString()}`);
    console.log(`   • MB: ${limitMB}`);
    console.log(`   • GB: ${limitGB}`);
    console.log('');
    console.log('🔒 Configuration:');
    console.log(`   • Public: ${bucketData.public}`);
    console.log(`   • ID: ${bucketData.id}`);
    console.log(`   • Name: ${bucketData.name}`);
    console.log(`   • Owner: ${bucketData.owner || 'N/A'}`);
    console.log('');
    
    if (bucketData.allowed_mime_types && bucketData.allowed_mime_types.length > 0) {
      console.log('📝 Allowed MIME Types:');
      bucketData.allowed_mime_types.forEach((type: string) => {
        console.log(`   • ${type}`);
      });
    } else {
      console.log('📝 Allowed MIME Types: All types allowed');
    }
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📋 Full Bucket Data:');
    console.log(JSON.stringify(bucketData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStorageLimits();
