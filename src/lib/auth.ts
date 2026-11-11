import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { existsSync } from "node:fs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth-shared";
import { sqliteDatabasePath } from "@/lib/sqlite-path";

export { isManager, roleLabel } from "@/lib/auth-shared";
export type { SessionRole, SessionUser } from "@/lib/auth-shared";

export const SESSION_COOKIE = "jualin_session";

export function isRestoreInProgress() {
  try { return existsSync(`${sqliteDatabasePath()}.restore.lock`); } catch { return true; }
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  if (isRestoreInProgress()) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = Number(payload.sub);
    if (!Number.isFinite(id) || !payload.role) return null;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    if (!user?.active) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireManager(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "CASHIER") redirect("/pos");
  return user;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

