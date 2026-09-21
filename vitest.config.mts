import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/env/**/*.ts",
        "src/lib/api/**/*.ts",
        "src/lib/supabase/proxy.ts",
        "src/hooks/**/*.ts",
        "src/types/api.ts",
        "src/features/auth/**/*.ts",
        "src/features/availability/**/*.ts",
        "src/features/booking/**/*.ts",
        "src/features/cancellation/**/*.ts",
        "src/features/profile/**/*.ts",
        "src/features/schedule-rules/**/*.ts",
        "src/features/overrides/**/*.ts",
        "src/features/agenda/**/*.ts",
        "src/features/clients/**/*.ts",
        "src/features/provider-cancellation/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/index.ts",
        "src/features/auth/types.ts",
        "src/features/availability/types.ts",
        "src/features/booking/types.ts",
        "src/features/cancellation/types.ts",
        "src/features/profile/types.ts",
        "src/features/schedule-rules/types.ts",
        "src/features/overrides/types.ts",
        "src/features/agenda/types.ts",
        "src/features/clients/types.ts",
        "src/features/provider-cancellation/types.ts",
        "src/lib/api/fixtures.ts",
      ],
      reporter: ["text", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
