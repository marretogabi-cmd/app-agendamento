import { serveFunction } from "../_shared/router.ts";

Deno.serve((request) => serveFunction("get-availability", request));
