ALTER TABLE "CalendarEntry"
  ADD COLUMN "contractRevision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "contractAcceptanceExpiresAt" TIMESTAMPTZ(3),
  ADD COLUMN "contractAcceptedAt" TIMESTAMPTZ(3),
  ADD COLUMN "contractAcceptedName" VARCHAR(120);

CREATE TABLE "ContractAcceptance" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "contractRevision" INTEGER NOT NULL,
  "contractText" TEXT NOT NULL,
  "guestName" VARCHAR(120) NOT NULL,
  "guestCpf" VARCHAR(14) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "acceptedAt" TIMESTAMPTZ(3),
  "acceptedName" VARCHAR(120),
  "acceptedCpf" VARCHAR(14),
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractAcceptance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContractAcceptance_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CalendarEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ContractAcceptance_tokenHash_key" ON "ContractAcceptance"("tokenHash");
CREATE INDEX "ContractAcceptance_entryId_contractRevision_createdAt_idx" ON "ContractAcceptance"("entryId", "contractRevision", "createdAt");
