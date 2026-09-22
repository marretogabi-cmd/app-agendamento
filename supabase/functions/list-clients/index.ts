import { serveFunction } from "../_shared/router.ts";

Deno.serve((request) => serveFunction("list-clients", request));
