import { ApiError, type JsonRecord } from "./types.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validation(field: string, message: string): never {
  throw new ApiError("VALIDATION", 400, "Revise os dados informados.", {
    [field]: [message],
  });
}

export function requiredString(
  input: JsonRecord,
  field: string,
  options: { min?: number; max?: number } = {},
): string {
  const value = input[field];
  if (typeof value !== "string") validation(field, "Campo obrigatório.");
  const trimmed = value.trim();
  if (trimmed.length < (options.min ?? 1)) {
    validation(field, "Valor muito curto.");
  }
  if (trimmed.length > (options.max ?? 500)) {
    validation(field, "Valor muito longo.");
  }
  return trimmed;
}

export function optionalString(
  input: JsonRecord,
  field: string,
  options: { min?: number; max?: number; nullable?: boolean } = {},
): string | null | undefined {
  const value = input[field];
  if (value === undefined) return undefined;
  if (value === null && options.nullable) return null;
  if (typeof value !== "string") validation(field, "Valor inválido.");
  const trimmed = value.trim();
  if (trimmed.length < (options.min ?? 1)) {
    validation(field, "Valor muito curto.");
  }
  if (trimmed.length > (options.max ?? 500)) {
    validation(field, "Valor muito longo.");
  }
  return trimmed;
}

export function requiredBoolean(input: JsonRecord, field: string): boolean {
  const value = input[field];
  if (typeof value !== "boolean") {
    validation(field, "Informe verdadeiro ou falso.");
  }
  return value;
}

export function optionalBoolean(
  input: JsonRecord,
  field: string,
): boolean | undefined {
  const value = input[field];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    validation(field, "Informe verdadeiro ou falso.");
  }
  return value;
}

export function requiredInteger(
  input: JsonRecord,
  field: string,
  min: number,
  max: number,
): number {
  const value = input[field];
  if (
    typeof value !== "number" || !Number.isInteger(value) || value < min ||
    value > max
  ) {
    validation(field, `Informe um inteiro entre ${min} e ${max}.`);
  }
  return value;
}

export function optionalInteger(
  input: JsonRecord,
  field: string,
  min: number,
  max: number,
): number | undefined {
  if (input[field] === undefined) return undefined;
  return requiredInteger(input, field, min, max);
}

export function uuid(input: JsonRecord, field: string): string {
  const value = requiredString(input, field, { max: 36 });
  if (!UUID_PATTERN.test(value)) validation(field, "UUID inválido.");
  return value;
}

export function dateString(input: JsonRecord, field: string): string {
  const value = requiredString(input, field, { max: 10 });
  if (!DATE_PATTERN.test(value)) validation(field, "Use o formato YYYY-MM-DD.");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    validation(field, "Data inválida.");
  }
  return value;
}

export function timeString(input: JsonRecord, field: string): string {
  const value = requiredString(input, field, { max: 8 });
  if (!TIME_PATTERN.test(value)) {
    validation(field, "Use o formato HH:mm ou HH:mm:ss.");
  }
  return value.length === 5 ? `${value}:00` : value;
}

export function isoDateTime(input: JsonRecord, field: string): string {
  const value = requiredString(input, field, { max: 40 });
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf()) || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    validation(field, "Informe data e hora ISO 8601 com fuso.");
  }
  return parsed.toISOString();
}

export function slug(input: JsonRecord, field = "slug"): string {
  const value = requiredString(input, field, { min: 3, max: 80 }).toLowerCase();
  if (!SLUG_PATTERN.test(value)) validation(field, "Slug inválido.");
  return value;
}

export function email(input: JsonRecord, field: string): string {
  const value = requiredString(input, field, { min: 3, max: 254 })
    .toLowerCase();
  if (!EMAIL_PATTERN.test(value)) validation(field, "Email inválido.");
  return value;
}

export function object(input: JsonRecord, field: string): JsonRecord {
  const value = input[field];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    validation(field, "Objeto inválido.");
  }
  return value as JsonRecord;
}

export function assertNonEmptyPatch(values: Record<string, unknown>): void {
  if (Object.values(values).every((value) => value === undefined)) {
    throw new ApiError(
      "VALIDATION",
      400,
      "Informe ao menos um campo para atualizar.",
    );
  }
}

export function assertInterval(start: string, end: string): void {
  if (new Date(start).valueOf() >= new Date(end).valueOf()) {
    validation("end", "O fim deve ser posterior ao início.");
  }
}

export function assertTimeInterval(start: string, end: string): void {
  if (start >= end) {
    validation("endTime", "O fim deve ser posterior ao início.");
  }
}
