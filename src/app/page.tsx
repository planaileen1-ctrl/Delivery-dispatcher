"use client";

import React, { useEffect, useState, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  serverTimestamp,
  writeBatch,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp
} from "firebase/firestore";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously
} from "firebase/auth";
import { 
  Truck, CheckCircle, XCircle, AlertTriangle, 
  MapPin, Plus, Mail, Lock, Users, Database, 
  LogOut, ChevronLeft, ArrowRight, RefreshCw, 
  Loader2, Key, Trash2, ShieldCheck, Ticket, 
  Send, X, PenTool, Eraser, FileClock, 
  RotateCcw, BookOpen, Info, Shield, Search, UserPlus, Bell
} from 'lucide-react';

/* ==========================================================================
   1. FIREBASE CONFIGURATION
   ========================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyAUlLbEm5swojdlsFc-FSZaA212hJCQv3I",
  authDomain: "delivery-dispatcher-f11cc.firebaseapp.com",
  projectId: "delivery-dispatcher-f11cc",
  storageBucket: "delivery-dispatcher-f11cc.firebasestorage.app",
  messagingSenderId: "500959573570",
  appId: "1:500959573570:web:de1a3e313ca9e991f8dfdb"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

const LOCATIONS: Record<string, { label: string, states: string[] }> = {
  US: { label: "United States", states: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD", "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC", "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"] },
  EC: { label: "Ecuador", states: ["Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo", "Sucumbíos", "Tungurahua", "Zamora Chinchipe"] }
};

/* ==========================================================================
   2. DATA INTERFACES
   ========================================================================== */
interface Pump { id: string; code: string; brand?: string; model?: string; status: 'available' | 'with_client' | 'maintenance' | 'with_driver'; currentClientId?: string | null; currentDriverId?: string | null; pharmacyId: string; deliveredBy?: string; }
interface Client { id: string; name: string; email: string; address: string; city: string; state?: string; country?: string; pharmacyId: string; }
interface Order { id: string; orderCode: string; clientName: string; clientEmail: string; clientId: string; address: string; city: string; status: "ready" | "claimed" | "picked_up" | "delivered" | "cancelled"; pumps: { pumpId: string; code: string }[]; pharmacyId: string; createdAt: any; claimedBy?: string; state?: string; country?: string; }
interface Employee { id: string; name: string; pin: string; role: 'driver' | 'pharmacy_admin' | 'pharmacy_staff'; email: string; city?: string; state?: string; country?: string; pharmacyId?: string; signature?: string; }

/* ==========================================================================
   3. ATOMIC UI COMPONENTS
   ========================================================================== */

function LoadingScreen() { 
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8 text-center">
      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
      <p className="font-black uppercase text-[10px] tracking-[0.3em] opacity-30">Starting Dispatcher Pro...</p>
    </div>
  ); 
}

function SignaturePad({ onSave, label }: { onSave: (data: string) => void, label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasSignature, setHasSignature] = useState(false);
  
  const getCoordinates = (event: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    if(e.type === 'touchstart') document.body.style.overflow = 'hidden';
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.strokeStyle = "#000";
    const move = (mE: any) => {
        if(mE.type === 'touchmove') mE.preventDefault();
        const c = getCoordinates(mE, canvas); ctx.lineTo(c.x, c.y); ctx.stroke(); setHasSignature(true);
    };
    const end = () => {
        document.body.style.overflow = 'auto';
        canvas.removeEventListener('mousemove', move); window.removeEventListener('mouseup', end);
        canvas.removeEventListener('touchmove', move); canvas.removeEventListener('touchend', end);
        onSave(canvas.toDataURL());
    };
    canvas.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
    canvas.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', end);
  };

  return (
    <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-sm text-slate-900">
        <div className="flex justify-between items-center mb-1 text-slate-400">
            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><PenTool className="w-3 h-3"/> {label}</label>
            <button onClick={() => { const c = canvasRef.current; const ctx = c?.getContext('2d'); ctx?.clearRect(0,0,c!.width,c!.height); setHasSignature(false); onSave(""); }} type="button" className="text-red-400 p-1 hover:bg-red-50 rounded-full transition-colors"><Eraser className="w-4 h-4"/></button>
        </div>
        <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden touch-none relative h-32">
            <canvas ref={canvasRef} width={400} height={200} className="w-full h-full block cursor-crosshair" onMouseDown={startDrawing} onTouchStart={startDrawing} />
            {!hasSignature && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-[10px] font-black uppercase text-center">Sign here</div>}
        </div>
    </div>
  );
}

function SearchableSelect({ label, options, value, onChange, placeholder }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => { if (!value) setSearchQuery(""); }, [value]);
  const filtered = options.filter((o: any) => (o.label || "").toLowerCase().includes(searchQuery.toLowerCase()));
  return (
    <div className="space-y-2 relative text-slate-900">
      <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">{label}</label>
      <div className="relative">
        <input className="w-full p-4 rounded-2xl border-2 border-slate-200 font-bold bg-white outline-none focus:border-indigo-500 text-slate-700 uppercase text-xs" placeholder={value ? options.find((o: any) => o.value === value)?.label : placeholder} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Search className="w-5 h-5" /></div>
        {isOpen && (
          <><div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div><div className="absolute top-full left-0 w-full bg-white mt-2 rounded-2xl shadow-2xl border border-slate-100 max-h-60 overflow-y-auto z-20 text-slate-900 text-left">{filtered.length === 0 ? (
                <div className="p-4 text-xs font-bold text-slate-400 text-center">No results found</div>
              ) : (
                filtered.map((opt: any) => (
                  <div key={opt.value} className="p-4 border-b border-slate-50 hover:bg-indigo-50 cursor-pointer transition-colors text-left" onClick={() => { onChange(opt.value); setSearchQuery(""); setIsOpen(false); }}>
                    <p className="font-bold text-sm text-slate-800">{opt.label}</p>
                    {opt.sub && <p className="text-[9px] text-slate-400 font-black uppercase">{opt.sub}</p>}
                  </div>
                ))
              )}</div></>
        )}
      </div>
    </div>
  );
}

