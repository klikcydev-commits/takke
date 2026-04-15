import { AuthContext, Profile } from "@/ctx/AuthContext";
import { fetchCustomerProfile } from "@/utils/marketplaceAuth";
import { supabase } from "@/utils/supabase";
import { Session } from "@supabase/supabase-js";
import { PropsWithChildren, useEffect, useState } from "react";

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const premiumExpiresAt: string | null = profile?.premium_expires_at ?? null;
  const isPremium =
    !!profile?.is_premium &&
    (!premiumExpiresAt || new Date(premiumExpiresAt) > new Date());

  const isAdmin = profile?.is_admin === true;

  const loadProfile = async (s: Session | null) => {
    if (!s?.access_token) {
      setProfile(null);
      return;
    }

    try {
      const data = await fetchCustomerProfile(s.access_token);
      setProfile(data);
    } catch {
      // Degraded mode: allow app use if vendor API is unreachable; skip onboarding block.
      const email = s.user.email ?? "";
      const local = email.split("@")[0] ?? "User";
      setProfile({
        id: s.user.id,
        full_name:
          (typeof s.user.user_metadata?.full_name === "string"
            ? s.user.user_metadata.full_name
            : null) ?? local,
        avatar_url: null,
        phone: null,
        role: "buyer",
        onboarding_completed: true,
        is_premium: false,
        premium_expires_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_admin: false,
      });
    }
  };

  const refreshProfile = () => loadProfile(session);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const initialSession = data.session ?? null;
      setSession(initialSession);
      await loadProfile(initialSession);
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setLoading(true);
      setSession(newSession);
      loadProfile(newSession).finally(() => setLoading(false));
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        isAdmin,
        isPremium,
        premiumExpiresAt,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
