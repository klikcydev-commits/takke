import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col">
      <header className="border-b border-black/[0.06] bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-gray-900">
            <Store className="h-6 w-6" aria-hidden />
            Marketplace
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/vendor/register"
              className="text-gray-600 transition-colors hover:text-gray-900"
            >
              Vendor sign up
            </Link>
            <Link
              href="/register/choice"
              className="rounded-full bg-gray-900 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-800"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center space-y-8">
          <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
            Vendor &amp; delivery network
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            Run your store or deliveries on our marketplace
          </h1>
          <p className="text-lg leading-relaxed text-gray-600">
            Register as a store owner or delivery partner, manage orders from your dashboard, and grow
            with the rest of the ecosystem.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register/choice"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gray-900 px-8 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Start registration
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/vendor/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-full border border-gray-300 bg-white px-8 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
            >
              Vendor dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
