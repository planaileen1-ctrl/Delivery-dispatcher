// src/app/dashboard/layout.tsx

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 text-neutral-900">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-teal-500 to-indigo-600" />

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="rounded-2xl bg-white shadow-sm border border-neutral-200">
          {children}
        </div>
      </div>
    </div>
  );
}
