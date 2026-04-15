"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  MapPin,
  FileText,
  CreditCard,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Upload,
  Info,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, getSupabaseAccessToken, signOutVendor } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import {
  formatSupabaseAuthError,
  getSupabaseAuthErrorInfo,
  logSupabaseSignup,
} from "@marketplace/shared-supabase";

const STEPS = [
  { id: "basic", title: "Business Info", icon: Store },
  { id: "address", title: "Location", icon: MapPin },
  { id: "docs", title: "Documents", icon: FileText },
  { id: "bank", title: "Payouts", icon: CreditCard },
  { id: "review", title: "Review", icon: CheckCircle },
];

type AuthMode = "login" | "register";

export default function StoreOnboardingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const authActionInFlightRef = useRef(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regFirst, setRegFirst] = useState("");
  const [regLast, setRegLast] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "RETAIL",
    description: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    licenseUrl: "",
    taxIdUrl: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  });

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionReady(!!session?.access_token);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionReady(!!session?.access_token);
    });
    return () => subscription.unsubscribe();
  }, []);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const updateForm = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  async function handleAuthRegister(e: React.FormEvent) {
    e.preventDefault();
    if (authLoading || authActionInFlightRef.current) {
      logSupabaseSignup("store-register", "blocked_duplicate", { reason: "guard" });
      return;
    }
    authActionInFlightRef.current = true;
    setAuthError(null);
    setAuthLoading(true);
    logSupabaseSignup("store-register", "start");
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/register/store")}`;
      const { data, error } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: {
          data: { first_name: regFirst, last_name: regLast },
          emailRedirectTo,
        },
      });
      if (error) throw error;
      const session = data.session;
      if (!session?.access_token) {
        logSupabaseSignup("store-register", "success", { pendingEmailConfirm: true });
        setAuthError(
          "Check your email to confirm your account, then sign in — or disable email confirmation in Supabase for local dev.",
        );
        return;
      }
      await apiFetch("/profile/bootstrap", {
        method: "POST",
        body: "{}",
        token: session.access_token,
      });
      logSupabaseSignup("store-register", "success", { session: true });
      setSessionReady(true);
    } catch (err) {
      const info = getSupabaseAuthErrorInfo(err);
      logSupabaseSignup("store-register", "error", {
        status: info.status,
        code: info.code,
        message: info.message,
        raw: info.raw,
      });
      setAuthError(formatSupabaseAuthError(err));
    } finally {
      authActionInFlightRef.current = false;
      setAuthLoading(false);
    }
  }

  async function handleAuthLogin(e: React.FormEvent) {
    e.preventDefault();
    if (authLoading || authActionInFlightRef.current) {
      logSupabaseSignup("store-login", "blocked_duplicate", { reason: "guard" });
      return;
    }
    authActionInFlightRef.current = true;
    setAuthError(null);
    setAuthLoading(true);
    logSupabaseSignup("store-login", "start");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) throw error;
      const token = data.session?.access_token;
      if (!token) throw new Error("No session returned");
      await apiFetch("/profile/bootstrap", { method: "POST", body: "{}", token });
      logSupabaseSignup("store-login", "success");
      setSessionReady(true);
    } catch (err) {
      const info = getSupabaseAuthErrorInfo(err);
      logSupabaseSignup("store-login", "error", {
        status: info.status,
        code: info.code,
        message: info.message,
        raw: info.raw,
      });
      setAuthError(formatSupabaseAuthError(err));
    } finally {
      authActionInFlightRef.current = false;
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    void signOutVendor();
    setSessionReady(false);
    setCurrentStep(0);
  }

  async function handleSubmitApplication() {
    setSubmitError(null);
    setSubmitting(true);
    const businessAddress = [
      formData.address,
      formData.city,
      formData.state,
      formData.zip,
    ]
      .filter(Boolean)
      .join(", ");

    const payload = {
      businessName: formData.businessName,
      businessType: formData.businessType,
      description: formData.description || undefined,
      contactEmail: formData.email,
      contactPhone: formData.phone,
      businessAddress,
      city: formData.city,
      state: formData.state,
      country: formData.country.trim() || "—",
      metadata: {
        zip: formData.zip,
        licenseUrl: formData.licenseUrl || undefined,
        taxIdUrl: formData.taxIdUrl || undefined,
        bank: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountHolder: formData.accountHolder,
        },
      },
    };

    try {
      const token = await getSupabaseAccessToken();
      if (!token) throw new Error("Not signed in");
      await apiFetch("/applications/store", {
        method: "POST",
        body: JSON.stringify(payload),
        token,
      });
      router.push("/register/store/success");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrimaryAction() {
    if (currentStep === STEPS.length - 1) {
      void handleSubmitApplication();
    } else {
      setSubmitError(null);
      nextStep();
    }
  }

  const canProceedStep = () => {
    if (currentStep === 0) {
      return (
        formData.businessName.trim() &&
        formData.email.trim() &&
        formData.phone.trim()
      );
    }
    if (currentStep === 1) {
      return (
        formData.address.trim() &&
        formData.city.trim() &&
        formData.state.trim() &&
        formData.country.trim()
      );
    }
    return true;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#fdfcfb] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-[#fdfcfb] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md luxury-card p-10 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">Account required</h1>
            <p className="text-gray-500 text-sm">
              Sign in or create an account so your store application is saved to our database for
              admin review.
            </p>
          </div>

          <div className="flex rounded-xl border border-border p-1 bg-secondary/30">
            <button
              type="button"
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                authMode === "register" ? "bg-white shadow-sm" : ""
              }`}
              onClick={() => {
                setAuthMode("register");
                setAuthError(null);
              }}
            >
              Register
            </button>
            <button
              type="button"
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                authMode === "login" ? "bg-white shadow-sm" : ""
              }`}
              onClick={() => {
                setAuthMode("login");
                setAuthError(null);
              }}
            >
              Log in
            </button>
          </div>

          {authMode === "register" ? (
            <form onSubmit={handleAuthRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">First name</label>
                  <input
                    className="luxury-input w-full"
                    value={regFirst}
                    onChange={(e) => setRegFirst(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Last name</label>
                  <input
                    className="luxury-input w-full"
                    value={regLast}
                    onChange={(e) => setRegLast(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Email</label>
                <input
                  type="email"
                  className="luxury-input w-full"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Password (min 8)</label>
                <input
                  type="password"
                  className="luxury-input w-full"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              <button type="submit" disabled={authLoading} className="w-full luxury-button py-3 flex justify-center gap-2">
                {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Continue to application
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuthLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Email</label>
                <input
                  type="email"
                  className="luxury-input w-full"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Password</label>
                <input
                  type="password"
                  className="luxury-input w-full"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              <button type="submit" disabled={authLoading} className="w-full luxury-button py-3 flex justify-center gap-2">
                {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Log in
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500">
            <Link href="/register/choice" className="underline">
              Back to choices
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col">
      <header className="h-20 border-b border-border bg-white flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/register/choice" className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="font-semibold text-lg">Store Application</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    idx <= currentStep ? "bg-black text-white" : "bg-secondary text-gray-400"
                  }`}
                >
                  {idx < currentStep ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-8 h-[2px] ${idx < currentStep ? "bg-black" : "bg-secondary"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-black underline"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto py-12 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">Tell us about your store</h2>
                  <p className="text-gray-500 mt-2 text-lg">Every great success starts with a clear vision.</p>
                </div>
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Official Business Name</label>
                    <input
                      name="businessName"
                      value={formData.businessName}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="e.g. Maison de Elégance"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Contact email</label>
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={updateForm}
                        className="luxury-input w-full"
                        placeholder="contact@yourstore.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone</label>
                      <input
                        name="phone"
                        value={formData.phone}
                        onChange={updateForm}
                        className="luxury-input w-full"
                        placeholder="+1 …"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Business Type</label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={updateForm}
                      className="luxury-input w-full bg-white"
                    >
                      <option value="RETAIL">Retail</option>
                      <option value="WHOLESALE">Wholesale</option>
                      <option value="SUPPLIER_STYLE">Supplier style</option>
                      <option value="MARKETPLACE_SELLER">Marketplace Seller</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Short Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={updateForm}
                      className="luxury-input w-full min-h-[120px]"
                      placeholder="Describe your brand's unique character..."
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">Where are you located?</h2>
                  <p className="text-gray-500 mt-2 text-lg">Setting up your headquarters and fulfillment center.</p>
                </div>
                <div className="grid grid-cols-2 gap-6 py-4">
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Street Address</label>
                    <input
                      name="address"
                      value={formData.address}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="123 Luxury Lane"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <input name="city" value={formData.city} onChange={updateForm} className="luxury-input w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State / Region</label>
                    <input name="state" value={formData.state} onChange={updateForm} className="luxury-input w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Postal / ZIP</label>
                    <input name="zip" value={formData.zip} onChange={updateForm} className="luxury-input w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country</label>
                    <input
                      name="country"
                      value={formData.country}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">Legal Documentation</h2>
                  <p className="text-gray-500 mt-2 text-lg">We verify every partner to ensure marketplace integrity.</p>
                </div>
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Business license URL (optional)</label>
                    <input
                      name="licenseUrl"
                      value={formData.licenseUrl}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="https://… after you upload to your storage"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tax ID document URL (optional)</label>
                    <input
                      name="taxIdUrl"
                      value={formData.taxIdUrl}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="https://…"
                    />
                  </div>
                  <div className="luxury-card border-dashed p-10 flex flex-col items-center justify-center space-y-4 hover:bg-secondary/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-medium">Direct uploads</h4>
                      <p className="text-sm text-gray-500">
                        Paste secure URLs above, or wire storage later — your application is still submitted for review.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 p-4 bg-secondary/30 rounded-xl border border-border italic text-sm text-gray-600">
                    <Info className="w-5 h-5 flex-shrink-0" />
                    Submitted data is stored in our database for admin approval.
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">Payout details</h2>
                  <p className="text-gray-500 mt-2 text-lg">For future payouts after approval.</p>
                </div>
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bank name</label>
                    <input name="bankName" value={formData.bankName} onChange={updateForm} className="luxury-input w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account holder</label>
                    <input
                      name="accountHolder"
                      value={formData.accountHolder}
                      onChange={updateForm}
                      className="luxury-input w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account number</label>
                    <input
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={updateForm}
                      className="luxury-input w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">Review & submit</h2>
                  <p className="text-gray-500 mt-2 text-lg">
                    Your application will be sent to an administrator for approval.
                  </p>
                </div>
                <div className="luxury-card p-6 space-y-3 text-sm">
                  <p>
                    <span className="font-medium">Business:</span> {formData.businessName}
                  </p>
                  <p>
                    <span className="font-medium">Contact:</span> {formData.email} · {formData.phone}
                  </p>
                  <p>
                    <span className="font-medium">Location:</span> {formData.city}, {formData.state},{" "}
                    {formData.country}
                  </p>
                </div>
                {submitError && <p className="text-sm text-red-600">{submitError}</p>}
              </div>
            )}

            <div className="pt-12 flex items-center gap-4">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-8 py-3 rounded-xl border border-gray-200 font-medium hover:bg-secondary transition-colors"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={
                  submitting || (currentStep < STEPS.length - 1 && !canProceedStep())
                }
                className="luxury-button flex-1 py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {currentStep === STEPS.length - 1 ? "Submit application" : "Continue to Next Step"}
                {currentStep < STEPS.length - 1 && <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="py-8 text-center border-t border-border mt-auto">
        <p className="text-sm text-gray-400">Need help? Contact support.</p>
      </footer>
    </div>
  );
}
