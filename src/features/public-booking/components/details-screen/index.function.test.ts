import { describe, expect, it } from "vitest";
import { validateBookingClient } from "./index.function";

describe("validateBookingClient", () => {
  it("normalizes a valid client", () => {
    const result = validateBookingClient({
      name: "  Ana   Souza ",
      email: " ANA@EXAMPLE.COM ",
      phone: "(11) 99999-9999",
    });

    expect(result.errors).toEqual({});
    expect(result.data).toEqual({
      name: "Ana Souza",
      email: "ana@example.com",
      phone: "(11) 99999-9999",
    });
  });

  it("rejects incomplete name, email and phone", () => {
    const result = validateBookingClient({
      name: "Ana",
      email: "ana",
      phone: "123",
    });

    expect(result.data).toBeUndefined();
    expect(result.errors).toEqual({
      name: "Informe seu nome completo.",
      email: "Informe um e-mail válido.",
      phone: "Informe um telefone válido, incluindo o DDD.",
    });
  });
});
