// lib/db.ts
import { createClient, type Client, type ResultSet, type Transaction } from "@libsql/client";
import path from "node:path";
import { hashSync } from "bcrypt";

// ────────────────────────────────────────────────
// Allowed parameter types for libsql bindings
// ────────────────────────────────────────────────
type SqlParams = Array<null | string | number | Uint8Array | bigint | boolean>;

// ────────────────────────────────────────────────
// Singleton client + lazy initialization
// ────────────────────────────────────────────────

let libsqlClient: Client | null = null;
let initializationPromise: Promise<void> | null = null;

async function initializeDatabase(): Promise<void> {
  if (libsqlClient) return;

  let databaseUrl: string;

  if (process.env.VERCEL) {
    // On Vercel, use in-memory database for demo
    databaseUrl = ":memory:";
  } else {
    // DEVELOPMENT: local file-based SQLite
    const dbFolder = path.join(process.cwd(), "data");
    const dbPath = path.join(dbFolder, "inventory.db");
    databaseUrl = `file:${dbPath}`;

    // Optional: you can manually create the folder or add:
    // await import("node:fs/promises").then(fs => fs.mkdir(dbFolder, { recursive: true }).catch(() => {}));
  }

  console.log(`[DB] Connecting to → ${databaseUrl}`);

  libsqlClient = createClient({
    url: databaseUrl,
  });

  // ── Create tables ─────────────────────────────────────────────
  await libsqlClient.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'salesgirl'))
    );
  `);

  await libsqlClient.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      sku          TEXT UNIQUE NOT NULL,
      quantity     INTEGER NOT NULL,
      reorderLevel INTEGER NOT NULL,
      price        REAL NOT NULL,
      cost         REAL NOT NULL,
      category     TEXT NOT NULL
    );
  `);

  await libsqlClient.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id            TEXT PRIMARY KEY,
      productId     TEXT NOT NULL,
      quantity      INTEGER NOT NULL,
      price         REAL NOT NULL,
      total         REAL NOT NULL,
      date          TEXT NOT NULL,
      salesPersonId TEXT NOT NULL,
      paymentMode   TEXT NOT NULL CHECK(paymentMode IN ('POS', 'transfer', 'cash')),
      FOREIGN KEY (productId)     REFERENCES products(id),
      FOREIGN KEY (salesPersonId) REFERENCES users(id)
    );
  `);

  await libsqlClient.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id          TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount      REAL NOT NULL,
      category    TEXT NOT NULL,
      date        TEXT NOT NULL,
      createdBy   TEXT NOT NULL,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );
  `);

  // ── Seed default data (runs only once thanks to OR IGNORE) ───
  const adminHashed = hashSync("admin123", 10);

  await libsqlClient.execute(
    `
      INSERT OR IGNORE INTO users (id, email, password, name, role)
      VALUES (?, ?, ?, ?, ?)
    `,
    ["admin1", "admin@inventory.com", adminHashed, "Admin User", "admin"]
  );

  await libsqlClient.execute(
    `
      INSERT OR IGNORE INTO products (id, name, sku, quantity, reorderLevel, price, cost, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ["prod1", "Sample Product 1", "SKU001", 100, 10, 50.00, 30.00, "Electronics"]
  );

  await libsqlClient.execute(
    `
      INSERT OR IGNORE INTO products (id, name, sku, quantity, reorderLevel, price, cost, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ["prod2", "Sample Product 2", "SKU002", 200, 20, 25.00, 15.00, "Clothing"]
  );

  await libsqlClient.execute(
    `
      INSERT OR IGNORE INTO products (id, name, sku, quantity, reorderLevel, price, cost, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ["prod3", "Sample Product 3", "SKU003", 150, 15, 75.00, 45.00, "Home Goods"]
  );

  console.log("[DB] Initialization & seeding completed");
}

// ────────────────────────────────────────────────
// Lazy getter for the client
// ────────────────────────────────────────────────

async function getInitializedClient(): Promise<Client> {
  if (!initializationPromise) {
    initializationPromise = initializeDatabase().catch((err) => {
      console.error("[DB INIT ERROR]", err);
      throw err;
    });
  }

  await initializationPromise;

  if (!libsqlClient) {
    throw new Error("Database client not initialized");
  }

  return libsqlClient;
}

// ────────────────────────────────────────────────
// Public database wrapper
// ────────────────────────────────────────────────

interface Database {
  all<T = unknown>(sql: string, params?: SqlParams): Promise<T[]>;
  get<T = unknown>(sql: string, params?: SqlParams): Promise<T | null>;
  run(sql: string, params?: SqlParams): Promise<void>;
  transaction<T>(callback: (tx: Database) => Promise<T>): Promise<T>;
}

export const db: Database = {
  async all<T = unknown>(sql: string, params: SqlParams = []): Promise<T[]> {
    const client = await getInitializedClient();
    const result: ResultSet = await client.execute({ sql, args: params });
    return result.rows as T[];
  },

  async get<T = unknown>(sql: string, params: SqlParams = []): Promise<T | null> {
    const client = await getInitializedClient();
    const result: ResultSet = await client.execute({ sql, args: params });
    return (result.rows[0] as T) ?? null;
  },

  async run(sql: string, params: SqlParams = []): Promise<void> {
    const client = await getInitializedClient();
    await client.execute({ sql, args: params });
  },

  async transaction<T>(callback: (tx: Database) => Promise<T>): Promise<T> {
    const client = await getInitializedClient();

    await client.execute("BEGIN");

    try {
      const txDb: Database = {
        all: async <U = unknown>(sql: string, params: SqlParams = []): Promise<U[]> => {
          const result: ResultSet = await client.execute({ sql, args: params });
          return result.rows as U[];
        },
        get: async <U = unknown>(sql: string, params: SqlParams = []): Promise<U | null> => {
          const result: ResultSet = await client.execute({ sql, args: params });
          return (result.rows[0] as U) ?? null;
        },
        run: async (sql: string, params: SqlParams = []): Promise<void> => {
          await client.execute({ sql, args: params });
        },
        transaction: async <V>(cb: (tx: Database) => Promise<V>): Promise<V> => {
          throw new Error("Nested transactions not supported");
        },
      };

      const result = await callback(txDb);

      try {
        await client.execute("COMMIT");
      } catch (commitError) {
        // If commit fails because transaction was already rolled back, ignore
        if (!(commitError instanceof Error) || !commitError.message.includes("no transaction is active")) {
          throw commitError;
        }
      }

      return result;
    } catch (error) {
      // Try to rollback, but ignore if already rolled back
      try {
        await client.execute("ROLLBACK");
      } catch (rollbackError) {
        // Ignore rollback errors
      }
      throw error;
    }
  },
};

// Optional: for raw access when needed
export const getRawClient = getInitializedClient;