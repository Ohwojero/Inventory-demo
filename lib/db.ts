// lib/db.ts
import sqlite3 from 'sqlite3';
import { hashSync } from "bcrypt";
import path from "path";
import { promisify } from 'util';

let sqliteDb: sqlite3.Database | null = null;

function getDb(): sqlite3.Database {
  if (!sqliteDb) {
    const dbPath = process.env.NODE_ENV === 'production' ? ':memory:' : path.join(process.cwd(), "data", "inventory.db");
    sqliteDb = new sqlite3.Database(dbPath);

    // Initialize database tables
    sqliteDb.serialize(() => {
      sqliteDb!.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'salesgirl'))
        );

        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          sku TEXT UNIQUE NOT NULL,
          quantity INTEGER NOT NULL,
          reorderLevel INTEGER NOT NULL,
          price REAL NOT NULL,
          cost REAL NOT NULL,
          category TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          productId TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          total REAL NOT NULL,
          date TEXT NOT NULL,
          salesPersonId TEXT NOT NULL,
          paymentMode TEXT NOT NULL CHECK(paymentMode IN ('POS', 'transfer', 'cash')),
          FOREIGN KEY (productId) REFERENCES products(id),
          FOREIGN KEY (salesPersonId) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          date TEXT NOT NULL,
          createdBy TEXT NOT NULL,
          FOREIGN KEY (createdBy) REFERENCES users(id)
        );
      `);

      // Insert default admin user if not exists
      const adminPassword = hashSync("admin123", 10);
      const insertAdmin = sqliteDb!.prepare(`
        INSERT OR IGNORE INTO users (id, email, password, name, role)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertAdmin.run('admin1', 'admin@inventory.com', adminPassword, 'Admin User', 'admin');
      insertAdmin.finalize();

      // Insert sample products if not exists
      const insertProduct = sqliteDb!.prepare(`
        INSERT OR IGNORE INTO products (id, name, sku, quantity, reorderLevel, price, cost, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertProduct.run('prod1', 'Sample Product 1', 'SKU001', 100, 10, 50.00, 30.00, 'Electronics');
      insertProduct.run('prod2', 'Sample Product 2', 'SKU002', 200, 20, 25.00, 15.00, 'Clothing');
      insertProduct.run('prod3', 'Sample Product 3', 'SKU003', 150, 15, 75.00, 45.00, 'Home Goods');
      insertProduct.finalize();
    });
  }
  return sqliteDb;
}

export const database: {
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | null>;
  run(sql: string, params?: any[]): Promise<void>;
  transaction<T>(fn: (tx: typeof database) => Promise<T>): Promise<T>;
} = {
  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      try {
        getDb().all(sql, params, (err, rows) => {
          if (err) {
            console.error('Database all() error:', err, 'SQL:', sql, 'Params:', params);
            reject(err);
          } else {
            resolve(rows as T[]);
          }
        });
      } catch (error) {
        console.error('Database all() error:', error, 'SQL:', sql, 'Params:', params);
        reject(error);
      }
    });
  },

  get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      try {
        getDb().get(sql, params, (err, row) => {
          if (err) {
            console.error('Database get() error:', err, 'SQL:', sql, 'Params:', params);
            reject(err);
          } else {
            resolve((row as T) ?? null);
          }
        });
      } catch (error) {
        console.error('Database get() error:', error, 'SQL:', sql, 'Params:', params);
        reject(error);
      }
    });
  },

  run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        getDb().run(sql, params, function(err) {
          if (err) {
            console.error('Database run() error:', err, 'SQL:', sql, 'Params:', params);
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (error) {
        console.error('Database run() error:', error, 'SQL:', sql, 'Params:', params);
        reject(error);
      }
    });
  },

  transaction<T>(fn: (tx: typeof database) => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        getDb().serialize(async () => {
          try {
            const result = await fn(database);
            resolve(result);
          } catch (error) {
            console.error('Database transaction() error:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.error('Database transaction() error:', error);
        reject(error);
      }
    });
  },
};

// Database will be initialized lazily on first access
export { getDb as rawClient };
