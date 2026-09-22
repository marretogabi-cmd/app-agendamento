import { serveFunction } from "../_shared/router.ts";

Deno.serve((request) =>
  serveFunction("cancel-appointment-as-provider", request)
);
