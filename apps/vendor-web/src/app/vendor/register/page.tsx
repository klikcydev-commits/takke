import { VendorRegisterForm } from "./VendorRegisterForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md luxury-card p-10 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-serif font-medium tracking-tight">Become a Vendor</h1>
          <p className="mt-2 text-muted-foreground">Join our luxury fashion marketplace</p>
        </div>

        <VendorRegisterForm />
      </div>
    </div>
  );
}
