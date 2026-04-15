export default function AdminSettingsPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      <p className="text-sm text-gray-600">
        Platform settings are stored in the database (`AppSetting`) and managed via future admin tools.
        Configure environment variables and Supabase from the repo root `.env` — see README.
      </p>
    </div>
  );
}
