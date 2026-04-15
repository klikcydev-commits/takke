"use server";

import {
  formatSupabaseAuthError,
  getSupabaseAuthErrorInfo,
  logSupabaseSignup,
} from "@marketplace/shared-supabase";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export type VendorRegisterState = { error?: string } | null;

export async function registerVendorStoreAction(
  _prev: VendorRegisterState,
  formData: FormData,
): Promise<VendorRegisterState> {
  logSupabaseSignup("vendor-register-server", "start");

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const storeName = (formData.get("storeName") as string)?.trim();
  const slug = storeName.toLowerCase().replace(/ /g, "-");

  if (!email || !password || !storeName) {
    return { error: "Please fill in all fields." };
  }

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    const info = getSupabaseAuthErrorInfo(authError);
    logSupabaseSignup("vendor-register-server", "error", {
      status: info.status,
      code: info.code,
      message: info.message,
      raw: info.raw,
    });
    return { error: formatSupabaseAuthError(authError) };
  }

  if (!authData.user) {
    logSupabaseSignup("vendor-register-server", "error", { reason: "no_user" });
    return { error: "Could not create account. Please try again." };
  }

  logSupabaseSignup("vendor-register-server", "success", { userId: authData.user.id });

  const { error: storeError } = await supabase.from("stores").insert({
    owner_id: authData.user.id,
    name: storeName,
    slug,
    status: "PENDING",
  });

  if (storeError) {
    console.error(storeError);
    logSupabaseSignup("vendor-register-server", "error", {
      reason: "stores_insert",
      message: storeError.message,
    });
    return { error: "Could not create the store. Please try again." };
  }

  const { data: storeData } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", authData.user.id)
    .single();

  if (storeData) {
    await supabase.from("store_applications").insert({
      store_id: storeData.id,
      status: "PENDING",
    });
  }

  redirect("/vendor/dashboard");
}
