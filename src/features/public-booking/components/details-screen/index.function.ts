import type { BookingClientInput } from "@/features/booking";

export type ClientField = keyof BookingClientInput;
export type ClientFieldErrors = Partial<Record<ClientField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateBookingClient(values: BookingClientInput): {
  data?: BookingClientInput;
  errors: ClientFieldErrors;
} {
  const data = {
    name: values.name.trim().replace(/\s+/g, " "),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
  };
  const errors: ClientFieldErrors = {};

  if (data.name.length < 3 || data.name.split(" ").length < 2) {
    errors.name = "Informe seu nome completo.";
  } else if (data.name.length > 120) {
    errors.name = "O nome deve ter no máximo 120 caracteres.";
  }

  if (!EMAIL_PATTERN.test(data.email)) {
    errors.email = "Informe um e-mail válido.";
  }

  const phoneDigits = data.phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = "Informe um telefone válido, incluindo o DDD.";
  }

  return Object.keys(errors).length > 0 ? { errors } : { data, errors };
}
