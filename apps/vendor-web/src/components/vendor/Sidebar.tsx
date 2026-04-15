"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  Package, 
  ShoppingBag, 
  Settings, 
  Users, 
  CreditCard,
  ChevronRight,
  LogOut
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useVendorStore } from "./VendorStoreContext";

const navigation = [
  { name: "Overview", href: "/vendor/dashboard", icon: BarChart3 },
  { name: "Products", href: "/vendor/dashboard/products", icon: Package },
  { name: "Orders", href: "/vendor/dashboard/orders", icon: ShoppingBag },
  { name: "Customers", href: "/vendor/dashboard/customers", icon: Users },
  { name: "Payouts", href: "/vendor/dashboard/payouts", icon: CreditCard },
  { name: "Settings", href: "/vendor/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { store, loading } = useVendorStore();

  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-border px-6 pb-4">
      <div className="flex h-16 shrink-0 flex-col justify-center gap-0.5">
        <span className="text-xl font-serif font-semibold tracking-tight">Marketplace</span>
        {!loading && store?.name && (
          <span className="text-xs font-medium text-muted-foreground truncate" title={store.name}>
            {store.name}
          </span>
        )}
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive =
                  item.href === "/vendor/dashboard"
                    ? pathname === "/vendor/dashboard"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        isActive
                          ? "bg-secondary text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-primary",
                        "group flex gap-x-3 rounded-xl p-3 text-sm font-medium leading-6 transition-all duration-200"
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary",
                          "h-5 w-5 shrink-0"
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                      {isActive && <ChevronRight className="ml-auto h-4 w-4 text-primary/40" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
          <li className="mt-auto">
            <button className="group -mx-2 flex w-full gap-x-3 rounded-xl p-3 text-sm font-medium leading-6 text-muted-foreground hover:bg-secondary hover:text-primary transition-all duration-200">
              <LogOut className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
              Log out
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
