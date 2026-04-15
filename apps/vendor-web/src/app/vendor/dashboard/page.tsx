import { DashboardShell } from "@/components/vendor/DashboardShell";
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight 
} from "lucide-react";

const stats = [
  { name: "Total Revenue", value: "$12,405.00", change: "+12.5%", trend: "up", icon: DollarSign },
  { name: "Active Orders", value: "45", change: "+4.3%", trend: "up", icon: ShoppingBag },
  { name: "New Customers", value: "12", change: "-1.2%", trend: "down", icon: Users },
  { name: "Conversion Rate", value: "3.24%", change: "+2.1%", trend: "up", icon: TrendingUp },
];

const recentOrders = [
  { id: "#ORD-7421", customer: "Sophia Anderson", date: "2 mins ago", amount: "$240.00", status: "Processing" },
  { id: "#ORD-7420", customer: "Liam Johnson", date: "1 hour ago", amount: "$1,200.00", status: "Confirmed" },
  { id: "#ORD-7419", customer: "Emma Wilson", date: "3 hours ago", amount: "$450.00", status: "Delivered" },
  { id: "#ORD-7418", customer: "Noah Davis", date: "5 hours ago", amount: "$89.00", status: "Shipping" },
];

export default function DashboardPage() {
  return (
    <DashboardShell title="Dashboard Overview">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.name} className="luxury-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-secondary rounded-lg">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div className={`flex items-center text-xs font-semibold ${item.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {item.change}
                {item.trend === 'up' ? <ArrowUpRight className="h-3 w-3 ml-1" /> : <ArrowDownRight className="h-3 w-3 ml-1" />}
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{item.name}</p>
            <p className="text-2xl font-semibold mt-1 tracking-tight text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 luxury-card overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent Orders</h2>
            <button className="text-sm font-medium text-accent-foreground hover:underline">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-secondary/30">
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4 font-medium text-primary">{order.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{order.customer}</div>
                      <div className="text-xs text-muted-foreground">{order.date}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{order.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${
                        order.status === 'Delivered' 
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Store Highlights */}
        <div className="space-y-6">
          <div className="luxury-card p-6 bg-primary text-primary-foreground border-none shadow-xl">
            <h3 className="text-lg font-medium mb-2">Grow your store</h3>
            <p className="text-sm text-primary-foreground/70 mb-6 leading-relaxed">
              Create a promotion or discount campaign to attract more customers and increase your sales.
            </p>
            <button className="w-full bg-white text-primary px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors">
              Create Campaign
            </button>
          </div>

          <div className="luxury-card p-6">
            <h3 className="text-lg font-medium mb-4">Stock Alerts</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-sm font-medium">Silk Midi Dress</span>
                <span className="ml-auto text-xs text-rose-600 font-semibold underline cursor-pointer">Reorder</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium">Cashmere Scarf</span>
                <span className="ml-auto text-xs text-amber-600 font-semibold underline cursor-pointer">Update</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
