import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const categories = [
  { name: "Makanan" },
  { name: "Minuman" },
  { name: "Snack" },
  { name: "Sembako" },
];

const products = [
  { sku: "MKN-001", barcode: "8990001000011", name: "Nasi Goreng Spesial", category: "Makanan", price: 25000, cost: 15000, stock: 40, minStock: 5 },
  { sku: "MKN-002", barcode: "8990001000028", name: "Mie Goreng", category: "Makanan", price: 22000, cost: 13000, stock: 35, minStock: 5 },
  { sku: "MKN-003", barcode: "8990001000035", name: "Ayam Geprek", category: "Makanan", price: 20000, cost: 12000, stock: 30, minStock: 5 },
  { sku: "MNM-001", barcode: "8990002000010", name: "Es Teh Manis", category: "Minuman", price: 5000, cost: 2000, stock: 100, minStock: 10 },
  { sku: "MNM-002", barcode: "8990002000027", name: "Es Jeruk", category: "Minuman", price: 8000, cost: 3500, stock: 80, minStock: 10 },
  { sku: "MNM-003", barcode: "8990002000034", name: "Kopi Susu", category: "Minuman", price: 15000, cost: 7000, stock: 60, minStock: 10 },
  { sku: "MNM-004", barcode: "8990002000041", name: "Air Mineral 600ml", category: "Minuman", price: 4000, cost: 2500, stock: 120, minStock: 24 },
  { sku: "SNK-001", barcode: "8990003000019", name: "Keripik Singkong", category: "Snack", price: 10000, cost: 6000, stock: 50, minStock: 8 },
  { sku: "SNK-002", barcode: "8990003000026", name: "Cokelat Batang", category: "Snack", price: 12000, cost: 8000, stock: 45, minStock: 8 },
  { sku: "SNK-003", barcode: "8990003000033", name: "Biskuit Kaleng", category: "Snack", price: 9000, cost: 5500, stock: 25, minStock: 6 },
  { sku: "SBK-001", barcode: "8990004000018", name: "Beras Premium 5kg", category: "Sembako", price: 75000, cost: 65000, stock: 20, minStock: 5 },
  { sku: "SBK-002", barcode: "8990004000025", name: "Minyak Goreng 1L", category: "Sembako", price: 18000, cost: 15000, stock: 30, minStock: 6 },
  { sku: "SBK-003", barcode: "8990004000032", name: "Gula Pasir 1kg", category: "Sembako", price: 16000, cost: 13500, stock: 3, minStock: 5 },
  { sku: "SBK-004", barcode: "8990004000049", name: "Telur Ayam 1kg", category: "Sembako", price: 28000, cost: 24000, stock: 4, minStock: 5 },
];

async function main() {
  const storeCount = await prisma.store.count();
  if (storeCount === 0) {
    await prisma.store.create({
      data: {
        name: "JualIn POS",
        address: "Jl. Merdeka No. 10, Jakarta",
        phone: "0812-3456-7890",
        taxPercent: 0,
        receiptFooter: "Terima kasih telah berbelanja di JualIn POS",
      },
    });
  }

  const demoEnabled = process.env.SEED_DEMO_USERS === "true";
  const demoPasswords = [
    process.env.DEMO_OWNER_PASSWORD,
    process.env.DEMO_ADMIN_PASSWORD,
    process.env.DEMO_CASHIER_PASSWORD,
  ];
  if (demoEnabled && demoPasswords.some((password) => !password || password.length < 10)) {
    throw new Error("Demo seeding requires separate demo passwords of at least 10 characters.");
  }
  const users = demoEnabled ? [
    { name: "Owner JualIn", email: "owner@jualin.id", password: demoPasswords[0]!, role: "OWNER" as const },
    { name: "Admin Toko", email: "admin@jualin.id", password: demoPasswords[1]!, role: "ADMIN" as const },
    { name: "Kasir Satu", email: "kasir@jualin.id", password: demoPasswords[2]!, role: "CASHIER" as const },
  ] : [];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        passwordHash: bcrypt.hashSync(user.password, 10),
        role: user.role,
      },
    });
  }

  const categoryMap = new Map<string, number>();
  for (const category of categories) {
    const record = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
    categoryMap.set(record.name, record.id);
  }

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: {
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        categoryId: categoryMap.get(product.category) ?? null,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        minStock: product.minStock,
      },
    });
  }

  console.log(`Seed selesai: toko, ${users.length} akun demo, 4 kategori, 14 produk.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
