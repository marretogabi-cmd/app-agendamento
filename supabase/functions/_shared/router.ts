import { processEmailOutbox } from "./email-worker.ts";
import { handleRoute } from "./http.ts";
import {
  bookAppointment,
  cancelAppointment,
  cancelAppointmentAsProvider,
  createGroup,
  createOverride,
  createRule,
  deleteGroup,
  deleteOverride,
  deleteRule,
  getAvailability,
  getCancellation,
  getDailyAgenda,
  getProfile,
  listClients,
  listGroups,
  listOverrides,
  listRules,
  setGroupActive,
  updateGroup,
  updateOverride,
  updateProfile,
  updateRule,
} from "./handlers.ts";
import type { RouteDefinition } from "./types.ts";

const routes: Record<string, RouteDefinition & { successStatus?: number }> = {
  health: {
    method: "GET",
    auth: "public",
    handler: () => ({ status: "ok" }),
  },
  "get-availability": {
    method: "GET",
    auth: "public",
    handler: getAvailability,
  },
  "book-appointment": {
    method: "POST",
    auth: "public",
    handler: bookAppointment,
    successStatus: 201,
  },
  "get-cancellation": {
    method: "GET",
    auth: "public",
    handler: getCancellation,
  },
  "cancel-appointment": {
    method: "POST",
    auth: "public",
    handler: cancelAppointment,
  },
  "get-profile": { method: "GET", auth: "provider", handler: getProfile },
  "update-profile": {
    method: "PATCH",
    auth: "provider",
    handler: updateProfile,
  },
  "list-groups": { method: "GET", auth: "provider", handler: listGroups },
  "create-group": {
    method: "POST",
    auth: "provider",
    handler: createGroup,
    successStatus: 201,
  },
  "update-group": { method: "PATCH", auth: "provider", handler: updateGroup },
  "delete-group": { method: "POST", auth: "provider", handler: deleteGroup },
  "set-group-active": {
    method: "POST",
    auth: "provider",
    handler: setGroupActive,
  },
  "list-rules": { method: "GET", auth: "provider", handler: listRules },
  "create-rule": {
    method: "POST",
    auth: "provider",
    handler: createRule,
    successStatus: 201,
  },
  "update-rule": { method: "PATCH", auth: "provider", handler: updateRule },
  "delete-rule": { method: "POST", auth: "provider", handler: deleteRule },
  "list-overrides": { method: "GET", auth: "provider", handler: listOverrides },
  "create-override": {
    method: "POST",
    auth: "provider",
    handler: createOverride,
    successStatus: 201,
  },
  "update-override": {
    method: "PATCH",
    auth: "provider",
    handler: updateOverride,
  },
  "delete-override": {
    method: "POST",
    auth: "provider",
    handler: deleteOverride,
  },
  "get-daily-agenda": {
    method: "GET",
    auth: "provider",
    handler: getDailyAgenda,
  },
  "list-clients": { method: "GET", auth: "provider", handler: listClients },
  "cancel-appointment-as-provider": {
    method: "POST",
    auth: "provider",
    handler: cancelAppointmentAsProvider,
  },
  "process-email-outbox": {
    method: "POST",
    auth: "worker",
    handler: processEmailOutbox,
  },
};

export function serveFunction(
  name: string,
  request: Request,
): Promise<Response> {
  const route = routes[name];
  if (!route) throw new Error(`Unknown function: ${name}`);
  return handleRoute(request, route, route.successStatus);
}
