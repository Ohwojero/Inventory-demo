import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hash } from 'bcrypt'

export async function GET() {
  try {
    // Seed the admin user
    const adminPassword = await hash("admin123", 10)
    await db.run(`
      INSERT OR IGNORE INTO users (id, email, password, name, role)
      VALUES ('admin1', 'admin@inventory.com', ?, 'Admin User', 'admin')
    `, [adminPassword])

    return NextResponse.json({ message: 'Database seeded successfully' })
  } catch (error) {
    console.error('Seeding error:', error)
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 })
  }
}
