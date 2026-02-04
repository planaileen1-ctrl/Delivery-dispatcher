"use client";

import { useState } from "react";
import { ChevronLeft, LogOut, Plus, Database, User, Users, ShieldCheck, Truck, RotateCcw } from "lucide-react";

import MenuCard from "../components/MenuCard";
import SignaturePad from "../components/SignaturePad";
import SearchableSelect from "../components/SearchableSelect";

import AddPumpForm from "../components/AddPumpForm";
import AddClientForm from "../components/AddClientForm";
import ListPumps from "../components/ListPumps";
import ListClients from "../components/ListClients";
import CreateDeliveryForm from "../components/CreateDeliveryForm";
import StaffManager from "../components/StaffManager";
import HistoryView from "../components/HistoryView";
import ReturnPumpsForm from "../components/ReturnPumpsForm";

export default function PharmacyView({
  user,
  orders,
  pumps,
  clients,
  staff,
  drivers,
  pharmacyId,
  allPumps,
  onLogout,
}: any) {
  const [section, setSection] = useState<
    | "menu"
    | "add_pump"
    | "list_pumps"
    | "add_client"
    | "list_clients"
    | "create_delivery"
    | "staff"
    | "history"
    | "receive_returns"
  >("menu");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <header className="p-8 pt-12 bg-white border-b border-slate-100 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black italic text-slate-900 uppercase">
            {user?.city}, {user?.state}
          </h2>
          <p className="text-[10px] font-black text-indigo-600 uppercase mt-1">
            Pharmacy
          </p>
        </div>

        {section !== "menu" ? (
          <button
            onClick={() => setSection("menu")}
            className="p-4 bg-slate-100 rounded-2xl"
          >
            <ChevronLeft />
          </button>
        ) : (
          <button
            onClick={onLogout}
            className="p-4 bg-red-50 text-red-500 rounded-2xl"
          >
            <LogOut />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        {section === "menu" && (
          <>
            <div className="grid grid-cols-2 gap-4 animate-in fade-in">
              <MenuCard icon={<Plus />} label="New Pump" color="bg-indigo-600" onClick={() => setSection("add_pump")} />
              <MenuCard icon={<Database />} label="Inventory" color="bg-slate-900" onClick={() => setSection("list_pumps")} />
              <MenuCard icon={<User />} label="New Client" color="bg-indigo-500" onClick={() => setSection("add_client")} />
              <MenuCard icon={<Users />} label="Clients" color="bg-slate-800" onClick={() => setSection("list_clients")} />
              <MenuCard icon={<ShieldCheck />} label="REGISTER STAFF" color="bg-amber-500" onClick={() => setSection("staff")} />
              <MenuCard icon={<Truck />} label="Dispatch" color="bg-emerald-600" onClick={() => setSection("create_delivery")} />
              <MenuCard icon={<RotateCcw />} label="RECEIVE RETURNS" color="bg-blue-600" onClick={() => setSection("receive_returns")} full />
            </div>

            <div className="col-span-2 pt-8">
              <button
                onClick={() => setSection("history")}
                className="w-full bg-slate-200 text-slate-500 py-3 rounded-xl font-black text-xs uppercase mt-4"
              >
                View History Log
              </button>
            </div>
          </>
        )}

        {section === "add_pump" && <AddPumpForm onFinish={() => setSection("menu")} pharmacyId={pharmacyId} />}
        {section === "list_pumps" && <ListPumps pumps={pumps} />}
        {section === "add_client" && <AddClientForm onFinish={() => setSection("menu")} pharmacyId={pharmacyId} />}
        {section === "list_clients" && <ListClients clients={clients} />}
        {section === "staff" && <StaffManager staff={staff} pharmacyId={pharmacyId} />}
        {section === "create_delivery" && (
          <CreateDeliveryForm
            clients={clients}
            pumps={pumps}
            onFinish={() => setSection("menu")}
            user={user}
            pharmacyId={pharmacyId}
          />
        )}
        {section === "history" && (
          <HistoryView orders={orders} allPumps={allPumps} onBack={() => setSection("menu")} />
        )}
        {section === "receive_returns" && (
          <ReturnPumpsForm
            drivers={drivers}
            pumps={pumps}
            pharmacyId={pharmacyId}
            onFinish={() => setSection("menu")}
          />
        )}
      </div>
    </div>
  );
}
