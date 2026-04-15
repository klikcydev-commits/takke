"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Settings = {
  driver: {
    vehicleType: string | null;
    licensePlate: string | null;
    isActive: boolean;
    metadata: Record<string, unknown> | null;
  };
  profile: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
  } | null;
  notificationEmailOptIn: boolean;
  notificationSmsOptIn: boolean;
};

export function DriverSettingsClient({
  driverSlug,
  isApproved,
}: {
  driverSlug: string;
  isApproved: boolean;
}) {
  const [data, setData] = useState<Settings | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const s = await apiFetch<Settings>(
          `/driver/settings?driverSlug=${encodeURIComponent(driverSlug)}`,
        );
        if (cancelled) return;
        setData(s);
        setFirstName(s.profile?.firstName ?? "");
        setLastName(s.profile?.lastName ?? "");
        setPhone(s.profile?.phone ?? "");
        setAvatarUrl(s.profile?.avatarUrl ?? "");
        setVehicleType(s.driver.vehicleType ?? "");
        setLicensePlate(s.driver.licensePlate ?? "");
        setVehicleModel(String((s.driver.metadata as { vehicleModel?: string } | null)?.vehicleModel ?? ""));
        setIsActive(s.driver.isActive);
        setEmailOptIn(s.notificationEmailOptIn);
        setSmsOptIn(s.notificationSmsOptIn);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [driverSlug]);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const updated = await apiFetch<Settings>(`/driver/settings?driverSlug=${encodeURIComponent(driverSlug)}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          avatarUrl: avatarUrl || null,
          vehicleType,
          licensePlate,
          vehicleModel,
          isActive,
          notificationEmailOptIn: emailOptIn,
          notificationSmsOptIn: smsOptIn,
        }),
      });
      setData(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse h-40 bg-[var(--color-border)] rounded-xl" />;
  }
  if (err && !data) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{err}</div>;
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h2 className="text-2xl font-serif font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Profile and vehicle details.</p>
      </div>

      {err ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">{err}</div> : null}

      {!isApproved ? (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Account pending approval — you can still update your contact info.
        </p>
      ) : null}

      <div className="luxury-card p-5 space-y-4">
        <h3 className="font-semibold">Profile</h3>
        <label className="block text-xs text-muted-foreground">First name</label>
        <input
          className="w-full rounded-lg border border-[var(--color-border)] p-2 text-sm"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <label className="block text-xs text-muted-foreground">Last name</label>
        <input
          className="w-full rounded-lg border border-[var(--color-border)] p-2 text-sm"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <label className="block text-xs text-muted-foreground">Phone</label>
        <input
          className="w-full rounded-lg border border-[var(--color-border)] p-2 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <label className="block text-xs text-muted-foreground">Avatar URL</label>
        <input
          className="w-full rounded-lg border border-[var(--color-border)] p-2 text-sm"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="luxury-card p-5 space-y-4">
        <h3 className="font-semibold">Vehicle</h3>
        <label className="block text-xs text-muted-foreground">Vehicle type</label>
        <input
          className="w-full rounded-lg border border-[var(--color-border)] p-2 text-sm"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        />
        <label className="block text-xs text-muted-foreground">Model</label>
        <input
          className="w-full rounded-lg border border-[var(--color-border)] p-2 text-sm"
          value={vehicleModel}
          onChange={(e) => setVehicleModel(e.target.value)}
        />
        <label className="block text-xs text-muted-foreground">License plate</label>
        <input
          className="w-full rounded-lg border border-[var(--color-border)] p-2 text-sm"
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value)}
        />
      </div>

      {isApproved ? (
        <div className="luxury-card p-5 space-y-4">
          <h3 className="font-semibold">Availability</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Available for new assignments
          </label>
        </div>
      ) : null}

      <div className="luxury-card p-5 space-y-4">
        <h3 className="font-semibold">Notifications</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} />
          Email updates
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} />
          SMS updates (when supported)
        </label>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="luxury-button px-6 py-2.5 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
