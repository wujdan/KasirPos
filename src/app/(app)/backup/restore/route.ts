import { randomUUID } from "node:crypto";
import { mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sqliteDatabasePath } from "@/lib/sqlite-path";

export const runtime = "nodejs";

function validateBackup(filePath: string) {
  const check = new Database(filePath, { readonly: true, fileMustExist: true });
  try {
    if (check.pragma("integrity_check", { simple: true }) !== "ok") throw new Error("DB_INTEGRITY");
    if ((check.pragma("foreign_key_check") as unknown[]).length) throw new Error("DB_FOREIGN_KEYS");
    const tables = new Set((check.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((row) => row.name));
    const requiredColumns: Record<string, string[]> = {
      "_prisma_migrations": ["migration_name", "finished_at", "rolled_back_at"],
      Store: ["id", "name", "address", "phone", "currency", "taxPercent", "receiptFooter"],
      User: ["id", "name", "email", "passwordHash", "role", "active"],
      Category: ["id", "name"],
      Product: ["id", "sku", "name", "categoryId", "price", "cost", "stock", "minStock", "active"],
      Sale: ["id", "invoiceNo", "userId", "shiftId", "customerId", "subtotal", "discount", "tax", "total", "paid", "change", "paymentMethod", "status"],
      SaleItem: ["id", "saleId", "productId", "productName", "sku", "price", "cost", "qty", "discount", "subtotal"],
      StockMovement: ["id", "productId", "type", "qty", "stockBefore", "stockAfter", "reference", "note", "userId"],
      CashShift: ["id", "userId", "openingCash", "closingCash", "expectedCash", "difference", "status"],
      CashMovement: ["id", "shiftId", "type", "amount", "note"],
      Expense: ["id", "title", "amount", "note"],
      AuditLog: ["id", "userId", "action", "entity", "entityId", "details"],
      Supplier: ["id", "name", "contact", "phone", "address", "active"],
      Purchase: ["id", "number", "supplierId", "userId", "status", "total", "note"],
      PurchaseItem: ["id", "purchaseId", "productId", "qty", "receivedQty", "unitCost", "subtotal"],
      Customer: ["id", "name", "phone", "email", "note", "active"],
      SaleReturn: ["id", "number", "saleId", "userId", "shiftId", "amount", "reason", "note"],
      SaleReturnItem: ["id", "returnId", "saleItemId", "productId", "productName", "sku", "qty", "amount", "restocked"],
    };
    for (const [table, columns] of Object.entries(requiredColumns)) {
      if (!tables.has(table)) throw new Error("DB_SCHEMA");
      const available = new Set((check.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[]).map((column) => column.name));
      if (columns.some((column) => !available.has(column))) throw new Error("DB_SCHEMA");
    }
    const migration = check.prepare('SELECT 1 AS ok FROM "_prisma_migrations" WHERE "migration_name" = ? AND "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL').get("20261110110000_partial_purchase_receipts");
    if (!migration) throw new Error("DB_OLD_SCHEMA");
  } finally {
    check.close();
  }
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return new Response("Sesi tidak valid atau pemulihan sedang berlangsung.", { status: 401 });
  if (user.role !== "OWNER") return new Response("Hanya owner yang dapat memulihkan backup.", { status: 403 });

  const databasePath = sqliteDatabasePath();
  const directory = path.dirname(databasePath);
  const token = randomUUID();
  const stagePath = path.join(directory, `.jualin-restore-${token}.db`);
  const rollbackPath = path.join(directory, `.jualin-rollback-${token}.db`);
  const lockPath = `${databasePath}.restore.lock`;
  let lockFile: Awaited<ReturnType<typeof open>> | undefined;
  let originalMoved = false;
  let replaced = false;
  let failureMessage = "Pemulihan gagal. Database lama masih dipertahankan.";

  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 101 * 1024 * 1024) return new Response("Ukuran permintaan melebihi batas 100 MB.", { status: 413 });
    const form = await request.formData();
    const uploaded = form.get("backup");
    if (!(uploaded instanceof File) || !uploaded.name.toLowerCase().endsWith(".db")) return new Response("Pilih berkas backup SQLite .db.", { status: 400 });
    if (uploaded.size < 100 || uploaded.size > 100 * 1024 * 1024) return new Response("Ukuran backup harus di antara 100 byte dan 100 MB.", { status: 400 });
    if (form.get("confirmation") !== "PULIHKAN") return new Response("Ketik PULIHKAN untuk mengonfirmasi penggantian data.", { status: 400 });
    await mkdir(directory, { recursive: true });
    await writeFile(stagePath, Buffer.from(await uploaded.arrayBuffer()), { flag: "wx" });
    validateBackup(stagePath);

    lockFile = await open(lockPath, "wx");
    const safetyPath = path.join(directory, `jualin-pre-restore-${new Date().toISOString().replaceAll(":", "-")}-${token.slice(0, 8)}.db`);
    const live = new Database(databasePath, { readonly: true, fileMustExist: true });
    try { await live.backup(safetyPath); } finally { live.close(); }
    validateBackup(safetyPath);

    await prisma.$disconnect();
    const checkpoint = new Database(databasePath);
    try { checkpoint.pragma("wal_checkpoint(TRUNCATE)"); } finally { checkpoint.close(); }
    await rm(`${databasePath}-wal`, { force: true });
    await rm(`${databasePath}-shm`, { force: true });
    await rename(databasePath, rollbackPath);
    originalMoved = true;
    await rename(stagePath, databasePath);
    validateBackup(databasePath);
    replaced = true;
    await rm(rollbackPath, { force: true });
    originalMoved = false;
    try {
      await prisma.auditLog.create({ data: { action: "RESTORE", entity: "DATABASE_BACKUP", details: JSON.stringify({ actorId: user.id, safetyBackup: path.basename(safetyPath), sourceFile: uploaded.name }) } });
    } catch {
      // Restore remains successful if the archived database has a different owner account.
    }
    return new Response(`Pemulihan berhasil. Snapshot sebelum pemulihan disimpan sebagai ${path.basename(safetyPath)}. Keluar lalu masuk kembali untuk menyegarkan sesi.`, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "DB_OLD_SCHEMA") failureMessage = "Versi skema backup sudah lama. Terapkan migrasi terbaru sebelum memulihkan backup ini.";
    else if (error instanceof Error && ["DB_INTEGRITY", "DB_FOREIGN_KEYS", "DB_SCHEMA"].includes(error.message)) failureMessage = "Berkas backup rusak atau bukan backup JualIn yang kompatibel.";
    if (originalMoved) {
      try {
        await rm(databasePath, { force: true });
        await rename(rollbackPath, databasePath);
        originalMoved = false;
      } catch { failureMessage = "Pemulihan dan rollback gagal. Database lama tersedia pada berkas rollback di folder database."; }
    }
    if (replaced) return new Response("Data sudah dipulihkan, tetapi pencatatan audit gagal. Keluar lalu masuk kembali.", { headers: { "Cache-Control": "no-store" } });
    return new Response(failureMessage, { status: 500, headers: { "Cache-Control": "no-store" } });
  } finally {
    if (lockFile) {
      await lockFile.close();
      await rm(lockPath, { force: true });
    }
    await rm(stagePath, { force: true });
    if (!originalMoved) await rm(rollbackPath, { force: true });
  }
}
