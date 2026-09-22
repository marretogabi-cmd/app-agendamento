import { serveFunction } from "../_shared/router.ts";

Deno.serve((request) => serveFunction("set-group-active", request));
