"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Store, 
  Truck, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowRight,
  Loader2,
  Info
} from "lucide-react";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { api } from "@/utils/api";

const TABS = [
  { id: "stores", label: "Store Applications", icon: Store },
  { id: "drivers", label: "Driver Applications", icon: Truck },
];

export default function ApplicationsInboxPage() {
  const [activeTab, setActiveTab] = useState("stores");
  const [stores, setStores] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [storesData, driversData] = await Promise.all([
          api.get<any[]>("/admin/applications/stores/pending"),
          api.get<any[]>("/admin/applications/drivers/pending"),
        ]);
        setStores(storesData);
        setDrivers(driversData);
      } catch (error) {
        console.error("Failed to fetch applications", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const currentData = activeTab === "stores" ? stores : drivers;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Application Inbox</h1>
          <p className="text-gray-500">Review and verify new business partners joining the marketplace.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              placeholder="Search applications..." 
              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-100 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all relative",
              activeTab === tab.id ? "text-black" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
            <span className={cn(
               "ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold",
               activeTab === tab.id ? "bg-black text-white" : "bg-gray-100 text-gray-400"
            )}>
              {tab.id === "stores" ? stores.length : drivers.length}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm min-h-[400px]">
        {loading ? (
           <div className="flex flex-col items-center justify-center h-[400px] gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
              <p className="text-sm text-gray-400 font-medium uppercase tracking-widest">Loading partners...</p>
           </div>
        ) : currentData.length > 0 ? (
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  {activeTab === "stores" ? "Business / Type" : "Driver / Vehicle"}
                </th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  {activeTab === "stores" ? "Owner" : "License"}
                </th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Submitted</th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-wider text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentData.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                        {activeTab === "stores" ? <Store size={20} /> : <Truck size={20} />}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{item.name || item.fullName}</div>
                        <div className="text-xs text-gray-400">{item.type || item.vehicleModel}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-gray-600">
                    {activeTab === "stores" ? `${item.owner?.userProfile?.firstName} ${item.owner?.userProfile?.lastName}` : item.licensePlate}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full w-fit text-xs font-bold tracking-wide">
                      <div className="w-1 h-1 rounded-full bg-amber-600 animate-pulse" />
                      {item.status}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <Link 
                      href={`/dashboard/applications/${activeTab}/${item.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-medium opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-black/10"
                    >
                      Review <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] gap-4">
             <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                <Info className="w-8 h-8 text-gray-200" />
             </div>
             <div className="text-center space-y-1">
                <p className="font-bold text-gray-900">All caught up!</p>
                <p className="text-sm text-gray-400">There are no pending {activeTab} applications to review.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