function MenuCard({ icon, label, color, onClick, full, badge }: any) {
  return (
    <button onClick={onClick} className={`${color} ${full ? 'col-span-2' : ''} p-6 rounded-4xl text-white flex flex-col items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all relative`}>
      {badge > 0 && (
        <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-lg">
          {badge}
        </div>
      )}
      <div className="bg-white/20 p-4 rounded-3xl">{icon}</div>
      <span className="font-black text-[10px] uppercase tracking-widest text-center leading-tight">{label}</span>
    </button>
  );
}

/* ==========================================================================
   4. MANUAL VIEW
   ========================================================================== */

function ManualView({ onBack }: { onBack: () => void }) {
  const steps = [
    { title: "Account Activation", content: "Pharmacy admins must register with a License Key. Once created, they receive a PIN. Employees can register themselves using the pharmacy's name and admin's PIN.", icon: <Key className="w-5 h-5"/> },
    { title: "Inventory Control", content: "Load equipment using Serial Numbers (S/N). The system tracks real-time status: Available, With Client, or With Driver.", icon: <Database className="w-5 h-5"/> },
    { title: "Notification Badges", content: "Look for numeric badges (red numbers) on your dashboard. They indicate pending dispatches or equipment that needs to be received from drivers.", icon: <Bell className="w-5 h-5"/> },
    { title: "Handover Security", content: "Dual digital signatures are mandatory for every custody transfer to ensure a legal record of responsibility.", icon: <ShieldCheck className="w-5 h-5"/> }
  ];
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 animate-in fade-in">
        <header className="p-6 bg-[#0f172a] text-white flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3 text-white">
                <div className="bg-emerald-500 p-2 rounded-xl shadow-lg"><BookOpen className="w-6 h-6 text-slate-950"/></div>
                <h2 className="text-xl font-black italic uppercase tracking-tighter">Support & Manual</h2>
            </div>
            <button onClick={onBack} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-white"><X className="w-6 h-6 text-white"/></button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
            {steps.map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-3 text-indigo-600 font-black uppercase text-sm">
                        {s.icon} {s.title}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{s.content}</p>
                </div>
            ))}
        </div>
        <div className="p-6 fixed bottom-0 left-0 w-full bg-slate-50/80 backdrop-blur-md">
            <button onClick={onBack} className="w-full bg-[#0f172a] text-white py-5 rounded-3xl font-black uppercase text-xs active:scale-95 text-white">Return to Menu</button>
        </div>
    </div>
  );
}

/* ==========================================================================
   5. PHARMACY ADMIN & STAFF DASHBOARD
   ========================================================================== */

function PharmacyAdminView({ orders, pumps, clients, staff, onLogout, user, pharmacyId, allPumps, drivers, onOpenManual }: any) {
  const [section, setSection] = useState<'menu'|'add_pump'|'list_pumps'|'add_client'|'list_clients'|'create_delivery'|'staff'|'history'|'receive_returns'>('menu');
  
  // LOGICA DE NOTIFICACIONES (BADGES)
  const pendingDispatchCount = orders.filter((o: Order) => o.status === 'ready').length;
  const pendingReturnsFromDrivers = allPumps.filter((p: Pump) => p.status === 'with_driver' && p.pharmacyId === pharmacyId).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative text-slate-900">
        <header className="p-8 pt-12 bg-white border-b border-slate-100 flex justify-between items-end shadow-sm">
          <div><h2 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">{user.city || 'Office'}</h2><p className="text-[10px] font-black text-emerald-600 mt-1 uppercase tracking-widest">{user.role.replace('_', ' ')}</p></div>
          <div className="flex gap-2">
            <button onClick={onOpenManual} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><BookOpen className="w-6 h-6"/></button>
            {section!=='menu'?<button onClick={()=>setSection('menu')} className="p-4 bg-slate-100 rounded-2xl"><ChevronLeft className="text-slate-900"/></button>:<button onClick={onLogout} className="p-4 bg-red-50 text-red-500 rounded-2xl"><LogOut/></button>}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 pb-24">
            {section==='menu' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <MenuCard icon={<Plus/>} label="New Asset" color="bg-indigo-600" onClick={()=>setSection('add_pump')}/>
                <MenuCard icon={<Database/>} label="Inventory" color="bg-[#0f172a]" onClick={()=>setSection('list_pumps')}/>
                <MenuCard icon={<UserPlus/>} label="New Patient" color="bg-emerald-600" onClick={()=>setSection('add_client')}/>
                <MenuCard icon={<Users/>} label="Patients" color="bg-slate-800" onClick={()=>setSection('list_clients')}/>
                <MenuCard icon={<ShieldCheck/>} label="Staff List" color="bg-amber-500" onClick={()=>setSection('staff')}/>
                <MenuCard icon={<Truck/>} label="Dispatch" color="bg-indigo-500" onClick={()=>setSection('create_delivery')} badge={pendingDispatchCount}/>
                <MenuCard icon={<RotateCcw/>} label="RECEIVE RETURNS" color="bg-blue-600" onClick={()=>setSection('receive_returns')} full badge={pendingReturnsFromDrivers}/>
                <MenuCard icon={<FileClock/>} label="Full History" color="bg-slate-500" onClick={()=>setSection('history')} full />
              </div>
            )}
            {section==='add_pump' && <AddPumpForm onFinish={()=>setSection('menu')} pharmacyId={pharmacyId}/>}
            {section==='list_pumps' && <ListPumps pumps={pumps} readOnly={user.role==='pharmacy_staff'}/>}
            {section==='add_client' && <AddClientForm onFinish={()=>setSection('menu')} pharmacyId={pharmacyId} user={user}/>}
            {section==='list_clients' && <ListClients clients={clients} readOnly={user.role==='pharmacy_staff'}/>}
            {section==='staff' && <StaffManager staff={staff} pharmacyId={pharmacyId}/>}
            {section==='create_delivery' && <CreateDeliveryForm clients={clients} pumps={pumps} onFinish={()=>setSection('menu')} user={user} pharmacyId={pharmacyId}/>}
            {section==='history' && <HistoryLogView orders={orders} onBack={()=>setSection('menu')} />}
            {section==='receive_returns' && <ReturnPumpsForm drivers={drivers} pumps={allPumps} onFinish={()=>setSection('menu')} pharmacyId={pharmacyId}/>}
        </div>
    </div>
  );
}

