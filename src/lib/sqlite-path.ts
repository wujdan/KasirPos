import path from "node:path";

export function sqliteDatabasePath() {
  const connection = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!connection.startsWith("file:")) throw new Error("Operasi backup hanya mendukung URL berkas SQLite.");
  const rawPath = decodeURIComponent(connection.slice("file:".length).split("?")[0]);
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), rawPath);
}
