import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillVideoTitles() {
  console.log('Starting to backfill video titles in assignments...')
  
  // Get all assignments without video titles
  const assignments = await prisma.videoAssignment.findMany({
    where: {
      videoTitle: null
    },
    include: {
      video: true
    }
  })
  
  console.log(`Found ${assignments.length} assignments to update`)
  
  // Update each assignment with the video title
  for (const assignment of assignments) {
    await prisma.videoAssignment.update({
      where: { id: assignment.id },
      data: { videoTitle: assignment.video.title }
    })
    console.log(`✓ Updated assignment ${assignment.id} with title: ${assignment.video.title}`)
  }
  
  console.log('\n✅ Backfill complete!')
}

backfillVideoTitles()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
