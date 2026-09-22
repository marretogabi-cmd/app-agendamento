// deno-lint-ignore no-import-prefix
import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2.116.0";

export type ApiErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "IDEMPOTENT"
  | "UNAVAILABLE"
  | "INTERNAL";

export type JsonRecord = Record<string, unknown>;

export type RequestContext = {
  request: Request;
  requestId: string;
  input: JsonRecord;
  admin: SupabaseClient;
  user: User | null;
  userClient: SupabaseClient | null;
};

export type RouteAuth = "public" | "provider" | "worker";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export type RouteDefinition = {
  method: "GET" | "POST" | "PATCH";
  auth: RouteAuth;
  handler: (context: RequestContext) => Promise<unknown> | unknown;
};
