/**
 * Test External API - Verify POST and PUT behavior
 * Run with: npx tsx scripts/test-external-api.ts
 */

const EXTERNAL_API_URL = 'https://www.huemanAPI.com/boxing_fight';

const testPayload = {
  fight_title: 'TEST_API_Connection',
  RD1: {
    Cam1: [{
      eventType: 'punch',
      fighter: 'boxer1',
      startTime: 10.5,
      endTime: 11.0,
      startTimeFormatted: '00:10.50',
      endTimeFormatted: '00:11.00',
      hand: 'left',
      punchType: 'Jab',
      target: 'Head',
      punchQuality: '1',
      knockdown: false,
      stoppageKo: false,
      visibility: [1, 1, 0, 0, 0],
      stance: 'Orthodox',
      punchResult: 'Landed',
      defenseType: null,
      labeledBy: 'test-user-id',
      labeledByEmail: 'test@boxraw.com',
    }]
  },
  metadata: {
    venue: 'Test Venue',
    date: '2026-01-12',
    weight_class: 'Welterweight',
    num_cameras: 1,
  },
  submittedBy: {
    userId: 'test-user-id',
    email: 'test@boxraw.com',
    timestamp: new Date().toISOString(),
  },
  isQCReview: false,
  reviewedBy: null,
  isTest: true,
};

async function testMethod(method: 'POST' | 'PUT') {
  console.log(`\n🧪 Testing ${method} to ${EXTERNAL_API_URL}...`);
  
  try {
    const response = await fetch(EXTERNAL_API_URL, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...testPayload,
        isQCReview: method === 'PUT',
      }),
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`   Response: ${responseText.substring(0, 300)}`);
    
    if (response.ok) {
      console.log(`   ✅ ${method} succeeded!`);
      return true;
    } else {
      console.log(`   ❌ ${method} failed with ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${method} error: ${error}`);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('🧪 EXTERNAL API TEST');
  console.log('========================================');
  console.log(`Target: ${EXTERNAL_API_URL}`);
  console.log(`Payload: ${JSON.stringify(testPayload, null, 2).substring(0, 500)}...`);

  // Test POST
  const postOk = await testMethod('POST');
  
  // Test PUT
  const putOk = await testMethod('PUT');

  console.log('\n========================================');
  console.log('📊 RESULTS');
  console.log('========================================');
  console.log(`POST: ${postOk ? '✅ Works' : '❌ Failed'}`);
  console.log(`PUT:  ${putOk ? '✅ Works' : '❌ Failed (405 Method Not Allowed expected)'}`);
  
  if (postOk && !putOk) {
    console.log('\n⚠️  RECOMMENDATION:');
    console.log('   POST works, PUT fails. Two options:');
    console.log('   1. Ask colleague to enable PUT on /boxing_fight endpoint');
    console.log('   2. Use POST for everything with isQCReview flag to distinguish');
  }
  
  console.log('========================================\n');
}

main();
