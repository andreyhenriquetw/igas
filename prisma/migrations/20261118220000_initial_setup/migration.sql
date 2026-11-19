CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER');
CREATE TYPE "EntryKind" AS ENUM ('BOOKING', 'BLOCK');
CREATE TYPE "EntryStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'BLOCKED');
CREATE TYPE "ContractStatus" AS ENUM ('PENDING', 'GENERATED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'MANAGER',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReservationMode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "defaultStart" VARCHAR(5) NOT NULL DEFAULT '08:00',
  "durationMinutes" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ReservationMode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReservationMode_durationMinutes_check" CHECK ("durationMinutes" > 0),
  CONSTRAINT "ReservationMode_defaultStart_check" CHECK ("defaultStart" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

CREATE TABLE "CalendarEntry" (
  "id" TEXT NOT NULL,
  "kind" "EntryKind" NOT NULL DEFAULT 'BOOKING',
  "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
  "guestName" TEXT,
  "guestContact" TEXT,
  "modeId" TEXT,
  "startsAt" TIMESTAMPTZ(3) NOT NULL,
  "endsAt" TIMESTAMPTZ(3) NOT NULL,
  "totalAmount" DECIMAL(10,2),
  "paidAmount" DECIMAL(10,2),
  "contractStatus" "ContractStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarEntry_valid_period_check" CHECK ("startsAt" < "endsAt"),
  CONSTRAINT "CalendarEntry_kind_fields_check" CHECK (
    ("kind" = 'BOOKING' AND "guestName" IS NOT NULL AND "modeId" IS NOT NULL
      AND "totalAmount" IS NOT NULL AND "paidAmount" IS NOT NULL)
    OR
    ("kind" = 'BLOCK' AND "modeId" IS NULL AND "totalAmount" IS NULL
      AND "paidAmount" IS NULL)
  ),
  CONSTRAINT "CalendarEntry_payment_check" CHECK (
    "totalAmount" IS NULL OR ("totalAmount" > 0 AND "paidAmount" >= 0 AND "paidAmount" <= "totalAmount")
  ),
  CONSTRAINT "CalendarEntry_no_active_overlap" EXCLUDE USING gist (
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  ) WHERE ("status" IN ('PENDING', 'CONFIRMED', 'BLOCKED'))
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "ReservationMode_code_key" ON "ReservationMode"("code");
CREATE INDEX "CalendarEntry_startsAt_endsAt_idx" ON "CalendarEntry"("startsAt", "endsAt");
CREATE INDEX "CalendarEntry_status_startsAt_idx" ON "CalendarEntry"("status", "startsAt");

ALTER TABLE "CalendarEntry"
  ADD CONSTRAINT "CalendarEntry_modeId_fkey"
  FOREIGN KEY ("modeId") REFERENCES "ReservationMode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalendarEntry"
  ADD CONSTRAINT "CalendarEntry_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ReservationMode" ("id", "code", "name", "defaultStart", "durationMinutes")
VALUES
  ('mode-day-use', 'DAY_USE', 'Day-use', '08:00', 720),
  ('mode-overnight', 'OVERNIGHT', 'Day-use com pernoite', '08:00', 2160);
