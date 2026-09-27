export type ProfileDto = {
  id: string;
  name: string;
  publicSlug: string;
  phone: string | null;
  timezone: BrazilianTimezone;
  updatedAt: string;
};

export type BrazilianTimezone =
  | "America/Noronha"
  | "America/Sao_Paulo"
  | "America/Manaus"
  | "America/Rio_Branco";

export type UpdateProfileInput = {
  name?: string;
  publicSlug?: string;
  phone?: string | null;
  timezone?: BrazilianTimezone;
};