/* ==========================================================================
   6. FORMS & UTILS
   ========================================================================== */

function AddPumpForm({ onFinish, pharmacyId }: any) {
  const [f, setF] = useState({ code: '', brand: '', model: '' }); const [msg, setMsg] = useState("");
  const save = async () => { if (!f.code) return; const dateStr = new Date().toLocaleDateString('en-US'); await addDoc(collection(db, 'pumps'), { ...f, status: 'available', lastReview: dateStr, pharmacyId }); setMsg(`S/N ${f.code} saved`); setF({ code: '', brand: '', model: '' }); setTimeout(() => setMsg(""), 3000); };
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <div className="flex justify-between items-center"><h3 className="font-black text-xl italic uppercase text-slate-900">New Asset</h3><button onClick={onFinish} className="bg-slate-100 p-2 rounded-xl text-xs font-bold text-slate-500">Back</button></div>
      {msg && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-center font-bold text-xs">{msg}</div>}
      <div className="space-y-4 bg-white p-6 rounded-4xl border border-slate-100 shadow-sm text-slate-900"><input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold focus:border-indigo-500" placeholder="Serial Number (S/N)" value={f.code} onChange={e=>setF({...f, code: e.target.value})} /><div className="grid grid-cols-2 gap-2"><input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-sm" placeholder="Brand" value={f.brand} onChange={e=>setF({...f, brand: e.target.value})} /><input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-sm" placeholder="Model" value={f.model} onChange={e=>setF({...f, model: e.target.value})} /></div></div>
      <button onClick={save} className="w-full bg-[#0f172a] text-white py-5 rounded-4xl font-black uppercase text-xs active:scale-95 text-white">Save Equipment</button>
    </div>
  );
}

