export const conflictFixture = {
  ok: false as const,
  error: {
    code: "CONFLICT" as const,
    message: "Horário indisponível. Atualize a agenda.",
    requestId: "fixture-409",
  },
};

export const notFoundFixture = {
  ok: false as const,
  error: {
    code: "NOT_FOUND" as const,
    message: "Recurso não encontrado.",
    requestId: "fixture-404",
  },
};

export const successAvailabilityFixture = {
  ok: true as const,
  data: {
    slug: "salao-nails",
    date: "2026-09-15",
    timezone: "America/Sao_Paulo",
    slots: [
      { start: "2026-09-15T12:00:00.000Z", end: "2026-09-15T12:30:00.000Z" },
    ],
  },
  requestId: "fixture-200",
};
