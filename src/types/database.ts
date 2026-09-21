/**
 * Espelho de docs/schema.prisma para o TypeScript.
 * Não representa autorização para consultar o banco a partir do web.
 */

export type AppointmentStatus = "CONFIRMED" | "CANCELLED";

export type ProfileRow = {
  id: string;
  name: string;
  publicSlug: string;
  phone: string | null;
  updatedAt: string;
};

export type AvailabilityRuleGroupRow = {
  id: string;
  providerId: string;
  name: string;
  isActive: boolean;
};

export type AvailabilityRuleRow = {
  id: string;
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type AvailabilityOverrideRow = {
  id: string;
  providerId: string;
  startDatetime: string;
  endDatetime: string;
  isAvailable: boolean;
};

export type AppointmentRow = {
  id: string;
  providerId: string;
  clientId: string;
  startDatetime: string;
  endDatetime: string;
  status: AppointmentStatus;
  cancellationToken: string;
};