function ListPumps({ pumps, readOnly }: { pumps: Pump[], readOnly?: boolean }) {
  const remove = async(id: string) => { if(confirm("Permanently delete equipment?")) await deleteDoc(doc(db,'pumps',id)); };
  return (
    <div className="space-y-3 pb-20 animate-in fade-in">
        {pumps.map((p: Pump) => (
          <div key={p.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm mb-3">
            <div><p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">S/N: {p.code}</p><p className="font-bold text-slate-800">{p.brand || 'No Brand'}</p><span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg mt-1 inline-block ${p.status === 'with_driver' ? 'bg-blue-100 text-blue-600' : p.status === 'with_client' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>{p.status.replace('_', ' ')}</span></div>
            {!readOnly && <button onClick={() => remove(p.id)} className="text-slate-300 p-2 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>}
          </div>
        ))}
    </div>
  );
}

function AddClientForm({ onFinish, pharmacyId, user }: any) {
  const [f, setF] = useState({ name: '', email: '', address: '', city: '', state: '' }); const [msg, setMsg] = useState("");
  const save = async () => { if (!f.name) return; await addDoc(collection(db, 'clients'), { ...f, pharmacyId, country: user.country || 'EC' }); setMsg(`Patient ${f.name} saved`); setF({ name: '', email: '', address: '', city: '', state: '' }); setTimeout(() => setMsg(""), 3000); };
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 text-slate-900">
      <div className="flex justify-between items-center"><h3 className="font-black text-xl italic uppercase tracking-tighter text-slate-900">New Patient</h3><button onClick={onFinish} className="bg-slate-100 p-2 rounded-xl text-xs font-bold text-slate-500">Back</button></div>
      {msg && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-center font-bold text-xs">{msg}</div>}
      <div className="bg-white p-6 rounded-4xl border border-slate-100 space-y-4 shadow-sm"><input className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none" placeholder="Full Legal Name" value={f.name} onChange={e=>setF({...f, name: e.target.value})} /><input className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none" placeholder="Patient Email" value={f.email} onChange={e=>setF({...f, email: e.target.value})} /><div className="grid grid-cols-2 gap-2"><input className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none" placeholder="Home Address" value={f.address} onChange={e=>setF({...f, address: e.target.value})} /><input className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none" placeholder="City" value={f.city} onChange={e=>setF({...f, city: e.target.value})} /></div></div>
      <button onClick={save} className="w-full bg-emerald-600 text-slate-900 py-5 rounded-4xl font-black uppercase text-xs shadow-xl active:scale-95 text-white shadow-emerald-500/20">Register Profile</button>
    </div>
  );
}

function ListClients({ clients, readOnly }: { clients: Client[], readOnly?: boolean }) {
  const del = async (id: string) => { if(confirm("Delete patient profile?")) { await deleteDoc(doc(db, 'clients', id)); } };
  return (
    <div className="space-y-4 pb-20 animate-in fade-in">
        {clients.map((c: Client) => (
          <div key={c.id} className="bg-white p-6 rounded-3xl border flex flex-col gap-1 shadow-sm relative border-slate-100">
            {!readOnly && <button onClick={() => del(c.id)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
            <h4 className="font-black text-slate-800 text-lg">{c.name}</h4><p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</p><p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.address}, {c.city}</p>
          </div>
        ))}
    </div>
  );
}

function StaffManager({ staff, pharmacyId }: any) {
  const [f, setF] = useState({ name: '', email: '' }); const [p, setP] = useState(""); const [s, setS] = useState("");
  const create = async () => { if (!f.name || !s) return; const pinVal = Math.floor(1000 + Math.random()*9000).toString(); await addDoc(collection(db, 'pharmacyEmployees'), { ...f, pin: pinVal, role: 'pharmacy_staff', pharmacyId, signature: s }); setP(pinVal); };
  return (
    <div className="space-y-6 animate-in fade-in text-slate-900"> 
      {p ? (
        <div className="bg-emerald-500 text-white p-8 rounded-4xl text-center shadow-lg"><p className="font-bold mb-2 uppercase tracking-widest text-white">STAFF ACCESS PIN:</p><p className="text-6xl font-black">{p}</p><button onClick={()=>setP("")} className="mt-6 text-xs underline text-white">Register another member</button></div>
      ) : (
        <div className="bg-white p-8 rounded-4xl shadow-xl border border-slate-100 space-y-4"><input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900" placeholder="Full Staff Name" onChange={e=>setF({...f, name: e.target.value})} /><SignaturePad onSave={setS} label="Employee Signature" /><button onClick={create} disabled={!s} className="w-full bg-[#0f172a] text-white py-5 rounded-2xl font-black uppercase text-xs disabled:opacity-50 text-white shadow-slate-900/10">Generate Access PIN</button></div>
      )}
      <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase ml-2">Registered Staff</p>{staff.map((s: any) => (<div key={s.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex justify-between"><span className="font-bold text-xs">{s.name}</span><span className="text-[10px] text-slate-400">PIN: ****</span></div>))}</div>
    </div>
  );
}

function CreateDeliveryForm({ clients, pumps, onFinish, user, pharmacyId }: any) {
  const [cId, setCId] = useState(''); const [sP, setSP] = useState<Pump[]>([]); const [debts, setDebts] = useState<Pump[]>([]);
  useEffect(() => { if (!cId) { setDebts([]); return; } setDebts(pumps.filter((p: Pump) => p.currentClientId === cId && p.status === 'with_client')); }, [cId, pumps]);
  const add = (id: string) => { const p = pumps.find((x: Pump) => x.id === id); if (p) setSP([...sP, p]); };
  const create = async () => {
    if (!cId || sP.length === 0) return; const c = clients.find((x: any) => x.id === cId);
    await addDoc(collection(db, 'deliveries'), { orderCode: Math.floor(1000 + Math.random()*9000).toString(), clientName: c.name, clientEmail: c.email, clientId: c.id, address: c.address, city: user.city || 'Unknown', state: user.state || 'Unknown', country: user.country || 'EC', status: 'ready', pumps: sP.map((p: Pump) => ({ pumpId: p.id, code: p.code })), createdAt: serverTimestamp(), pharmacyId });
    onFinish();
  };
  return (
    <div className="space-y-6 animate-in zoom-in-95 text-slate-900">
      <div className="bg-white p-8 rounded-4xl shadow-xl border border-slate-100 space-y-6 text-slate-900"><SearchableSelect label="1. Select Patient" options={clients.map((c:any)=>({label:c.name, value:c.id}))} value={cId} onChange={setCId} />
        {debts.length > 0 && (<div className="bg-red-50 p-4 rounded-2xl border border-red-100 animate-pulse"><p className="text-[10px] font-black text-red-600 mb-2 uppercase flex items-center gap-1 text-red-600"><AlertTriangle className="w-3 h-3"/> UNRETURNED ASSETS AT HOME:</p><div className="flex flex-wrap gap-1 text-slate-900">{debts.map((p: Pump) => <span key={p.id} className="text-[10px] bg-white px-2 py-1 rounded font-mono font-bold text-red-700 border border-red-200 text-red-700">{p.code}</span>)}</div></div>)}
        <SearchableSelect label="2. Assign Delivery Items" options={pumps.filter((p:Pump)=>p.status==='available'&&!sP.find(x=>x.id===p.id)).map((p:Pump)=>({label:p.code, value:p.id}))} value="" onChange={add} />
        {sP.length > 0 && (<div className="space-y-2 text-slate-900">{sP.map((p: Pump) => (<div key={p.id} className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-slate-900"><div><p className="font-black text-xs uppercase opacity-70">S/N: {p.code}</p></div><button onClick={()=>setSP(sP.filter(x=>x.id!==p.id))} className="text-red-500 hover:bg-red-50 p-1 rounded-full text-red-500"><XCircle className="w-5 h-5 text-red-500"/></button></div>))}</div>)}
      </div>
      <button onClick={create} disabled={!cId || sP.length === 0} className="w-full bg-[#0f172a] text-white py-6 rounded-4xl font-black uppercase text-xs shadow-xl active:scale-95 text-white shadow-slate-900/10">Initialize Dispatch</button>
    </div>
  );
}

function ReturnPumpsForm({ drivers, pumps, onFinish, pharmacyId }: any) {
    const [driverId, setDriverId] = useState(""); const [selectedPumps, setSelectedPumps] = useState<string[]>([]); const [signDriver, setSignDriver] = useState(""); const [signStaff, setSignStaff] = useState(""); const [loading, setLoading] = useState(false);
    const indebtedDrivers = drivers.filter((d: Employee) => pumps.some((p: Pump) => p.status === 'with_driver' && p.currentDriverId === d.id && p.pharmacyId === pharmacyId));
    const driverPumps = pumps.filter((p: Pump) => p.status === 'with_driver' && p.currentDriverId === driverId && p.pharmacyId === pharmacyId);
    const processReturn = async () => {
        if (!signDriver || !signStaff || selectedPumps.length === 0) return; setLoading(true);
        const b = writeBatch(db);
        selectedPumps.forEach((id: string) => b.update(doc(db, 'pumps', id), { status: 'available', currentDriverId: null, lastReview: `Returned on ${new Date().toLocaleDateString()}` }));
        await b.commit(); setLoading(false); onFinish();
    };
    return (
        <div className="space-y-6 p-4 animate-in zoom-in-95 text-slate-900">
            <div className="flex justify-between items-center text-slate-900"><h3 className="font-black text-xl italic uppercase text-slate-900">Inventory Reception</h3><button onClick={onFinish} className="bg-slate-100 p-2 rounded-xl text-xs font-bold text-slate-500 text-slate-500">Back</button></div>
            <div className="bg-white p-6 rounded-4xl shadow-lg border border-slate-100 space-y-6 text-slate-900">
                <SearchableSelect label="1. Select Returning Driver" options={indebtedDrivers.map((d:Employee)=>({label:d.name, value:d.id}))} value={driverId} onChange={(val: string) => { setDriverId(val); setSelectedPumps([]); }} />
                {driverId && driverPumps.length > 0 && (<div className="space-y-2 text-slate-900"><p className="text-[10px] font-black text-slate-400 uppercase ml-2">Equipment in driver possession</p>{driverPumps.map((p: Pump) => (<div key={p.id} onClick={() => setSelectedPumps(selectedPumps.includes(p.id) ? selectedPumps.filter(i=>i!==p.id) : [...selectedPumps, p.id])} className={`flex justify-between items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedPumps.includes(p.id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100'}`}><div><p className="font-black text-slate-900 text-sm">S/N: {p.code}</p></div>{selectedPumps.includes(p.id) && <CheckCircle className="w-5 h-5 text-emerald-500" />}</div>))}</div>)}
                {selectedPumps.length > 0 && (<div className="space-y-4 pt-4 border-t border-slate-100 text-slate-900"><SignaturePad onSave={setSignDriver} label="Driver Handover Signature" /><SignaturePad onSave={setSignStaff} label="Staff Receipt Signature" /></div>)}
            </div>
            <button onClick={processReturn} disabled={loading || !signDriver || !signStaff || selectedPumps.length === 0} className="w-full bg-[#10b981] text-slate-900 py-5 rounded-4xl font-black uppercase text-xs active:scale-95 disabled:opacity-50 text-white shadow-emerald-500/20">Confirm Handover</button>
        </div>
    );
}

function HistoryLogView({ orders, onBack }: any) {
  const hist = (orders || []).filter((o: any) => o.status === 'delivered' || o.status === 'cancelled').sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds);
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
        <div className="p-6 flex justify-between items-center bg-white border-b sticky top-0 z-20 text-slate-900"><h2 className="text-xl font-black italic uppercase text-slate-900">History Log</h2><button onClick={onBack} className="bg-slate-100 p-2 rounded-xl text-xs font-bold text-slate-500">Back</button></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 text-slate-900">
            {hist.length === 0 ? <p className="text-center py-20 opacity-30 uppercase text-xs font-black">History empty</p> : hist.map((o: any) => (
                <div key={o.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 animate-in text-slate-900"><div className="flex justify-between items-start mb-2"><span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest text-indigo-600">#{o.orderCode}</span><span className={`text-[8px] px-2 py-1 rounded font-black uppercase ${o.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{o.status}</span></div><h4 className="font-bold text-slate-800">{o.clientName}</h4><p className="text-[10px] text-slate-400 mb-3 uppercase text-slate-400">{o.address}</p>{o.signatureClient && (<div className="mt-2 border-t border-slate-100 pt-2 text-center text-slate-900"><p className="text-[8px] font-black text-slate-300 uppercase mb-1">Receiver Signature</p><img src={o.signatureClient} alt="Sig" className="h-8 mx-auto object-contain opacity-60" /></div>)}</div>
            ))}
        </div>
    </div>
  );
}

/* ==========================================================================
   7. SELECTION & AUTH VIEWS
   ========================================================================== */

function SelectionView({ onLogin, onRegister, onOpenManual }: any) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8 text-white relative overflow-hidden text-center text-white">
        <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center mb-8 shadow-2xl animate-bounce duration-[3000ms] shadow-emerald-500/20 text-white"><Truck className="w-12 h-12 text-[#0f172a]" /></div>
        <h1 className="text-4xl font-black italic tracking-tighter mb-1 uppercase text-white">Dispatcher Pro</h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-16 opacity-50 text-white">Smart Medical Logistics Platform</p>
        <div className="w-full max-w-xs space-y-4 text-white">
            <button onClick={onLogin} className="w-full bg-white text-[#0f172a] py-6 rounded-4xl font-black uppercase text-xs flex items-center justify-between px-10 shadow-xl transition-all active:scale-95 text-[#0f172a]"><span>Portal Access</span><ArrowRight className="w-5 h-5 text-emerald-600"/></button>
            <button onClick={onRegister} className="w-full bg-white/5 border border-white/10 py-6 rounded-4xl font-black uppercase text-xs flex items-center justify-between px-10 hover:bg-white/10 transition-all active:scale-95 text-white"><span>Register Account</span><Plus className="w-5 h-5 text-emerald-400"/></button>
            <button onClick={onOpenManual} className="w-full mt-4 flex items-center justify-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors text-indigo-400"><BookOpen className="w-4 h-4 text-indigo-400"/> Help & Manual</button>
        </div>
    </div>
  );
}

function LoginView({ pin, error, onInput, onClear, onBack }: any) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center p-8 text-white text-white">
        <button onClick={onBack} className="self-start p-4 bg-white/5 rounded-2xl mb-8 transition-colors hover:bg-white/10 text-white"><ChevronLeft className="text-white"/></button>
        <h2 className="text-3xl font-black italic mb-2 tracking-tighter uppercase text-center text-white">Secure Access</h2>
        <div className="flex gap-4 mb-16 h-8 mt-10 text-white text-white">{[...Array(4)].map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-emerald-500 scale-150 shadow-lg shadow-emerald-500/50' : 'bg-slate-800'}`} />))}</div>
        {error && <p className="text-red-500 text-[10px] font-black uppercase mb-6 animate-pulse text-center text-red-500 text-red-500">{error}</p>}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[300px] text-white">
            {[1,2,3,4,5,6,7,8,9].map(n => (<button key={n} onClick={() => onInput(n.toString())} className="h-20 rounded-3xl bg-white/5 text-2xl font-black hover:bg-white/10 active:scale-90 transition-all text-white">{n}</button>))}
            <button onClick={onClear} className="h-20 rounded-3xl bg-red-500/10 text-red-500 font-black text-xs uppercase flex items-center justify-center active:scale-95 text-red-500 text-red-500 text-red-500">CLR</button>
            <button onClick={() => onInput("0")} className="h-20 rounded-3xl bg-white/5 text-2xl font-black text-white">0</button>
        </div>
    </div>
  );
}

function RegisterView({ onBack, allAdmins }: { onBack: () => void, allAdmins: Employee[] }) {
    const [form, setForm] = useState({ name: '', email: '', role: 'driver' as any, city: '', state: '', country: 'US', pharmacyId: '' }); 
    const [lic, setLic] = useState(""); const [newPin, setNewPin] = useState(""); const [sign, setSign] = useState(""); const [load, setLoad] = useState(false);
    const [adminPinToJoin, setAdminPinToJoin] = useState("");

    const register = async () => {
        if (!form.name || !form.email || !form.city || !form.state) return;
        if ((form.role === 'driver' || form.role === 'pharmacy_staff') && !sign) return;
        setLoad(true);
        try {
            if (form.role === 'pharmacy_admin') {
                const q = query(collection(db, 'pharmacyEmployees'), where('role', '==', 'license_code'), where('code', '==', lic), where('status', '==', 'active'));
                const s = await getDocs(q); if (s.empty) { alert("Invalid or Expired Activation Code"); setLoad(false); return; }
                await updateDoc(doc(db, 'pharmacyEmployees', s.docs[0].id), { status: 'used', usedBy: form.email });
            }
            if (form.role === 'pharmacy_staff') {
                const admin = allAdmins.find(a => a.id === form.pharmacyId && a.pin === adminPinToJoin);
                if (!admin) { alert("Invalid Pharmacy Authorization PIN"); setLoad(false); return; }
            }

            const pinVal = Math.floor(1000 + Math.random() * 9000).toString();
            const col = form.role === 'driver' ? 'deliveryDrivers' : 'pharmacyEmployees';
            const docRef = await addDoc(collection(db, col), { ...form, pin: pinVal, signature: sign || "", createdAt: serverTimestamp() });
            if (form.role === 'pharmacy_admin') await updateDoc(docRef, { pharmacyId: docRef.id });
            
            // EMAIL NOTIFICATION API CALL
            try {
              await fetch("/api/send-email", { 
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ 
                  to: form.email, 
                  subject: "Dispatcher Pro - Your Access PIN", 
                  html: `<h3>Registration Successful</h3><p>Welcome ${form.name}. Your access PIN is: <b>${pinVal}</b></p>` 
                }) 
              });
            } catch (e) { console.warn("Email API error:", e); }
            
            setNewPin(pinVal);
        } catch (e: any) { alert(e.message); } setLoad(false);
    };

    if (newPin) return (<div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8 text-white text-center shadow-inner text-white"><h2 className="text-3xl font-black italic mb-4 uppercase text-white tracking-tighter text-white">Registration Complete</h2><p className="text-sm text-slate-400 mb-2 uppercase tracking-widest text-white">Your Private Access PIN:</p><p className="text-7xl font-black text-emerald-400 mb-10 tracking-tighter text-emerald-400">{newPin}</p><button onClick={onBack} className="w-full bg-white text-[#0f172a] py-5 rounded-4xl font-black uppercase text-xs active:scale-95 transition-all text-slate-950 shadow-emerald-500/20">Login Now</button></div>);
    
    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col p-8 text-white overflow-y-auto pb-20 text-white">
            <button onClick={onBack} className="self-start p-4 bg-white/5 rounded-2xl mb-8 transition-colors hover:bg-white/10 text-white"><ChevronLeft className="text-white"/></button>
            <h2 className="text-3xl font-black italic mb-8 uppercase tracking-tighter text-white">Account Setup</h2>
            <div className="flex flex-wrap gap-2 mb-8 text-white">
                <button onClick={() => setForm({...form, role: 'driver'})} className={`flex-1 py-4 rounded-2xl font-black text-[9px] uppercase border transition-all ${form.role === 'driver' ? 'bg-indigo-600 border-indigo-600 shadow-lg text-white' : 'bg-transparent border-white/10 text-slate-400'}`}>Driver Registration</button>
                <button onClick={() => setForm({...form, role: 'pharmacy_admin'})} className={`flex-1 py-4 rounded-2xl font-black text-[9px] uppercase border transition-all ${form.role === 'pharmacy_admin' ? 'bg-indigo-600 border-indigo-600 shadow-lg text-white' : 'bg-transparent border-white/10 text-slate-400'}`}>Pharmacy Registration</button>
                <button onClick={() => setForm({...form, role: 'pharmacy_staff'})} className={`flex-1 py-4 rounded-2xl font-black text-[9px] uppercase border transition-all ${form.role === 'pharmacy_staff' ? 'bg-indigo-600 border-indigo-600 shadow-lg text-white' : 'bg-transparent border-white/10 text-slate-400'}`}>Staff Registration</button>
            </div>
            <div className="space-y-4 text-white text-white">
                {form.role === 'pharmacy_admin' && (<input className="w-full bg-white/5 p-4 rounded-2xl font-black border border-emerald-500/30 text-emerald-300 outline-none uppercase placeholder-emerald-500/50" placeholder="Activation License Key" value={lic} onChange={e=>setLic(e.target.value.toUpperCase())} />)}
                {form.role === 'pharmacy_staff' && (
                  <div className="space-y-3 p-4 bg-white/5 rounded-3xl border border-white/10 text-white">
                    <SearchableSelect label="Authorized Pharmacy" options={allAdmins.map(a=>({label: `${a.name} (${a.city})`, value: a.id}))} value={form.pharmacyId} onChange={(v:any)=>setForm({...form, pharmacyId: v})}/>
                    <input className="w-full bg-white/10 p-4 rounded-2xl font-black outline-none text-center text-white" placeholder="Admin PIN Code" maxLength={4} value={adminPinToJoin} onChange={e=>setAdminPinToJoin(e.target.value)} />
                  </div>
                )}
                <input className="w-full bg-white/5 p-4 rounded-2xl font-bold border border-white/10 outline-none text-white placeholder-white/30" placeholder="Full Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
                <input className="w-full bg-white/5 p-4 rounded-2xl font-bold border border-white/10 outline-none text-white placeholder-white/30" placeholder="Email Address" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} />
                <div className="grid grid-cols-2 gap-2 text-slate-900">
                    <select className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-sm text-white" value={form.state} onChange={e=>setForm({...form, state: e.target.value})}><option value="" className="text-black text-black">Select State...</option>{LOCATIONS[form.country]?.states.map(s=><option key={s} value={s} className="text-black">{s}</option>)}</select>
                    <input className="bg-white/5 p-4 w-full rounded-2xl border border-white/10 font-bold outline-none text-white placeholder-white/30" placeholder="City" value={form.city} onChange={e=>setForm({...form, city: e.target.value})} />
                </div>
                {(form.role === 'driver' || form.role === 'pharmacy_staff') && <SignaturePad onSave={setSign} label="Identity Validation Signature" />}
                <button onClick={register} disabled={load || ((form.role==='driver' || form.role==='pharmacy_staff') && !sign)} className="w-full bg-emerald-600 py-6 rounded-4xl font-black uppercase text-sm mt-4 shadow-xl active:scale-95 transition-all disabled:opacity-50 text-slate-950 shadow-emerald-500/30 text-slate-950">{load ? "Processing..." : "Confirm Activation"}</button>
            </div>
        </div>
    );
}

/* ==========================================================================
   8. DRIVER MODULES
   ========================================================================== */

function DriverApp({ orders, allPumps, user, onLogout, myCustodyPumps, onOpenManual }: any) {
  const activeOrder = orders.find((o: Order) => o.claimedBy === user.id && o.status !== 'delivered');
  const claimOrder = async (id: string) => { await updateDoc(doc(db, 'deliveries', id), { status: 'claimed', claimedBy: user.id, claimedAt: serverTimestamp() }); };
  if (activeOrder) return <DriverWorkflow order={activeOrder} allPumps={allPumps} user={user} pharmacyId={activeOrder.pharmacyId} />;
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 text-slate-900">
        <header className="p-8 pt-12 bg-white border-b border-slate-100 flex justify-between items-end shadow-sm"><div><h2 className="text-2xl font-black italic text-[#0f172a] uppercase tracking-tighter text-slate-900">{user.city || 'Fleet'}</h2><p className="text-[10px] font-black text-indigo-600 mt-1 uppercase tracking-widest text-indigo-600">{user.name}</p></div><div className="flex gap-2"><button onClick={onOpenManual} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><BookOpen className="w-6 h-6 text-indigo-600"/></button><button onClick={onLogout} className="p-4 bg-slate-100 rounded-2xl text-slate-900 transition-colors active:bg-slate-200 text-slate-950"><LogOut/></button></div></header>
        {myCustodyPumps.length > 0 && (<div className="mx-6 mt-4 bg-red-500 p-5 rounded-3xl text-white shadow-lg animate-pulse text-white text-white"><div className="flex items-center gap-2 mb-2 text-white"><AlertTriangle/><span className="font-black text-xs uppercase tracking-widest">RETURN REQUIRED</span></div><div className="flex flex-wrap gap-2 text-white">{myCustodyPumps.map((p: Pump) => <span key={p.id} className="text-[9px] bg-white text-red-600 px-2 py-1 rounded font-black text-red-600">{p.code}</span>)}</div></div>)}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto pb-20 text-slate-900"> {orders.filter((o:Order)=>o.status==='ready').length === 0 ? <div className="text-center py-20 opacity-30 font-black text-xs uppercase tracking-widest">No active routes available</div> : orders.filter((o:Order)=>o.status==='ready').map((o: Order) => (<div key={o.id} className="bg-white p-8 rounded-4xl shadow-xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500 text-slate-900"><div className="flex justify-between mb-6"><span className="text-[10px] font-black text-indigo-600 tracking-widest uppercase text-indigo-600 text-indigo-600">#{o.orderCode}</span><span className="bg-slate-100 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter text-slate-600">READY</span></div><h3 className="text-2xl font-black text-slate-800 mb-2 leading-none text-slate-950">{o.clientName}</h3><p className="text-xs text-slate-500 mb-8 flex items-center gap-2 font-bold uppercase text-slate-400"><MapPin className="w-4 h-4 text-emerald-500"/> {o.address}</p><button onClick={()=>claimOrder(o.id)} className="w-full bg-[#0f172a] text-white py-5 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all shadow-xl text-white">Accept Dispatch</button></div>))}</div>
    </div>
  );
}

function DriverWorkflow({ order, allPumps, user, pharmacyId }: any) {
    const [step, setStep] = useState(order.status==='picked_up'?'delivery':'pickup'); 
    const [s1, setS1] = useState(""); const [s2, setS2] = useState(""); const [dS, setDS] = useState<Record<string,any>>({});
    const pR = allPumps.filter((p: Pump) => p.status === 'with_driver' && p.currentDriverId === user.id && p.pharmacyId === pharmacyId);
    const cD = allPumps.filter((p: Pump) => p.currentClientId === order.clientId && p.status === 'with_client');
    const action = async () => {
        const b = writeBatch(db);
        if (step === 'pickup') {
            if (pR.length > 0) pR.forEach((p: Pump) => b.update(doc(db, 'pumps', p.id), { status: 'available', currentDriverId: null }));
            b.update(doc(db, 'deliveries', order.id), { status: 'picked_up', signatureDriverPickup: s1 });
            order.pumps.forEach((p: any) => b.update(doc(db, 'pumps', p.pumpId), { status: 'with_driver', currentDriverId: user.id }));
            await b.commit(); setStep('delivery'); setS1("");
        } else {
            const retIds = cD.filter((d: Pump) => dS[d.id]==='collected').map((d: Pump) => d.id);
            b.update(doc(db, 'deliveries', order.id), { status: 'delivered', signatureDriverDelivery: s1, signatureClient: s2, returnedPumpIds: retIds });
            order.pumps.forEach((p: any) => b.update(doc(db, 'pumps', p.pumpId), { status: 'with_client', currentClientId: order.clientId, currentDriverId: null, deliveredBy: user.name }));
            retIds.forEach((id: string) => b.update(doc(db, 'pumps', id), { status: 'with_driver', currentClientId: null, currentDriverId: user.id }));
            await b.commit(); setS1(""); setS2("");
        }
    };
    return (
      <div className="flex-1 flex flex-col bg-white text-slate-900 text-slate-900 text-slate-900">
        <div className="bg-[#0f172a] p-10 pt-16 rounded-b-4xl text-white shadow-2xl text-white">
          <h2 className="text-3xl font-black italic tracking-tighter text-white">#{order.orderCode}</h2>
          <p className="text-[10px] font-black text-emerald-400 mt-2 tracking-widest uppercase text-emerald-400">{step.toUpperCase()}</p>
        </div>
        <div className="flex-1 p-8 space-y-8 overflow-y-auto text-slate-900 text-slate-900">
          {step === 'pickup' ? (
            <div className="space-y-6 text-slate-900">
              {pR.length > 0 && (<div className="bg-amber-100 p-6 rounded-3xl border-2 border-amber-300 animate-pulse text-amber-700"><p className="text-xs font-black mb-3 uppercase flex items-center gap-2"><AlertTriangle/> Return Debt to Office</p><div className="flex flex-wrap gap-2 text-slate-900">{pR.map((p: Pump)=>(<div key={p.id} className="bg-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm">S/N: {p.code}</div>))}</div></div>)}
              <div className="bg-slate-50 p-6 rounded-3xl shadow-inner text-slate-900"><p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">Handover Checklist:</p>{order.pumps.map((p:any)=><p key={p.code} className="font-black text-2xl text-[#0f172a] mb-1">S/N: {p.code}</p>)}</div>
              <SignaturePad onSave={setS1} label="Office Handover Receipt Signature" />
            </div>
          ) : (
            <div className="space-y-6 text-slate-900">
              <div className="p-8 bg-[#0f172a] rounded-4xl text-white shadow-xl text-white">
                <h3 className="text-2xl font-black mb-1 leading-tight text-white">{order.clientName}</h3>
                <p className="text-sm opacity-60 flex items-center gap-2 font-bold text-white/50"><MapPin className="w-4 h-4 text-white"/> {order.address}</p>
              </div>
              {cD.length > 0 && (<div className="space-y-4">{cD.map((p: Pump)=>(<div key={p.id} className="p-5 rounded-3xl border-2 flex justify-between items-center bg-white shadow-sm border-slate-100 text-slate-900"><div><p className="font-black text-lg text-indigo-950">#{p.code}</p><p className="text-[10px] text-red-500 font-black uppercase tracking-tighter">Collect from patient</p></div><button onClick={()=>setDS({...dS, [p.id]:'collected'})} className={`p-4 rounded-2xl transition-all ${dS[p.id]==='collected'?'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30 text-white':'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}><CheckCircle/></button></div>))}</div>)}
              <div className="space-y-4 pt-4 text-slate-900"><SignaturePad onSave={setS1} label="Proof of Delivery Signature" /><SignaturePad onSave={setS2} label="Patient Receipt Signature" /></div>
            </div>
          )}
        </div>
        <div className="p-6 border-t bg-white"><button onClick={action} disabled={!s1 || (step==='delivery'&&!s2)} className="w-full bg-[#10b981] text-slate-900 py-6 rounded-4xl font-black uppercase text-sm shadow-xl active:scale-95 transition-all shadow-xl text-slate-950">Confirm Protocol Step</button></div>
      </div>
    );
}

/* ==========================================================================
   9. ROOT APP ENGINE
   ========================================================================== */

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [view, setView] = useState<'selection' | 'login' | 'register' | 'super_admin' | 'pharmacy_admin' | 'pharmacy_staff' | 'driver_market' | 'manual'>('selection');
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);

  useEffect(() => {
    const safetyTimeout = setTimeout(() => { if (loading) setLoading(false); }, 4000);
    const initAuth = async () => {
      try { if (!auth.currentUser) await signInAnonymously(auth); setLoading(false); } 
      catch (e: any) { setErrorMsg(e.message); setLoading(false); }
    };
    initAuth();
    onAuthStateChanged(auth, u => setUser(u));
    return () => clearTimeout(safetyTimeout);
  }, []);

  useEffect(() => {
    if (!user) return;
    const sub = (col: string, setter: any) => onSnapshot(collection(db, col), s => setter(s.docs.map((d: any) => ({id: d.id, ...d.data()}))), (e: any) => console.error(e));
    const u1 = sub('deliveries', setOrders);
    const u2 = sub('pumps', setPumps);
    const u3 = sub('clients', setClients);
    const u4 = sub('pharmacyEmployees', setEmployees);
    const u5 = sub('deliveryDrivers', setDrivers);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [user]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit; setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === "1844") { setPin(""); setView('super_admin'); return; }
        const emp = employees.find((e: Employee) => e.pin === newPin);
        if (emp) { setActiveEmployee(emp); setPin(""); setView(emp.role === 'pharmacy_admin' ? 'pharmacy_admin' : 'pharmacy_staff'); return; } 
        const dri = drivers.find((d: Employee) => d.pin === newPin);
        if (dri) { setActiveEmployee(dri); setPin(""); setView('driver_market'); return; }
        setLoginError("PIN INCORRECT"); setTimeout(() => { setPin(""); setLoginError(""); }, 1000);
      }
    }
  };

  const manualRetry = () => { setLoading(true); setErrorMsg(""); signInAnonymously(auth).catch((e: any) => { setErrorMsg(e.message); setLoading(false); }); };

  if (loading) return <LoadingScreen />;
  if (errorMsg) return <ErrorScreen msg={errorMsg} onRetry={manualRetry} />;

  if (view === 'manual') return <ManualView onBack={() => setView('selection')} />;
  if (view === 'selection') return <SelectionView onLogin={() => setView('login')} onRegister={() => setView('register')} onOpenManual={() => setView('manual')} />;
  if (view === 'login') return <LoginView pin={pin} error={loginError} onInput={handlePinInput} onClear={() => setPin("")} onBack={() => setView('selection')} />;
  if (view === 'register') return <RegisterView onBack={() => setView('selection')} allAdmins={employees.filter((e: Employee) => e.role === 'pharmacy_admin')} />;

  if ((view === 'pharmacy_admin' || view === 'pharmacy_staff') && activeEmployee) {
    const pId = activeEmployee.pharmacyId || activeEmployee.id;
    return <PharmacyAdminView user={activeEmployee} pharmacyId={pId} orders={orders.filter((o: Order) => o.pharmacyId === pId)} pumps={pumps.filter((p: Pump) => p.pharmacyId === pId)} clients={clients.filter((c: Client) => c.pharmacyId === pId)} staff={employees.filter((e: Employee) => e.pharmacyId === pId && e.role === 'pharmacy_staff')} drivers={drivers} onLogout={() => { setView('selection'); setPin(""); }} allPumps={pumps} onOpenManual={() => setView('manual')} />;
  }

  if (view === 'driver_market' && activeEmployee) {
    const myCustody = pumps.filter((p: Pump) => p.status === 'with_driver' && p.currentDriverId === activeEmployee.id);
    const local = orders.filter((o: Order) => (o.status === 'ready') && (o.city?.toLowerCase() === activeEmployee.city?.toLowerCase() || o.state?.toLowerCase() === activeEmployee.state?.toLowerCase()));
    return <DriverApp user={activeEmployee} orders={local} allOrders={orders} allPumps={pumps} myCustodyPumps={myCustody} onLogout={() => { setView('selection'); setPin(""); }} onOpenManual={() => setView('manual')} />;
  }

  return null;
}