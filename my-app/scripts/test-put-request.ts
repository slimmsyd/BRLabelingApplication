/**
 * Test PUT request to see full backend response
 * Run with: npx tsx scripts/test-put-request.ts
 */

const EXTERNAL_API_BASE_URL = 'https://www.huemanAPI.com';

async function testPutRequest() {
  console.log('\n========================================');
  console.log('🧪 TEST PUT REQUEST');
  console.log('========================================\n');

  const fightTitle = 'Devin Haney v Brian Norman Jr - R5';
  const url = `${EXTERNAL_API_BASE_URL}/fight/${encodeURIComponent(fightTitle)}`;

  console.log(`📡 URL: ${url}`);
  console.log(`🎯 Fight: ${fightTitle}`);
  console.log(`🔧 Method: PUT\n`);

  const payload = {
    fight_title: fightTitle,
    RD5: {
      Cam1: [{
        eventType: 'punch',
        fighter: 'boxer2',
        startTime: 179.66,
        endTime: 179.93,
        startTimeFormatted: '02:59.66',
        endTimeFormatted: '02:59.93',
        hand: 'left',
        punchType: 'Jab',
        target: 'Body',
        punchQuality: '1',
        knockdown: false,
        stoppageKo: false,
        visibility: [1, 1, 1, 1, 0],
        stance: 'Orthodox',
        punchResult: 'Missed',
        defenseType: null,
        labeledBy: 'cmj78sut60000vw6mrv67orj8',
        labeledByEmail: 'syd@boxraw.com',
        fight_title: fightTitle,
      }]
    },
    submittedBy: {
      userId: 'cmj78sut60000vw6mrv67orj8',
      email: 'syd@boxraw.com',
      timestamp: new Date().toISOString(),
    },
    isQCReview: true,
    reviewedBy: {
      userId: 'cmj78sut60000vw6mrv67orj8',
      email: 'syd@boxraw.com',
      timestamp: new Date().toISOString(),
    },
  };

  console.log('📤 Sending payload (first 500 chars):');
  console.log(JSON.stringify(payload, null, 2).substring(0, 500));
  console.log('...\n');

  try {
    console.log('⏳ Sending PUT request...\n');
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response:');
      console.log('========================================');
      console.log(errorText);
      console.log('========================================\n');
      return;
    }

    const data = await response.json();
    console.log('✅ SUCCESS! Backend Response:');
    console.log('========================================');
    console.log(JSON.stringify(data, null, 2));
    console.log('========================================\n');

    console.log('📋 Response Analysis:');
    if (data.changes_logged) {
      console.log('   ✅ Backend logged changes');
      const rounds = Object.keys(data.changes_logged);
      console.log(`   ✅ Rounds logged: ${rounds.join(', ')}`);
      
      rounds.forEach(round => {
        const change = data.changes_logged[round];
        console.log(`   ✅ ${round}: from ${change.from} → to ${change.to ? 'updated' : 'null'}`);
      });
    }

    if (data.message) {
      console.log(`   📝 Message: ${data.message}`);
    }

    console.log('========================================\n');

  } catch (error) {
    console.log(`❌ Error: ${error}`);
    console.log('========================================\n');
  }
}

testPutRequest();

export {};
