import { useAuth } from "@/ctx/AuthContext";
import { supabase } from "@/utils/supabase";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";
import { toast } from "sonner-native";

const createSessionFromUrl = async (url: string) => {
  // Supabase can return tokens in either query params (?) or hash fragments (#)
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  let access_token: string | undefined = params.access_token;
  let refresh_token: string | undefined = params.refresh_token;

  // If tokens weren't found in query params, try parsing from hash fragment
  if (!access_token && url.includes("#")) {
    const hash = url.split("#")[1];
    const hashParams = new URLSearchParams(hash);
    access_token = hashParams.get("access_token") ?? undefined;
    refresh_token = hashParams.get("refresh_token") ?? undefined;
  }

  if (!access_token) {
    return;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token || "",
  });

  if (error) {
    throw error;
  }

  return data.session;
};

export const useDeepLinking = () => {
  const { session, loading } = useAuth();
  const url = Linking.useLinkingURL();
  const processedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Only try to create a session from URL if we're not loading and don't have a session already.
    // Also, don't try if we've already attempted to process this specific URL.
    // This prevents "Auth session missing!" errors when reloading or signing out,
    // as Linking.useLinkingURL() will still return the last used magic link URL.
    if (url && !loading && !session && url !== processedUrlRef.current) {
      processedUrlRef.current = url;

      createSessionFromUrl(url)
        .then((session) => {
          if (session) {
            console.log("Session created from deep link");
          }
        })
        .catch((error) => {
          // If it's a "Auth session missing!" error, it means the token was already used
          // or is invalid. Since useLinkingURL() persists the last URL even after
          // reload or sign-out, this error is expected and can be ignored.
          if (
            error.name === "AuthSessionMissingError" ||
            error.message?.includes("Auth session missing")
          ) {
            return;
          }
          console.error("Error creating session from URL:", error);
          toast.error("Failed to sign in. Please try again.");
        });
    }
  }, [url, session, loading]);
};
