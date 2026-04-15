import { DashboardShell } from "@/components/vendor/DashboardShell";
import { Store, Globe, Mail, Phone, MapPin, Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <DashboardShell title="Store Settings">
      <div className="max-w-4xl space-y-8">
        {/* Profile Section */}
        <section className="luxury-card p-8">
          <div className="flex items-center gap-2 mb-6 text-primary">
            <Store className="h-5 w-5" />
            <h2 className="text-lg font-medium">Store Profile</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Store Name</label>
              <input type="text" defaultValue="Sands of Time" className="w-full luxury-input" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Store URL Slug</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">marketplace.com/</span>
                <input type="text" defaultValue="sands-of-time" className="w-full luxury-input pl-[124px]" />
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <textarea 
                rows={4} 
                className="w-full luxury-input" 
                defaultValue="Luxury minimal fashion inspired by the desert landscapes."
              />
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="luxury-card p-8">
          <div className="flex items-center gap-2 mb-6 text-primary">
            <Globe className="h-5 w-5" />
            <h2 className="text-lg font-medium">Business Contact</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Business Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="email" defaultValue="hello@sandsoftime.com" className="w-full luxury-input pl-12" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="tel" defaultValue="+1 (555) 000-0000" className="w-full luxury-input pl-12" />
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-4">
          <button className="px-6 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button className="luxury-button flex items-center gap-2 py-2.5">
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
