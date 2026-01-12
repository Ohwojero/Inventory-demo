// app/inventory/actions.ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
  price: number;
  cost: number;
  category: string;
}

/** Load all products */
export async function getProducts(): Promise<Product[]> {
  return await db.all("SELECT * FROM products ORDER BY name ASC");
}

/** Add a new product */
export async function addProduct(data: Omit<Product, "id">) {
  const id = `prod-${Date.now()}`;
  await db.run(
    `INSERT INTO products
     (id, name, sku, quantity, reorderLevel, price, cost, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.sku,
      data.quantity,
      data.reorderLevel,
      data.price,
      data.cost,
      data.category,
    ]
  );

  revalidatePath("/inventory");
  return { id, ...data };
}

/** Update an existing product */
export async function updateProduct(id: string, data: Partial<Product>) {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.sku !== undefined) {
    fields.push("sku = ?");
    values.push(data.sku);
  }
  if (data.quantity !== undefined) {
    fields.push("quantity = ?");
    values.push(data.quantity);
  }
  if (data.reorderLevel !== undefined) {
    fields.push("reorderLevel = ?");
    values.push(data.reorderLevel);
  }
  if (data.price !== undefined) {
    fields.push("price = ?");
    values.push(data.price);
  }
  if (data.cost !== undefined) {
    fields.push("cost = ?");
    values.push(data.cost);
  }
  if (data.category !== undefined) {
    fields.push("category = ?");
    values.push(data.category);
  }

  if (fields.length === 0) return;

  const sql = `UPDATE products SET ${fields.join(", ")} WHERE id = ?`;
  values.push(id);

  await db.run(sql, values);
  revalidatePath("/inventory");
}

/** Delete a product */
export async function deleteProduct(id: string) {
  await db.run("DELETE FROM products WHERE id = ?", [id]);
  revalidatePath("/inventory");
}