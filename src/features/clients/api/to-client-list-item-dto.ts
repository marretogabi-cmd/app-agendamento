import type { ClientListItemDto } from "../types";

export function toClientListItemDto(
  data: ClientListItemDto,
): ClientListItemDto {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
  };
}
