import type { Session, User } from "@supabase/supabase-js";

export type PasswordCredentials = {
  email: string;
  password: string;
};

export type RegistrationCredentials = PasswordCredentials;

export type RegistrationResult =
  | {
      status: "authenticated";
      session: Session;
    }
  | {
      status: "confirmation_required";
      session: null;
    };

export type OAuthProvider = "google" | "github";

export type AuthSessionState = {
  status: "pending" | "authenticated" | "unauthenticated";
  session: Session | null;
  user: User | null;
};
