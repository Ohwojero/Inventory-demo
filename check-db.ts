import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'inventory.db');
const db = new sqlite3.Database(dbPath);

db.all('SELECT * FROM products', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Products:', rows);
  }
});

db.all('SELECT * FROM users', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Users:', rows);
  }
  db.close();
});
