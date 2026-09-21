export type OverrideDto = {
  id: string;
  start: string;
  end: string;
  isAvailable: boolean;
};

export type CreateOverrideInput = {
  start: string;
  end: string;
  isAvailable: boolean;
};

export type UpdateOverrideInput = {
  id: string;
  start?: string;
  end?: string;
  isAvailable?: boolean;
};
