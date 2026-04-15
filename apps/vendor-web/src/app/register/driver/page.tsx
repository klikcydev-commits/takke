"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Truck, 
  FileCheck, 
  CreditCard, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  Upload,
  UserCheck
} from "lucide-react";
import Link from "next/link";

const STEPS = [
  { id: "personal", title: "Personal Info", icon: User },
  { id: "vehicle", title: "Vehicle info", icon: Truck },
  { id: "docs", title: "Verification", icon: FileCheck },
  { id: "payout", title: "Payouts", icon: CreditCard },
  { id: "review", title: "Review", icon: CheckCircle },
];

export default function DriverOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    vehicleType: "CAR",
    vehicleModel: "",
    licensePlate: "",
    licenseUrl: "",
    identityUrl: "",
    insuranceUrl: "",
    bankName: "",
    accountNumber: "",
  });

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const updateForm = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
                onClick={nextStep}
                className="luxury-button flex-1 py-4 text-lg flex items-center justify-center"
              >
                {currentStep === STEPS.length - 1 ? "Submit Application" : "Continue to Next Step"}
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
