'use server'

import { db } from '@/lib/db'
import { hash } from 'bcrypt'
import { revalidatePath } from 'next/cache'

export type User = {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'salesgirl'
}

export async function getAllUsers(): Promise<User[]> {
  const rows = await db.all('SELECT id, email, name, role FROM users')
  return rows as User[]
}

export async function createUser(data: {
  email: string
  name: string
  role: 'admin' | 'manager' | 'salesgirl'
  password: string
}): Promise<User | null> {
  try {
    const id = `user-${Date.now()}`
    const password = await hash(data.password, 10)

    await db.run(
      `INSERT INTO users (id, email, password, name, role)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.email, password, data.name, data.role]
    )

    revalidatePath('/users')
    return { id, email: data.email, name: data.name, role: data.role }
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error('Email already exists')
    }
    throw error
  }
}

export async function deleteUserById(userId: string): Promise<void> {
  await db.run('DELETE FROM users WHERE id = ?', [userId])
  revalidatePath('/users')
}