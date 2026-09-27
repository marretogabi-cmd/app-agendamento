import type { ProfileDto } from "../types";

export function toProfileDto(data: ProfileDto): ProfileDto {
  return {
    id: data.id,
    name: data.name,
    publicSlug: data.publicSlug,
    phone: data.phone,
    timezone: data.timezone,
    updatedAt: data.updatedAt,
  };
}
