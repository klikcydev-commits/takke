"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  BarChart3, 
  Users, 
  Store, 
  Truck, 
  FileText, 
  ShieldCheck, 
  Settings,
  Bell,
  LogOut
} from "lucide-react";
import { cn } from "@/utils/cn";
import { createClient } from "@/lib/supabase/client";

const MENU_ITEMS = [
  { group: "Overview", items: [
    { label: "Dashboard", icon: BarChart3, href: "/dashboard" },
  ]},
  { group: "Governance", items: [
    { label: "Applications", icon: FileText, href: "/dashboard/applications" },
    { label: "Stores", icon: Store, href: "/dashboard/stores" },
    { label: "Drivers", icon: Truck, href: "/dashboard/drivers" },
    { label: "Audit Logs", icon: ShieldCheck, href: "/dashboard/audit" },
  ]},
  { group: "Management", items: [
    { label: "Users", icon: Users, href: "/dashboard/users" },
    { label: "Notifications", icon: Bell, href: "/dashboard/notifications" },
    { label: "Settings", icon: Settings, href: "/dashboard/settings" },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="w-72 h-screen border-r border-gray-100 bg-white flex flex-col sticky top-0">
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Admin Portal</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-8 overflow-y-auto">
        {MENU_ITEMS.map((group) => (
          <div key={group.group} className="space-y-1">
            <h4 className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
              {group.group}
            </h4>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive 
                      ? "bg-black text-white shadow-lg shadow-black/10" 
                      : "text-gray-500 hover:bg-gray-50 hover:text-black"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-6 border-t border-gray-100">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 transition-all hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </div>
  );
}
