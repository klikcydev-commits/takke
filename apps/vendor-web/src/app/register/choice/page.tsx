"use client";

import React from "react";
import Link from "next/link";
import { Store, Truck, ArrowRight, ChevronLeft } from "lucide-react";

export default function RegisterChoicePage() {
  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col items-center justify-center p-6">
      {/* Top Navigation */}
      <div className="absolute top-8 left-8">
        <Link 
          href="/" 
          className="flex items-center text-sm font-medium text-gray-500 hover:text-black transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>
      </div>

      <div className="max-w-4xl w-full text-center space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">
            Choose your business path
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Join our premium marketplace ecosystem and reach thousands of customers or help us deliver excellence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Store Owner Option */}
          <Link href="/register/store" className="group">
            <div className="luxury-card p-10 h-full flex flex-col items-center text-center space-y-6 hover:border-black/20 transition-all cursor-pointer">
              <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-500">
                <Store className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-medium">Store Owner</h3>
                <p className="text-gray-500">
                  Open your luxury digital storefront, manage inventory, and scale your brand to new heights.
                </p>
              </div>
              <div className="pt-4 flex items-center font-medium text-black group-hover:translate-x-2 transition-transform">
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </Link>

          {/* Delivery Driver Option */}
          <Link href="/register/driver" className="group">
            <div className="luxury-card p-10 h-full flex flex-col items-center text-center space-y-6 hover:border-black/20 transition-all cursor-pointer">
              <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-500">
                <Truck className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-medium">Delivery Partner</h3>
                <p className="text-gray-500">
                  Join our logistics network, earn on every delivery, and provide premium service to our clients.
                </p>
              </div>
              <div className="pt-4 flex items-center font-medium text-black group-hover:translate-x-2 transition-transform">
                Apply Now <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </Link>
        </div>

        <div className="pt-8">
          <p className="text-gray-500 text-sm">
            Already have a business account?{" "}
            <Link href="/login" className="text-black font-medium underline underline-offset-4 decoration-black/20 hover:decoration-black transition-all">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
