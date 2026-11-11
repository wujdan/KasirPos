export type PosProduct = {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  stock: number;
  categoryId: number | null;
  categoryName: string | null;
};

export type PosCartItem = {
  productId: number;
  name: string;
  sku: string;
  price: number;
  qty: number;
  discount: number;
  stock: number;
};

export type SaleResult =
  | { ok: true; saleId: number; invoiceNo: string; total: number; change: number }
  | { ok: false; error: string };

export type CreateSaleInput = {
  items: { productId: number; qty: number; discount: number }[];
  discount: number;
  paymentMethod: "CASH" | "NON_CASH";
  paid: number;
  note?: string;
  customerId?: number | null;
};

export type PaymentMethodValue = CreateSaleInput["paymentMethod"];
