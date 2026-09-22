import { serveFunction } from "../_shared/router.ts";

Deno.serve((request) => serveFunction("process-email-outbox", request));
