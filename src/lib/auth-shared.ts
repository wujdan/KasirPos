export type SessionRole = "OWNER" | "ADMIN" | "CASHIER";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: SessionRole;
};

export function isManager(role: SessionRole) {
  return role === "OWNER" || role === "ADMIN";
}

export const roleLabel: Record<SessionRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  CASHIER: "Kasir",
};
