import { DashboardShell } from "@/components/vendor/DashboardShell";
import { CreditCard, History, Clock } from "lucide-react";

const payouts = [
  { id: "#PAY-001", amount: "$1,240.00", date: "April 01, 2026", method: "Bank Transfer", status: "Processed" },
  { id: "#PAY-002", amount: "$890.00", date: "March 15, 2026", method: "Bank Transfer", status: "Processed" },
];

export default function PayoutsPage() {
  return (
    <DashboardShell title="Payouts & Finance">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="luxury-card p-6 border-l-4 border-l-accent">
          <p className="text-sm font-medium text-muted-foreground">Available for Payout</p>
          <p className="text-2xl font-semibold mt-1">$4,500.20</p>
          <button className="mt-4 w-full luxury-button py-2 text-sm">Request Payout</button>
        </div>
        <div className="luxury-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Pending Balance</p>
          <p className="text-2xl font-semibold mt-1">$1,200.00</p>
          <div className="mt-4 flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" /> Estimated 2 days
          </div>
        </div>
      </div>

      <div className="luxury-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-medium">Payout History</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-secondary/30">
              <th className="px-6 py-4 font-semibold text-muted-foreground">ID</th>
              <th className="px-6 py-4 font-semibold text-muted-foreground">Amount</th>
              <th className="px-6 py-4 font-semibold text-muted-foreground">Date</th>
              <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payouts.map((p) => (
              <tr key={p.id}>
                <td className="px-6 py-4 font-medium">{p.id}</td>
                <td className="px-6 py-4">{p.amount}</td>
                <td className="px-6 py-4 text-muted-foreground">{p.date}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
