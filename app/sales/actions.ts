// app/sales/actions.ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Product, Sale, User } from "@/lib/types";

export async function getSalesData() {
  const products: Product[] = await db.all("SELECT * FROM products");
  const salesRaw: Sale[] = await db.all(
    `SELECT s.*, p.name AS productName, u.name AS salesPersonName
     FROM sales s
     LEFT JOIN products p ON s.productId = p.id
     LEFT JOIN users u ON s.salesPersonId = u.id`
  );

  const users: Pick<User, "id" | "name">[] = await db.all(
    "SELECT id, name FROM users"
  );

  const totalRevenue = salesRaw.reduce((s, v) => s + v.total, 0);
  const totalSales = salesRaw.length;
  const averageOrderValue = totalSales ? totalRevenue / totalSales : 0;

  return {
    products,
    sales: salesRaw,
    users,
    totalRevenue,
    totalSales,
    averageOrderValue,
  };
}

/** Add a sale + deduct stock (atomic) */
export async function addSaleAction(
  form: {
    productId: string;
    quantity: number;
    paymentMode: "POS" | "transfer" | "cash";
    salesPersonId: string;
  }
) {
  const product = await db.get<Product>(
    "SELECT * FROM products WHERE id = ?",
    [form.productId]
  );

  if (!product) throw new Error("Product not found");
  if (product.quantity < form.quantity)
    throw new Error("Insufficient stock");

  const total = product.price * form.quantity;
  const saleId = `sale-${Date.now()}`;

  await db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO sales
       (id, productId, quantity, price, total, date, salesPersonId, paymentMode)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        saleId,
        form.productId,
        form.quantity,
        product.price,
        total,
        new Date().toISOString(),
        form.salesPersonId,
        form.paymentMode,
      ]
    );

    await tx.run(
      "UPDATE products SET quantity = quantity - ? WHERE id = ?",
      [form.quantity, form.productId]
    );
  });

  revalidatePath("/sales");
}

/** Delete a sale + restore stock */
export async function deleteSaleAction(saleId: string) {
  const sale = await db.get<Sale>(
    "SELECT * FROM sales WHERE id = ?",
    [saleId]
  );

  if (!sale) throw new Error("Sale not found");

  await db.transaction(async (tx) => {
    await tx.run("DELETE FROM sales WHERE id = ?", [saleId]);
    await tx.run(
      "UPDATE products SET quantity = quantity + ? WHERE id = ?",
      [sale.quantity, sale.productId]
    );
  });

  revalidatePath("/sales");
}