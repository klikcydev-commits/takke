import { Session, User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type UserRole = "buyer" | "vendor" | "courier";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  onboarding_completed: boolean;
  is_premium: boolean;
  premium_expires_at: string | null;
  created_at: string;
  updated_at: string;
  /** Set when profile is loaded from `/api/profile/me`. */
  is_admin?: boolean;
}

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isPremium: false,
  premiumExpiresAt: null,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);
