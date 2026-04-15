import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function DriverApplicationSuccessPage() {
  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-700" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Driver application submitted</h1>
        <p className="text-gray-600">
          Your delivery driver application is pending admin review. We will notify you after it is
          approved or if more information is needed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-block rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Back to home
          </Link>
          <Link
            href="/register/driver"
            className="inline-block rounded-full border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            Submit another response
          </Link>
        </div>
      </div>
    </div>
  );
}
