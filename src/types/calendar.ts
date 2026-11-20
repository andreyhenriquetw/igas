export type EntryStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "BLOCKED";
export type EntryKind = "BOOKING" | "BLOCK";
export type ContractStatus = "PENDING" | "GENERATED";
export type ContractAcceptanceStatus = "NONE" | "PENDING" | "ACCEPTED" | "EXPIRED";

export type ReservationModeDto = {
  id: string;
  code: string;
  name: string;
  defaultStart: string;
  durationMinutes: number;
  active: boolean;
};

export type CalendarEntryDto = {
  id: string;
  kind: EntryKind;
  status: EntryStatus;
  guestName: string | null;
  guestContact: string | null;
  guestCpf: string | null;
  guestAddress: string | null;
  modeId: string | null;
  startsAt: string;
  endsAt: string;
  totalAmount: number | null;
  paidAmount: number | null;
  contractStatus: ContractStatus;
  contractAcceptanceStatus: ContractAcceptanceStatus;
  contractAcceptanceExpiresAt: string | null;
  landlordAcceptedAt: string | null;
  contractAcceptedAt: string | null;
  contractAcceptedName: string | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  mode: ReservationModeDto | null;
};

export type TeamMemberDto = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER";
  createdAt: string;
};
