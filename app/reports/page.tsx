"use client";

import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { RootState } from "@/lib/store";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Download, Printer, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";

import {
  getProducts,
  getSales,
  getExpenses,
  type Product,
  type Sale,
  type Expense,
} from "./actions";

export default function ReportsPage() {
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );
  const router = useRouter();

  // ---------- Data ----------
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------- Load data ----------
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "admin" && user?.role !== "manager") {
      router.push("/dashboard");
      return;
    }

    (async () => {
      const [p, s, e] = await Promise.all([
        getProducts(),
        getSales(),
        getExpenses(),
      ]);
      setProducts(p);
      setSales(s);
      setExpenses(e);
      setLoading(false);
    })();
  }, [isAuthenticated, user, router]);

  // ---------- Calculations ----------
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + p.quantity * p.cost,
    0
  );

  // Sales by product
  const salesByProduct = products.map((product) => {
    const productSales = sales.filter((s) => s.productId === product.id);
    return {
      name: product.name,
      sales: productSales.length,
      revenue: productSales.reduce((sum, s) => sum + s.total, 0),
    };
  });

  // Expenses by category
  const expenseCategories = [
    "Supplies",
    "Utilities",
    "Rent",
    "Salaries",
    "Marketing",
    "Maintenance",
    "Other",
  ];
  const expensesByCategory = expenseCategories
    .map((cat) => ({
      name: cat,
      value: expenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0),
    }))
    .filter((item) => item.value > 0);

  // Stock status
  const lowStockProducts = products.filter(
    (p) => p.quantity <= p.reorderLevel
  );
  const adequateStockProducts = products.filter(
    (p) => p.quantity > p.reorderLevel
  );

  const COLORS = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
  ];

  // ---------- CSV ----------
  const downloadReportsAsCSV = () => {
    const profitMargin =
      totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";
    const avgPrice =
      products.length > 0
        ? (
            products.reduce((sum, p) => sum + p.price, 0) / products.length
          ).toFixed(2)
        : "0.00";

    const data = [
      ["Metric", "Value"],
      ["Total Revenue", `₦${totalRevenue.toFixed(2)}`],
      ["Total Expenses", `₦${totalExpenses.toFixed(2)}`],
      ["Net Profit", `₦${netProfit.toFixed(2)}`],
      ["Inventory Value", `₦${totalInventoryValue.toFixed(2)}`],
      ["Total Products", products.length.toString()],
      ["Total Sales Transactions", sales.length.toString()],
      ["Low Stock Items", lowStockProducts.length.toString()],
      ["Profit Margin", `${profitMargin}%`],
      ["Average Product Price", `₦${avgPrice}`],
    ];

    const csv = data
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reports_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReports = () => window.print();

  // ---------- Excel ----------
  const downloadReportsAsExcel = () => {
    const profitMargin =
      totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";
    const avgPrice =
      products.length > 0
        ? (
            products.reduce((sum, p) => sum + p.price, 0) / products.length
          ).toFixed(2)
        : "0.00";

    // Summary sheet data
    const summaryData = [
      ["Business Reports Summary"],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["Key Metrics"],
      ["Total Revenue", `₦${totalRevenue.toFixed(2)}`],
      ["Total Expenses", `₦${totalExpenses.toFixed(2)}`],
      ["Net Profit", `₦${netProfit.toFixed(2)}`],
      ["Inventory Value", `₦${totalInventoryValue.toFixed(2)}`],
      ["Total Products", products.length],
      ["Total Sales Transactions", sales.length],
      ["Low Stock Items", lowStockProducts.length],
      ["Profit Margin", `${profitMargin}%`],
      ["Average Product Price", `₦${avgPrice}`],
    ];

    // Sales sheet data
    const salesData = [
      ["Sales Transactions"],
      ["Product ID", "Quantity", "Total Amount"],
      ...sales.map((sale) => [sale.productId, sale.quantity, `₦${sale.total.toFixed(2)}`]),
    ];

    // Products sheet data
    const productsData = [
      ["Products Inventory"],
      ["ID", "Name", "Quantity", "Reorder Level", "Cost", "Price", "Current Value"],
      ...products.map((product) => [
        product.id,
        product.name,
        product.quantity,
        product.reorderLevel,
        `₦${product.cost.toFixed(2)}`,
        `₦${product.price.toFixed(2)}`,
        `₦${(product.quantity * product.cost).toFixed(2)}`,
      ]),
    ];

    // Expenses sheet data
    const expensesData = [
      ["Expenses"],
      ["Category", "Amount"],
      ...expenses.map((expense) => [expense.category, `₦${expense.amount.toFixed(2)}`]),
    ];

    // Sales by Product sheet
    const salesByProductData = [
      ["Sales by Product"],
      ["Product Name", "Number of Sales", "Total Revenue"],
      ...salesByProduct.map((item) => [
        item.name,
        item.sales,
        `₦${item.revenue.toFixed(2)}`,
      ]),
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add sheets
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesData), "Sales");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(productsData), "Products");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expensesData), "Expenses");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesByProductData), "Sales by Product");

    // Generate and download file
    XLSX.writeFile(wb, `business_reports_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // ---------- Loading / Auth guard ----------
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading reports…
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Sidebar />

      <main className="md:ml-64 p-4 md:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              Reports & Analytics
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Business performance and insights
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={downloadReportsAsCSV}
              className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              onClick={downloadReportsAsExcel}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              onClick={printReports}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">
                  ₦{totalRevenue.toFixed(0)}
                </div>
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/50 rounded-full">
                  <TrendingUp className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                From {sales.length} sales
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-bold text-red-600 dark:text-red-400">
                  ₦{totalExpenses.toFixed(0)}
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full">
                  <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                {expenses.length} expense records
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div
                  className={`text-4xl font-bold ${
                    netProfit >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  ₦{netProfit.toFixed(0)}
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <TrendingUp
                    className={`w-6 h-6 ${
                      netProfit >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                Revenue - Expenses
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Inventory Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">
                  ₦{totalInventoryValue.toFixed(0)}
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                  <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium">
                {products.length} products
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Sales by Product */}
          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                Sales by Product
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
                Revenue generated per product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesByProduct}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expenses by Category */}
          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                Expenses by Category
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
                Distribution of business expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) =>
                      `${entry.name}: ₦${(entry.value as number).toFixed(0)}`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensesByCategory.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Stock Status + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                Stock Status Overview
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
                Inventory health check
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Adequate Stock", value: adequateStockProducts.length },
                      { name: "Low Stock", value: lowStockProducts.length },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                Summary Statistics
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
                Key business metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-600/50 transition-colors">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Total Products
                </span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {products.length}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-600/50 transition-colors">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Total Sales Transactions
                </span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {sales.length}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-600/50 transition-colors">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Profit Margin
                </span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalRevenue > 0
                    ? ((netProfit / totalRevenue) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-600/50 transition-colors">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Low Stock Items
                </span>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {lowStockProducts.length}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-600/50 transition-colors">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Average Product Price
                </span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  ₦
                  {products.length > 0
                    ? (
                        products.reduce((sum, p) => sum + p.price, 0) /
                        products.length
                      ).toFixed(2)
                    : "0.00"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}