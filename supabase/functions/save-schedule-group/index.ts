import { serveFunction } from "../_shared/router.ts";

Deno.serve((request) => serveFunction("save-schedule-group", request));
