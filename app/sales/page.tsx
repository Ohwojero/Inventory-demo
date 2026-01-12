"use client";

import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type RootState, logout } from "@/lib/store";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Plus,
  Trash2,
  ShoppingCart,
  Download,
  Printer,
  ArrowLeft,
} from "lucide-react";

import { Sidebar } from "@/components/sidebar";
import { DataTable } from "@/components/data-table";
import Link from "next/link";

import {
  getSalesData,
  addSaleAction,
  deleteSaleAction,
} from "./actions";
import type { Product, Sale, User } from "@/lib/types";

export default function SalesPage() {
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );
  const router = useRouter();

  // ---------- local UI state ----------
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    quantity: 1,
    paymentMode: "POS" as "POS" | "transfer" | "cash",
  });

  // ---------- data from SQLite ----------
  const [data, setData] = useState<{
    products: Product[];
    sales: Sale[];
    users: Pick<User, "id" | "name">[];
    totalRevenue: number;
    totalSales: number;
    averageOrderValue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------- load data ----------
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (
      user?.role !== "admin" &&
      user?.role !== "manager" &&
      user?.role !== "salesgirl"
    ) {
      router.push("/dashboard");
      return;
    }

    (async () => {
      const d = await getSalesData();
      setData(d);
      setLoading(false);
    })();
  }, [isAuthenticated, user, router]);

  // ---------- add sale ----------
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || form.quantity <= 0 || !user) return;

    try {
      await addSaleAction({
        ...form,
        salesPersonId: user.id,
      });
      setForm({ productId: "", quantity: 1, paymentMode: "POS" });
      setIsOpen(false);
      const refreshed = await getSalesData();
      setData(refreshed);
    } catch (err: any) {
      alert(err.message ?? "Failed to record sale");
    }
  };

  // ---------- delete sale ----------
  const handleDeleteSale = async (saleId: string) => {
    if (user?.role === "salesgirl") return;
    if (!confirm("Delete this sale? Stock will be restored.")) return;

    try {
      await deleteSaleAction(saleId);
      const refreshed = await getSalesData();
      setData(refreshed);
    } catch (err: any) {
      alert(err.message ?? "Failed to delete sale");
    }
  };

  // ---------- PDF / Print ----------
  const generatePDF = async () => {
    if (!data) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.setFont("helvetica");

      // Header
      pdf.setFontSize(20);
      pdf.text("Mr. TP - Sales Report", 105, 20, { align: "center" });
      pdf.setFontSize(12);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 30, {
        align: "center",
      });

      // Table
      const headers = [
        "Product",
        "Qty",
        "Unit",
        "Total",
        "Sales Person",
        "Date",
        "Mode",
      ];
      let y = 50;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      headers.forEach((h, i) => pdf.text(h, 10 + i * 25, y));
      y += 10;
      pdf.setFont("helvetica", "normal");

      data.sales.forEach((s) => {
        const row = [
          s.productName ?? "—",
          s.quantity.toString(),
          `₦${s.price.toFixed(2)}`,
          `₦${s.total.toFixed(2)}`,
          s.salesPersonName ?? "—",
          new Date(s.date).toLocaleDateString(),
          s.paymentMode,
        ];
        row.forEach((cell, i) => pdf.text(cell, 10 + i * 25, y));
        y += 8;
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
      });

      // Summary
      y += 10;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(`Total Sales: ${data.totalSales}`, 10, y);
      y += 8;
      pdf.text(`Revenue: ₦${data.totalRevenue.toFixed(2)}`, 10, y);
      y += 8;
      pdf.text(`Avg: ₦${data.averageOrderValue.toFixed(2)}`, 10, y);

      pdf.save("sales-report.pdf");
    } catch (e) {
      alert("PDF error");
    }
  };

  const printSales = () => window.print();

  // ---------- receipt ----------
  const handleGenerateReceipt = async (saleId: string) => {
    if (!data) return;
    const sale = data.sales.find((s) => s.id === saleId);
    if (!sale) return alert("Sale not found");

    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.setFont("helvetica");

      pdf.setFontSize(20);
      pdf.text("Mr. TP", 105, 20, { align: "center" });
      pdf.setFontSize(12);
      pdf.text("Sales Receipt", 105, 30, { align: "center" });

      let y = 50;
      pdf.setFontSize(10);
      pdf.text(`Receipt #: ${sale.id}`, 20, y);
      y += 10;
      pdf.text(`Date: ${new Date(sale.date).toLocaleDateString()}`, 20, y);
      y += 10;
      pdf.text(`Sales Person: ${sale.salesPersonName ?? "—"}`, 20, y);
      y += 20;

      pdf.setFontSize(12);
      pdf.text(`Product: ${sale.productName ?? "—"}`, 20, y);
      y += 10;
      pdf.text(`Qty: ${sale.quantity}`, 20, y);
      y += 10;
      pdf.text(`Unit: ₦${sale.price.toFixed(2)}`, 20, y);
      y += 10;
      pdf.text(`Mode: ${sale.paymentMode}`, 20, y);
      y += 20;

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Total: ₦${sale.total.toFixed(2)}`, 105, y, { align: "center" });
      y += 20;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text("Thank you for your business!", 105, y, { align: "center" });

      pdf.save(`receipt-${sale.id}.pdf`);
    } catch (e) {
      alert("Receipt error");
    }
  };

  // ---------- table columns ----------
  const tableColumns = [
    {
      key: "productName",
      label: "Product",
      searchable: true,
      render: (v: string) => v ?? "—",
    },
    { key: "quantity", label: "Qty" },
    {
      key: "price",
      label: "Unit",
      render: (v: number) => `₦${v.toFixed(2)}`,
    },
    {
      key: "total",
      label: "Total",
      render: (v: number) => `₦${v.toFixed(2)}`,
    },
    {
      key: "salesPersonName",
      label: "Sales Person",
      searchable: true,
      render: (v: string) => v ?? "—",
    },
    {
      key: "date",
      label: "Date",
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    { key: "paymentMode", label: "Mode" },
    {
      key: "id",
      label: "Receipt",
      render: (id: string) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleGenerateReceipt(id)}
        >
          <Download className="w-4 h-4" />
        </Button>
      ),
    },
    ...(user?.role !== "salesgirl"
      ? [
          {
            key: "id",
            label: "Delete",
            render: (id: string) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteSale(id)}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            ),
          },
        ]
      : []),
  ];

  // ---------- loading / auth guard ----------
  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading…
      </div>
    );
  }

  // ---------- render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Sidebar />

      <main className="md:ml-64 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          {user?.role !== "salesgirl" && (
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          )}
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              Sales Management
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Track and manage sales transactions
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generatePDF}
              className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button
              onClick={printSales}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>

          {/* New Sale Dialog */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record New Sale</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSale} className="space-y-4">
                {/* Product */}
                <div>
                  <Label>Product</Label>
                  <Select
                    value={form.productId}
                    onValueChange={(v) => setForm({ ...form, productId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (Stock: {p.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quantity: Number(e.target.value) || 1,
                      })
                    }
                  />
                </div>

                {/* Payment mode */}
                <div>
                  <Label>Payment Mode</Label>
                  <Select
                    value={form.paymentMode}
                    onValueChange={(v: any) =>
                      setForm({ ...form, paymentMode: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POS">POS</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Total preview */}
                {form.productId && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Total Amount
                    </p>
                    <p className="text-2xl font-bold">
                      ₦
                      {(
                        (data.products.find((p) => p.id === form.productId)
                          ?.price || 0) * form.quantity
                      ).toFixed(2)}
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full">
                  Record Sale
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Total Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {data.totalSales}
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                Transactions completed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                  ₦{data.totalRevenue.toFixed(0)}
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <Plus className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                Revenue generated
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Average Order Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                  ₦{data.averageOrderValue.toFixed(0)}
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                  <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                Per transaction average
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              Sales Transactions
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
              Total transactions:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {data.sales.length}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={tableColumns}
              data={data.sales}
              itemsPerPage={10}
              searchPlaceholder="Search by product name..."
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}