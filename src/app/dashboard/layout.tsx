// src/app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-64 bg-blue-700 text-white p-6 flex flex-col">
        <h2 className="text-2xl font-bold mb-10">
          Delivery System
        </h2>

        <nav className="space-y-3 text-sm opacity-90">
          <p className="uppercase tracking-wider text-blue-200">
            Main Menu
          </p>
        </nav>

        <div className="mt-auto text-xs text-blue-200">
          Secure Medical Delivery
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 p-10 overflow-auto">
        {children}
      </main>
    </div>
  );
}
