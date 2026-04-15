"use client";

import { useActionState, useCallback, useRef } from "react";
import { logSupabaseSignup } from "@marketplace/shared-supabase";
import {
  registerVendorStoreAction,
  type VendorRegisterState,
} from "./actions";

export function VendorRegisterForm() {
  const blockRef = useRef(false);

  const wrappedAction = useCallback(
    async (prev: VendorRegisterState, formData: FormData) => {
      if (blockRef.current) {
        logSupabaseSignup("vendor-register", "blocked_duplicate", { reason: "ref_guard" });
        return prev;
      }
      blockRef.current = true;
      try {
        return await registerVendorStoreAction(prev, formData);
      } finally {
        blockRef.current = false;
      }
    },
    [],
  );

  const [state, formAction, isPending] = useActionState(wrappedAction, null);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Store Name</label>
        <input
          name="storeName"
          type="text"
          placeholder="E.g. Sands of Time"
          required
          disabled={isPending}
          className="w-full luxury-input"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email Address</label>
        <input
          name="email"
          type="email"
          placeholder="you@luxury.com"
          required
          disabled={isPending}
          className="w-full luxury-input"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <input
          name="password"
          type="password"
          placeholder="••••••••"
          required
          disabled={isPending}
          className="w-full luxury-input"
        />
      </div>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <button type="submit" disabled={isPending} className="w-full luxury-button mt-4">
        {isPending ? "Creating…" : "Initialize Store"}
      </button>
    </form>
  );
}
