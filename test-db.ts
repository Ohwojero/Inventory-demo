import { db } from './lib/db.ts';

async function testDb() {
  console.log('Testing database...');
  try {
    const products = await db.all('SELECT * FROM products');
    console.log('Products:', products);

    const users = await db.all('SELECT * FROM users');
    console.log('Users:', users);

    const sales = await db.all('SELECT * FROM sales');
    console.log('Sales:', sales);

    const expenses = await db.all('SELECT * FROM expenses');
    console.log('Expenses:', expenses);
  } catch (error) {
    console.error('Error:', error);
  }
}

testDb();
