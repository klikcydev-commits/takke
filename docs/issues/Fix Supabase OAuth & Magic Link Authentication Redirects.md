# Fix Supabase OAuth & Magic Link Authentication Redirects

## Problem

The current Google OAuth and Magic Link authentication flows have redirect failures:

1. **Google OAuth**: The `signInWithGoogle` function uses `AuthSession.makeRedirectUri()` which produces inconsistent URIs. The redirect URL pattern `marketplace://` needs to be whitelisted in Supabase, and the token extraction from the hash fragment must work reliably.
2. **Magic Link (OTP)**: `EmailAuth` uses `makeRedirectUri()` without specifying the scheme, producing a default `exp://` URL that isn't whitelisted.
3. **Deep Link Hook**: The `useDeepLinking` hook uses `expo-linking` which is fine for cold-start deep links but doesn't handle the `expo-web-browser` auth session flow.

## Proposed Changes

The fix aligns the code with [Supabase's official Expo Social Auth guide](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth), which uses `signInWithOAuth` + `expo-web-browser` with the app's custom scheme.

---

### IntroScreen Component

#### [MODIFY] [IntroScreen.tsx](file:///c:/Users/hrzn/Desktop/mandarin-language-learning-app-master/mandarin-language-learning-app-master/components/auth/IntroScreen.tsx)

Rewrite `signInWithGoogle` to match the official pattern:

```diff
-import * as AuthSession from "expo-auth-session";
+// removed AuthSession import - not needed for this flow

 // The signInWithGoogle function:
-const signInWithGoogle = async () => {
-  try {
-    const redirectUri = AuthSession.makeRedirectUri({ scheme: "marketplace" });
-    console.log("Your Redirect URI:", redirectUri);
-    const { data, error } = await supabase.auth.signInWithOAuth({
-      provider: "google",
-      options: { redirectTo: redirectUri, skipBrowserRedirect: true },
-    });
-    if (error) throw error;
-    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
-    if (res.type === "success") {
-      const hash = url.split("#")[1];
-      // ...parse tokens from hash
-    }
-  } catch ...
-};
+const signInWithGoogle = async () => {
+  try {
+    const redirectTo = "marketplace://google-auth";
+
+    const { data, error } = await supabase.auth.signInWithOAuth({
+      provider: "google",
+      options: {
+        redirectTo,
+        skipBrowserRedirect: true,
+        queryParams: { prompt: "consent" },
+      },
+    });
+
+    if (error) throw error;
+    if (!data.url) throw new Error("No OAuth URL returned");
+
+    const result = await WebBrowser.openAuthSessionAsync(
+      data.url,
+      redirectTo,
+      { showInRecents: true }
+    );
+
+    if (result.type === "success") {
+      const url = result.url;
+      const parsedUrl = new URL(url);
+      const hash = parsedUrl.hash.substring(1);
+      const params = new URLSearchParams(hash);
+      const access_token = params.get("access_token");
+      const refresh_token = params.get("refresh_token");
+
+      if (access_token && refresh_token) {
+        await supabase.auth.setSession({ access_token, refresh_token });
+      }
+    }
+  } catch (error: any) {
+    console.error("Google login error:", error.message);
+  }
+};
```

Key changes:
- **Hardcode the redirect URI** as `marketplace://google-auth` (using `expo.scheme` from `app.json`) — no more dynamic `makeRedirectUri()` ambiguity
- **Remove `expo-auth-session` import** — it's not needed for this flow
- **Add `queryParams: { prompt: "consent" }`** — ensures Google always shows the consent screen
- **Add `showInRecents: true`** — better UX on Android
- **Use `new URL()` + `URLSearchParams`** for robust hash fragment parsing
- **Add browser warm-up** via `useEffect` for faster browser launch

Also add a `useEffect` for browser warm-up:
```tsx
useEffect(() => {
  WebBrowser.warmUpAsync();
  return () => { WebBrowser.coolDownAsync(); };
}, []);
```

---

### EmailAuth Component

#### [MODIFY] [EmailAuth.tsx](file:///c:/Users/hrzn/Desktop/mandarin-language-learning-app-master/mandarin-language-learning-app-master/components/auth/EmailAuth.tsx)

Fix the magic link redirect URI:

```diff
-const redirectTo = makeRedirectUri();
+const redirectTo = "marketplace://email-auth";
```

This ensures the magic link redirects back to the app using the custom scheme, which works consistently across Expo Go and standalone builds.

Also remove the unused `makeRedirectUri` import from `expo-auth-session`.

---

### Deep Linking Hook

#### [MODIFY] [useDeepLinking.ts](file:///c:/Users/hrzn/Desktop/mandarin-language-learning-app-master/mandarin-language-learning-app-master/hooks/useDeepLinking.ts)

The hook is fine conceptually but needs to handle both query params AND hash fragments, since Supabase returns tokens as hash fragments (`#access_token=...`) for OAuth, but the `QueryParams.getQueryParams` from `expo-auth-session` should handle both. No changes needed here — its current implementation will handle magic link returns correctly.

---

## User Review Required

> [!IMPORTANT]
> **Supabase Dashboard Configuration Required**
> 
> You must configure the following in your [Supabase Dashboard → Authentication → URL Configuration](https://supabase.com/dashboard/project/pkwvqqharvqssvikosiw/auth/url-configuration):
> 
> 1. **Site URL**: Set to `marketplace://` (or keep as localhost if you prefer — the site URL is used as the default redirect, but our code explicitly sets `redirectTo`)
> 
> 2. **Redirect URLs** — Add ALL of these:
>    - `marketplace://google-auth`
>    - `marketplace://email-auth`
>    - `marketplace://**` ← wildcard catch-all for the scheme
>    - `exp://192.168.*.*:8081/--/**` ← for Expo Go development (optional but helpful)
> 
> 3. **Google Provider**: Ensure Google is enabled under [Authentication → Providers](https://supabase.com/dashboard/project/pkwvqqharvqssvikosiw/auth/providers) with a valid Client ID and Client Secret from your Google Cloud Console.

> [!WARNING]
> **The `expo-auth-session` dependency can be removed** if you are not using it elsewhere. The official Supabase pattern only needs `expo-web-browser`. However, the `useDeepLinking` hook still imports `QueryParams` from `expo-auth-session/build/QueryParams`, so we'll keep the dependency for now.

## Open Questions

1. **Are you testing in Expo Go or a development build?** In Expo Go, the `marketplace://` scheme redirect may not work because Expo Go doesn't register custom schemes. If you're using Expo Go, you may need to use a development build (`npx expo prebuild` + `npx expo run:ios` or `run:android`) for OAuth to work correctly.

2. **Do you have Google OAuth configured in the Supabase Dashboard?** (Client ID + Client Secret from Google Cloud Console → APIs & Services → Credentials)

3. **Would you like me to also implement Apple Sign-In?** The Apple button currently just logs `"Apple login"`. The official guide shows how to do it with `@invertase/react-native-apple-authentication` or `expo-apple-authentication`.

## Verification Plan

### Manual Verification
1. Add the redirect URLs to the Supabase Dashboard
2. Run `npx expo start --clear` 
3. Test Google Sign In — should open browser, complete auth, and redirect back to app
4. Test Magic Link — should send email, clicking link should redirect back to app
5. Verify the `AuthProvider` picks up the session via `onAuthStateChange`
