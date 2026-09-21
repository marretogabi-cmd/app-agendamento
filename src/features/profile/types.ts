export type ProfileDto = {
  id: string;
  name: string;
  publicSlug: string;
  phone: string | null;
  updatedAt: string;
};

export type UpdateProfileInput = {
  name?: string;
  publicSlug?: string;
  phone?: string | null;
};
