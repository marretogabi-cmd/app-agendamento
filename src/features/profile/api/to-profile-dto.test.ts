import { describe, expect, it } from "vitest";
import { toProfileDto } from "./to-profile-dto";

describe("toProfileDto", () => {
  it("keeps only the public profile fields", () => {
    const dto = toProfileDto({
      id: "profile-1",
      name: "Luciane",
      publicSlug: "luciane-nails",
      phone: "11999999999",
      updatedAt: "2026-09-14T12:00:00.000Z",
      email: "prestador@salao.com",
      role: "admin",
    } as never);

    expect(dto).toEqual({
      id: "profile-1",
      name: "Luciane",
      publicSlug: "luciane-nails",
      phone: "11999999999",
      updatedAt: "2026-09-14T12:00:00.000Z",
    });
    expect(Object.keys(dto).sort()).toEqual([
      "id",
      "name",
      "phone",
      "publicSlug",
      "updatedAt",
    ]);
  });
});
