import { serveFunction } from "../_shared/router.ts";

Deno.serve((request) => serveFunction("book-appointment", request));
