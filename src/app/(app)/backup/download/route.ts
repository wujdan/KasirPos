import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import Database from "better-sqlite3";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sqliteDatabasePath } from "@/lib/sqlite-path";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSession();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role !== "OWNER") return new Response("Forbidden", { status: 403 });

  const backupPath = path.join(tmpdir(), `jualin-${randomUUID()}.db`);
  let database: Database.Database | undefined;
  try {
    database = new Database(sqliteDatabasePath(), { readonly: true, fileMustExist: true });
    await database.backup(backupPath);
    database.close();
    database = undefined;
    const check = new Database(backupPath, { readonly: true, fileMustExist: true });
    const integrity = check.pragma("integrity_check", { simple: true });
    check.close();
    if (integrity !== "ok") throw new Error("SQLite backup integrity validation failed.");
    await prisma.auditLog.create({ data: { userId: user.id, action: "DOWNLOAD", entity: "DATABASE_BACKUP" } });
    const file = createReadStream(backupPath);
    file.once("close", () => { void rm(backupPath, { force: true }); });
    file.once("error", () => { void rm(backupPath, { force: true }); });
    return new Response(Readable.toWeb(file) as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="jualin-backup-${new Date().toISOString().slice(0, 10)}.db"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    if (database?.open) database.close();
    await rm(backupPath, { force: true });
    return new Response("Backup gagal dibuat atau tidak lolos pemeriksaan integritas.", { status: 500 });
  }
}
