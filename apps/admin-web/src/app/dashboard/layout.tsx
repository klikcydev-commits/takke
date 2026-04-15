import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          <div className="p-10 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </AuthGate>
  );
}
