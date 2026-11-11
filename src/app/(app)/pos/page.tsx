import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PosClient } from "./pos-client";

export const metadata = { title: "Kasir - JualIn POS" };

export default async function PosPage() {
  const user = await requireUser();

  const [products, categories, store, shift, customers] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: { category: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.store.findFirst(),
    prisma.cashShift.findFirst({ where: { userId: user.id, status: "OPEN" }, orderBy: { openedAt: "desc" }, select: { id: true } }),
    prisma.customer.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true }, take: 500 }),
  ]);

  return (
    <PosClient
      cashier={{ id: user.id, name: user.name }}
      hasOpenShift={Boolean(shift)}
      customers={customers}
      taxPercent={store?.taxPercent ?? 0}
      storeName={store?.name ?? "JualIn POS"}
      categories={categories}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: product.price,
        stock: product.stock,
        categoryId: product.categoryId,
        categoryName: product.category?.name ?? null,
      }))}
    />
  );
}
