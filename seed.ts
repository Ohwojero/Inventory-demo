import { db } from './lib/db.ts'

async function seed() {
  console.log('Seeding database...')
  // The seeding happens in lib/db.ts on import
  await db.get('SELECT 1') // Just to ensure init is done
  console.log('Seeding complete.')
}

seed().catch(console.error)
