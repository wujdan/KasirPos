ALTER TABLE "PurchaseItem" ADD COLUMN "receivedQty" INTEGER NOT NULL DEFAULT 0;

UPDATE "PurchaseItem"
SET "receivedQty" = "qty"
WHERE "purchaseId" IN (
    SELECT "id" FROM "Purchase" WHERE "status" = 'RECEIVED'
);
