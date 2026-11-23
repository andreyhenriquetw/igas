ALTER TABLE "CalendarEntry"
  DROP CONSTRAINT "CalendarEntry_kind_fields_check";

ALTER TABLE "CalendarEntry"
  ADD CONSTRAINT "CalendarEntry_kind_fields_check" CHECK (
    (
      "kind" = 'BOOKING'
      AND "guestName" IS NOT NULL
      AND "modeId" IS NOT NULL
      AND (
        ("totalAmount" IS NOT NULL AND "paidAmount" IS NOT NULL)
        OR
        ("totalAmount" IS NULL AND "paidAmount" IS NULL)
      )
    )
    OR
    (
      "kind" = 'BLOCK'
      AND "modeId" IS NULL
      AND "totalAmount" IS NULL
      AND "paidAmount" IS NULL
    )
  );
