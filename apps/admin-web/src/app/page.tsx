import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Marketplace admin
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Review store and driver applications, manage users, and monitor operations via the
          Next.js admin API (`/api/admin`).
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Admin login
          </Link>
          <Link
            href="/dashboard/applications"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Dashboard (requires session)
          </Link>
        </div>
      </div>
    </div>
  );
}
