"use client";

import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  CheckCircle, 
  XCircle, 
  Info, 
  ExternalLink, 
  Download,
  Building2,
  User,
  MapPin,
  CreditCard,
  FileText,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/utils/api";

interface StoreDetail {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  profile: {
    businessEmail: string;
    businessPhone: string;
    businessAddress: string;
    logoUrl?: string;
    bannerUrl?: string;
  };
  owner: {
    email: string;
    userProfile: {
      firstName: string;
      lastName: string;
    };
  };
  documents: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
}

export default function StoreReviewDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const data = await api.get<StoreDetail>(`/admin/stores/${id}`);
        setStore(data);
      } catch (error) {
        console.error("Failed to fetch store details", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchStore();
  }, [id]);

  const handleReview = async (status: 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED') => {
    if (!store) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/applications/stores/${id}/review`, {
        status,
        adminNotes,
      });
      router.push("/dashboard/applications");
    } catch (error) {
      console.error(`Failed to ${status} application`, error);
      alert(`Error: Could not ${status.toLowerCase()} application.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-sm font-medium text-gray-400 tracking-wide uppercase">Fetching Application Data...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
        <XCircle className="w-12 h-12 text-red-500" />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Application Not Found</h2>
          <p className="text-gray-500 max-w-xs mx-auto">The store application you are looking for does not exist or has been removed.</p>
        </div>
        <Link href="/dashboard/applications" className="px-6 py-2 bg-black text-white rounded-xl text-sm font-bold">
          Return to List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/applications" 
            className="p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Review Application</h1>
            <p className="text-sm text-gray-500">ID: {id} • Current Status: <span className="font-bold text-black">{store.status}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            disabled={submitting}
            onClick={() => handleReview("INFO_REQUESTED")}
            className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Request Info
          </button>
          <button 
            disabled={submitting}
            onClick={() => handleReview("REJECTED")}
            className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl text-sm font-bold hover:bg-red-100 transition-all disabled:opacity-50"
          >
            Reject
          </button>
          <button 
            disabled={submitting}
            onClick={() => handleReview("APPROVED")}
            className="px-8 py-3 bg-black text-white rounded-2xl text-sm font-bold shadow-xl shadow-black/10 hover:opacity-90 transition-all disabled:opacity-50"
          >
            {submitting ? "Processing..." : "Approve & Activate"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-10">
        <div className="col-span-2 space-y-8">
          {/* Notes Section */}
          <section className="bg-white rounded-3xl border border-gray-100 p-8 space-y-4 shadow-sm">
             <h3 className="font-bold text-lg flex items-center gap-2">
               <FileText size={20} />
               Reviewer Notes
             </h3>
             <textarea 
               value={adminNotes}
               onChange={(e) => setAdminNotes(e.target.value)}
               placeholder="Add internal notes or reasons for rejection/info request..."
               className="w-full h-24 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-black outline-none transition-all resize-none"
             />
          </section>

          {/* Business Info Section */}
          <section className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-6">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <Building2 size={24} className="text-black" />
              </div>
              <h3 className="font-bold text-lg">Store Information</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-y-8 gap-x-12">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Official Name</span>
                <p className="font-medium text-gray-900">{store.name}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Business Type</span>
                <p className="font-medium text-gray-900">{store.type}</p>
              </div>
              <div className="col-span-2 space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Description</span>
                <p className="text-gray-600 leading-relaxed text-sm">{store.description}</p>
              </div>
            </div>
          </section>

          {/* Documentation Section */}
          <section className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-6">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <FileText size={20} className="text-black" />
              </div>
              <h3 className="font-bold text-lg">Legal Verification</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {store.documents.length > 0 ? store.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[10px] font-bold text-gray-400 border border-gray-100 uppercase tracking-tighter">
                      {doc.type}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{doc.name}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide">VERIFIED CLOUD STORAGE</div>
                    </div>
                  </div>
                  <Link 
                    href={doc.url} 
                    target="_blank"
                    className="p-2 text-gray-400 hover:text-black hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Download className="w-4 h-4" />
                  </Link>
                </div>
              )) : (
                <div className="col-span-2 py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
                  <Info size={24} className="text-gray-300" />
                  <span className="text-xs font-medium text-gray-400">No documents provided for this application</span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar / Owner Info */}
        <div className="space-y-8">
          <section className="bg-white rounded-3xl border border-gray-100 p-8 space-y-6 shadow-sm">
            <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Applicant</h4>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                <User size={28} className="text-gray-400" />
              </div>
              <div>
                <div className="font-bold text-gray-900">
                  {store.owner.userProfile.firstName} {store.owner.userProfile.lastName}
                </div>
                <div className="text-xs text-gray-400">Verified Identity</div>
              </div>
            </div>
            
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-[11px]">{store.owner.email}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{store.profile.businessPhone}</span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-gray-100 p-8 space-y-6 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-400" />
              <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Headquarters</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              {store.profile.businessAddress}
            </p>
            <button className="flex items-center gap-2 text-xs font-bold text-black border-b border-black/10 pb-1 pt-2">
              View on Map <ExternalLink className="w-3 h-3" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
