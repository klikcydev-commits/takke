"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Truck, 
  FileCheck, 
  CreditCard, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  Upload
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { apiFetch, getSupabaseAccessToken } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import {
  formatSupabaseAuthError,
  getSupabaseAuthErrorInfo,
  logSupabaseSignup,
} from "@marketplace/shared-supabase";

const STEPS = [
  { id: "personal", title: "Personal Info", icon: User },
  { id: "vehicle", title: "Vehicle info", icon: Truck },
  { id: "docs", title: "Verification", icon: FileCheck },
  { id: "payout", title: "Payouts", icon: CreditCard },
  { id: "review", title: "Review", icon: CheckCircle },
];

export default function DriverOnboardingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regFirst, setRegFirst] = useState("");
  const [regLast, setRegLast] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [formData, setFormData] = useState({
    contactEmail: "",
    accountPassword: "",
    businessContactEmail: "",
    fullName: "",
    phone: "",
    country: "",
    city: "",
    state: "",
    address: "",
    dateOfBirth: "",
    vehicleType: "CAR",
    vehicleDetails: "",
    licenseNumber: "",
    vehicleModel: "",
    licensePlate: "",
    licenseUrl: "",
    identityUrl: "",
    insuranceUrl: "",
    registrationUrl: "",
    availability: "",
    serviceArea: "",
    profileImageUrl: "",
    bankName: "",
    accountNumber: "",
  });

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const updateForm = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      setSessionReady(!!data.session?.access_token);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionReady(!!session?.access_token);
    });
    void supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? "";
      if (!email) return;
      setFormData((prev) => (prev.contactEmail ? prev : { ...prev, contactEmail: email }));
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleAuthRegister(e: React.FormEvent) {
    e.preventDefault();
    if (authLoading) return;
    setAuthLoading(true);
    setAuthError(null);
    logSupabaseSignup("driver-register", "start");
    try {
      const supabase = createClient();
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/register/driver")}`;
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
        setAuthError(
          "Check your email to verify your account, then sign in to continue your driver application.",
        );
        return;
      }
      await apiFetch("/profile/bootstrap", {
        method: "POST",
        body: "{}",
        token: session.access_token,
      });
      setSessionReady(true);
      setFormData((prev) => ({ ...prev, contactEmail: regEmail.trim().toLowerCase() }));
    } catch (err) {
      const info = getSupabaseAuthErrorInfo(err);
      logSupabaseSignup("driver-register", "error", {
        status: info.status,
        code: info.code,
        message: info.message,
      });
      setAuthError(formatSupabaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleAuthLogin(e: React.FormEvent) {
    e.preventDefault();
    if (authLoading) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) throw error;
      const token = data.session?.access_token;
      if (!token) throw new Error("No session returned.");
      await apiFetch("/profile/bootstrap", { method: "POST", body: "{}", token });
      setSessionReady(true);
      setFormData((prev) => ({ ...prev, contactEmail: loginEmail.trim().toLowerCase() }));
    } catch (err) {
      setAuthError(formatSupabaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSubmitApplication() {
    setSubmitError(null);
    setSubmitting(true);
    const payload = {
      contactEmail: formData.contactEmail.trim(),
      businessContactEmail: formData.businessContactEmail.trim() || undefined,
      fullName: formData.fullName,
      phone: formData.phone,
      country: formData.country,
      city: formData.city,
      state: formData.state,
      address: formData.address,
      dateOfBirth: formData.dateOfBirth || undefined,
      vehicleType: formData.vehicleType,
      vehicleDetails: formData.vehicleDetails,
      licenseNumber: formData.licenseNumber,
      vehicleModel: formData.vehicleModel,
      licensePlate: formData.licensePlate,
      identityDocUrl: formData.identityUrl,
      licenseDocUrl: formData.licenseUrl,
      insuranceDocUrl: formData.insuranceUrl || undefined,
      registrationDocUrl: formData.registrationUrl || undefined,
      availability: formData.availability,
      serviceArea: formData.serviceArea,
      profileImageUrl: formData.profileImageUrl || undefined,
      bankName: formData.bankName || undefined,
      accountNumber: formData.accountNumber || undefined,
    };

    try {
      let token = await getSupabaseAccessToken();
      let authUserId: string | undefined;
      if (!token) {
        if (!formData.accountPassword.trim()) {
          throw new Error("Create an account password to finish registration.");
        }
        const supabase = createClient();
        const [firstName, ...rest] = formData.fullName.trim().split(" ");
        const { data, error } = await supabase.auth.signUp({
          email: formData.contactEmail.trim(),
          password: formData.accountPassword,
          options: {
            data: {
              first_name: firstName || formData.fullName.trim(),
              last_name: rest.join(" ").trim() || null,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/driver/dashboard")}`,
          },
        });
        if (error) throw error;
        authUserId = data.user?.id;
        token = data.session?.access_token ?? null;
      }
      await apiFetch("/applications/driver", {
        method: "POST",
        body: JSON.stringify({ ...payload, authUserId }),
        token: token ?? undefined,
      });
      router.push(token ? "/driver/dashboard" : "/register/driver/success");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrimaryAction() {
    if (currentStep === STEPS.length - 1) {
      void handleSubmitApplication();
      return;
    }
    setSubmitError(null);
    nextStep();
  }

  const canProceedStep = () => {
    if (currentStep === 0) {
      return (
        formData.contactEmail.trim() &&
        (sessionReady || formData.accountPassword.trim().length >= 8) &&
        formData.fullName.trim() &&
        formData.phone.trim() &&
        formData.country.trim() &&
        formData.city.trim() &&
        formData.state.trim() &&
        formData.address.trim() &&
        formData.dateOfBirth.trim()
      );
    }
    if (currentStep === 1) {
      return (
        formData.vehicleModel.trim() &&
        formData.vehicleDetails.trim() &&
        formData.licensePlate.trim() &&
        formData.licenseNumber.trim()
      );
    }
    if (currentStep === 2) {
      return (
        formData.licenseUrl.trim() &&
        formData.identityUrl.trim() &&
        formData.registrationUrl.trim() &&
        formData.serviceArea.trim() &&
        formData.availability.trim()
      );
    }
    return true;
  };

  if (false && !sessionReady) {
    return (
      <div className="min-h-screen bg-[#fdfcfb] flex items-center justify-center p-6">
        <div className="luxury-card p-8 max-w-md w-full space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Account required</h1>
          <p className="text-gray-600 text-sm">
            Driver applications are tied to a verified account. Create an account or sign in to
            continue.
          </p>
          <div className="flex rounded-xl border border-border p-1 bg-secondary/30">
            <button
              type="button"
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                authMode === "register" ? "bg-white shadow-sm" : ""
              }`}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
            <button
              type="button"
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                authMode === "login" ? "bg-white shadow-sm" : ""
              }`}
              onClick={() => setAuthMode("login")}
            >
              Log in
            </button>
          </div>
          {authMode === "register" ? (
            <form onSubmit={handleAuthRegister} className="space-y-3 text-left">
              <input className="luxury-input w-full" placeholder="First name" value={regFirst} onChange={(e) => setRegFirst(e.target.value)} required />
              <input className="luxury-input w-full" placeholder="Last name" value={regLast} onChange={(e) => setRegLast(e.target.value)} required />
              <input type="email" className="luxury-input w-full" placeholder="Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
              <input type="password" minLength={8} className="luxury-input w-full" placeholder="Password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              <button type="submit" className="luxury-button w-full py-3" disabled={authLoading}>
                Continue
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuthLogin} className="space-y-3 text-left">
              <input type="email" className="luxury-input w-full" placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              <input type="password" className="luxury-input w-full" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              <button type="submit" className="luxury-button w-full py-3" disabled={authLoading}>
                Log in
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => router.push(`/login?next=${encodeURIComponent(pathname || "/register/driver")}`)}
            className="text-xs underline text-gray-500"
          >
            Open full login page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col">
      {/* Header */}
      <header className="h-20 border-b border-border bg-white flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/register/choice" className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="font-semibold text-lg">Driver Application</span>
        </div>
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
            {/* Step Content */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">Identity Details</h2>
                  <p className="text-gray-500 mt-2 text-lg">Help us confirm who is joining the fleet.</p>
                </div>
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email (verified account)</label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="you@example.com"
                    />
                    <p className="text-xs text-gray-500">
                      Enter your account email. It must match the currently signed-in account.
                    </p>
                  </div>
                  {!sessionReady && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Account password</label>
                      <input
                        type="password"
                        minLength={8}
                        name="accountPassword"
                        value={formData.accountPassword}
                        onChange={updateForm}
                        className="luxury-input w-full"
                        placeholder="Create a password (min 8 chars)"
                      />
                      <p className="text-xs text-gray-500">
                        We will create your account and send verification email on submit.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name (As on ID)</label>
                    <input 
                      name="fullName"
                      value={formData.fullName}
                      onChange={updateForm}
                      className="luxury-input w-full" 
                      placeholder="e.g. Jean Dupont" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone number</label>
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="+1 ..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Business contact email (optional)</label>
                    <input
                      type="email"
                      name="businessContactEmail"
                      value={formData.businessContactEmail}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="ops@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Country</label>
                      <input name="country" value={formData.country} onChange={updateForm} className="luxury-input w-full" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">City</label>
                      <input name="city" value={formData.city} onChange={updateForm} className="luxury-input w-full" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">State / Region</label>
                      <input name="state" value={formData.state} onChange={updateForm} className="luxury-input w-full" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Address</label>
                      <input name="address" value={formData.address} onChange={updateForm} className="luxury-input w-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date of Birth</label>
                    <input 
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={updateForm}
                      className="luxury-input w-full bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">Vehicle Information</h2>
                  <p className="text-gray-500 mt-2 text-lg">Tell us about the vehicle you'll be using for deliveries.</p>
                </div>
                <div className="grid grid-cols-2 gap-6 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vehicle Type</label>
                    <select 
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={updateForm}
                      className="luxury-input w-full bg-white"
                    >
                      <option value="CAR">Car</option>
                      <option value="MOTORCYCLE">Motorcycle</option>
                      <option value="VAN">Van</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">License Plate</label>
                    <input 
                      name="licensePlate"
                      value={formData.licensePlate}
                      onChange={updateForm}
                      className="luxury-input w-full" 
                      placeholder="ABC-1234"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Vehicle Model & Color</label>
                    <input 
                      name="vehicleModel"
                      value={formData.vehicleModel}
                      onChange={updateForm}
                      className="luxury-input w-full" 
                      placeholder="e.g. Toyota Camry (Black)"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Vehicle details</label>
                    <input
                      name="vehicleDetails"
                      value={formData.vehicleDetails}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="Year, make, model, color"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Driver license number</label>
                    <input
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="License number"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">Document Verification</h2>
                  <p className="text-gray-500 mt-2 text-lg">Please upload clear copies of your driving credentials.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-6 py-4">
                  <div className="luxury-card border-dashed p-8 flex flex-col items-center justify-center space-y-3 hover:bg-secondary/50 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-medium text-sm">Driving License</h4>
                      <p className="text-xs text-gray-500">Front Side</p>
                    </div>
                  </div>
                  <div className="luxury-card border-dashed p-8 flex flex-col items-center justify-center space-y-3 hover:bg-secondary/50 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-medium text-sm">National ID / Passport</h4>
                      <p className="text-xs text-gray-400">Identity Page</p>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Driving license URL</label>
                    <input
                      name="licenseUrl"
                      value={formData.licenseUrl}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Identity document URL</label>
                    <input
                      name="identityUrl"
                      value={formData.identityUrl}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium">Vehicle registration URL</label>
                    <input
                      name="registrationUrl"
                      value={formData.registrationUrl}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium">Service area</label>
                    <input
                      name="serviceArea"
                      value={formData.serviceArea}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="Downtown, East Side..."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium">Availability</label>
                    <input
                      name="availability"
                      value={formData.availability}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="Mon-Fri 9am-6pm"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium">Insurance URL (optional)</label>
                    <input
                      name="insuranceUrl"
                      value={formData.insuranceUrl}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">Payout details</h2>
                  <p className="text-gray-500 mt-2 text-lg">Optional now, can be updated later.</p>
                </div>
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Profile image URL (optional)</label>
                    <input
                      name="profileImageUrl"
                      value={formData.profileImageUrl}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bank name</label>
                    <input
                      name="bankName"
                      value={formData.bankName}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="Your bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account number</label>
                    <input
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={updateForm}
                      className="luxury-input w-full"
                      placeholder="XXXXXXXXXX"
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
                    Your driver application will be sent for admin review.
                  </p>
                </div>
                <div className="luxury-card p-6 space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {formData.fullName}</p>
                  <p><span className="font-medium">Phone:</span> {formData.phone}</p>
                  <p><span className="font-medium">Address:</span> {formData.address}, {formData.city}, {formData.state}, {formData.country}</p>
                  <p><span className="font-medium">Vehicle:</span> {formData.vehicleType} · {formData.vehicleModel}</p>
                  <p><span className="font-medium">Plate:</span> {formData.licensePlate}</p>
                </div>
                {submitError && <p className="text-sm text-red-600">{submitError}</p>}
              </div>
            )}

            {/* Step Navigation */}
            <div className="pt-12 flex items-center gap-4">
              {currentStep > 0 && (
                <button 
                  onClick={prevStep}
                  className="px-8 py-3 rounded-xl border border-gray-200 font-medium hover:bg-secondary transition-colors"
                >
                  Back
                </button>
              )}
              <button 
                type="button"
                onClick={handlePrimaryAction}
                disabled={submitting || (currentStep < STEPS.length - 1 && !canProceedStep())}
                className="luxury-button flex-1 py-4 text-lg flex items-center justify-center disabled:opacity-50"
              >
                {currentStep === STEPS.length - 1
                  ? (submitting ? "Submitting..." : "Submit Application")
                  : "Continue to Next Step"}
                {currentStep < STEPS.length - 1 && <ChevronRight className="w-5 h-5 ml-2" />}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Support */}
      <footer className="py-8 text-center border-t border-border mt-auto">
        <p className="text-sm text-gray-400">Join our premium delivery fleet. Need assistance? fleet@luxury.com</p>
      </footer>
    </div>
  );
}
