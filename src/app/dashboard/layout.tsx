// src/app/dashboard/layout.tsx

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
