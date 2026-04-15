"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, getSupabaseAccessToken } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export type VendorStorePayload = {
  id: string;
  name: string;
  slug: string;
  status: string;
  description: string | null;
  profile: {
    businessEmail: string | null;
    businessPhone: string | null;
    businessAddress: string | null;
  } | null;
} | null;

const VendorStoreContext = createContext<{
  store: VendorStorePayload;
  loading: boolean;
  error: string | null;
}>({ store: null, loading: true, error: null });

export function VendorStoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<VendorStorePayload>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const token = await getSupabaseAccessToken();
      if (!token) {
        if (!cancelled) {
          setStore(null);
          setError(null);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setLoading(true);
      try {
        const data = await apiFetch<VendorStorePayload>("/stores/me");
        if (!cancelled) {
          setStore(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load store");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <VendorStoreContext.Provider value={{ store, loading, error }}>
      {children}
    </VendorStoreContext.Provider>
  );
}

export function useVendorStore() {
  return useContext(VendorStoreContext);
}
