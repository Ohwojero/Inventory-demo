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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Plus,
  Trash2,
  Edit2,
  Package,
  AlertTriangle,
  ArrowLeft,
  Download,
  Printer,
} from "lucide-react";

import { Sidebar } from "@/components/sidebar";
import { DataTable } from "@/components/data-table";
import Link from "next/link";

import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "./actions";

export default function InventoryPage() {
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );
  const router = useRouter();

  // ---------- UI state ----------
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    quantity: 0,
    reorderLevel: 0,
    price: 0,
    cost: 0,
    category: "",
  });

  // ---------- Data ----------
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------- Load products ----------
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    (async () => {
      const data = await getProducts();
      setProducts(data);
      setLoading(false);
    })();
  }, [isAuthenticated, router]);

  // ---------- Add / Update product ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sku) return;

    try {
      if (editingId) {
        await updateProduct(editingId, form);
        setEditingId(null);
      } else {
        await addProduct(form);
      }

      setForm({
        name: "",
        sku: "",
        quantity: 0,
        reorderLevel: 0,
        price: 0,
        cost: 0,
        category: "",
      });
      setIsOpen(false);
      const refreshed = await getProducts();
      setProducts(refreshed);
    } catch (err: any) {
      alert(err.message ?? "Failed to save product");
    }
  };

  // ---------- Edit ----------
  const handleEdit = (p: any) => {
    setForm(p);
    setEditingId(p.id);
    setIsOpen(true);
  };

  // ---------- Delete ----------
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      const refreshed = await getProducts();
      setProducts(refreshed);
    } catch (err: any) {
      alert(err.message ?? "Failed to delete");
    }
  };

  // ---------- CSV ----------
  const downloadInventoryAsCSV = () => {
    if (products.length === 0) {
      alert("No products to download.");
      return;
    }

    const headers = [
      "Name",
      "SKU",
      "Category",
      "Quantity",
      "Cost",
      "Price",
      "Reorder Level",
      "Total Value",
    ];
    const rows = products.map((p) => [
      p.name,
      p.sku,
      p.category,
      p.quantity.toString(),
      `₦${p.cost.toFixed(2)}`,
      `₦${p.price.toFixed(2)}`,
      p.reorderLevel.toString(),
      `₦${(p.quantity * p.cost).toFixed(2)}`,
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printInventory = () => window.print();

  // ---------- Calculations ----------
  const lowStockProducts = products.filter(
    (p) => p.quantity <= p.reorderLevel
  );
  const totalInventoryValue = products.reduce(
    (s, p) => s + p.quantity * p.cost,
    0
  );

  // ---------- Table columns ----------
  const tableColumns = [
    { key: "name", label: "Name", searchable: true },
    { key: "sku", label: "SKU", searchable: true },
    { key: "category", label: "Category", searchable: true },
    {
      key: "quantity",
      label: "Quantity",
      render: (value: number, row: any) => (
        <span
          className={`inline-block px-2 py-1 rounded text-sm font-medium ${
            value <= row.reorderLevel
              ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
              : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: "cost",
      label: "Cost",
      render: (v: number) => `₦${v.toFixed(2)}`,
    },
    {
      key: "price",
      label: "Price",
      render: (v: number) => `₦${v.toFixed(2)}`,
    },
    {
      key: "id",
      label: "Actions",
      render: (id: string, row: any) => (
        <div className="flex gap-1">
          {(user?.role === "admin" || user?.role === "manager") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row)}
            >
              <Edit2 className="w-4 h-4 text-blue-600" />
            </Button>
          )}
          {(user?.role === "admin" || user?.role === "manager") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(id)}
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // ---------- Loading / Auth guard ----------
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading…
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Sidebar />

      <main className="md:ml-64 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>

          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              Inventory Management
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage products and stock levels efficiently
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={downloadInventoryAsCSV}
              className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              onClick={printInventory}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>

          {(user?.role === "admin" || user?.role === "manager") && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      name: "",
                      sku: "",
                      quantity: 0,
                      reorderLevel: 0,
                      price: 0,
                      cost: 0,
                      category: "",
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Edit Product" : "Add New Product"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Product Name</Label>
                    <Input
                      placeholder="e.g., Laptop"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label>SKU</Label>
                    <Input
                      placeholder="e.g., LAP-001"
                      value={form.sku}
                      onChange={(e) =>
                        setForm({ ...form, sku: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={form.quantity}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            quantity: Number(e.target.value) || 0,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Reorder Level</Label>
                      <Input
                        type="number"
                        value={form.reorderLevel}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            reorderLevel: Number(e.target.value) || 0,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.cost}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            cost: Number(e.target.value) || 0,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.price}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            price: Number(e.target.value) || 0,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Input
                      placeholder="e.g., Electronics"
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    {editingId ? "Update Product" : "Add Product"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-bold text-slate-900 dark:text-white">
                  {products.length}
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                Active items in inventory
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-bold text-red-600 dark:text-red-400">
                  {lowStockProducts.length}
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                Items below reorder level
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Inventory Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                  ₦{totalInventoryValue.toFixed(0)}
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                Total cost of stock
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="mb-12 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                Low Stock Alert
              </CardTitle>
              <CardDescription className="text-red-600 dark:text-red-400">
                The following items are below reorder level and need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 bg-white/70 dark:bg-slate-800/70 rounded-lg border border-red-100 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {p.name}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Current stock:{" "}
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {p.quantity}
                        </span>{" "}
                        | Reorder level:{" "}
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          {p.reorderLevel}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                        Restock Needed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Products Table */}
        <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <Package className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              All Products
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
              Total products:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {products.length}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={tableColumns}
              data={products}
              itemsPerPage={10}
              searchPlaceholder="Search by name, SKU, or category..."
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}