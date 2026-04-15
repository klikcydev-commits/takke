import { VendorStoreProvider } from "@/components/vendor/VendorStoreContext";

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VendorStoreProvider>{children}</VendorStoreProvider>;
}
