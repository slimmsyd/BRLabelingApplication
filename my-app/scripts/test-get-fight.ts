/**
 * Test GET request to retrieve fight data from external API
 * Run with: npx tsx scripts/test-get-fight.ts [fight_title]
 */

const EXTERNAL_API_BASE_URL = 'https://www.huemanAPI.com';

async function getFight(fightTitle: string) {
  console.log('\n========================================');
  console.log('🔍 GET FIGHT DATA TEST');
  console.log('========================================');
  
  const url = `${EXTERNAL_API_BASE_URL}/fight/${encodeURIComponent(fightTitle)}`;
  console.log(`📡 URL: ${url}`);
  console.log(`🎯 Fight: ${fightTitle}`);
  console.log('');

  try {
    console.log('⏳ Fetching...');
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error response:\n${errorText.substring(0, 500)}`);
      return;
    }

    const data = await response.json();
    console.log('\n✅ SUCCESS! Fight data retrieved:');
    console.log('========================================');
    console.log(JSON.stringify(data, null, 2));
    console.log('========================================');

    // Summary
    console.log('\n📋 Summary:');
    console.log(`   Fight Title: ${data.fight_title || 'N/A'}`);
    
    // Count rounds
    const rounds = Object.keys(data).filter(key => key.startsWith('RD'));
    console.log(`   Rounds: ${rounds.join(', ')}`);
    
    // Count events per round
    rounds.forEach(round => {
      if (data[round]) {
        const cameras = Object.keys(data[round]);
        let totalEvents = 0;
        cameras.forEach(cam => {
          if (Array.isArray(data[round][cam])) {
            totalEvents += data[round][cam].length;
          }
        });
        console.log(`   ${round}: ${totalEvents} events across ${cameras.length} cameras`);
      }
    });

    if (data.submittedBy) {
      console.log(`   Submitted By: ${data.submittedBy.email || 'N/A'}`);
    }
    
    if (data.reviewedBy) {
      console.log(`   Reviewed By: ${data.reviewedBy.email || 'N/A'}`);
    }

    console.log('========================================\n');

  } catch (error) {
    console.log(`❌ Error: ${error}`);
    console.log('========================================\n');
  }
}

async function main() {
  // Get fight title from command line or use default
  const fightTitle = process.argv[2] || 'Devin Haney v Brian Norman Jr - R5';
  
  await getFight(fightTitle);
}

main();

export {};
