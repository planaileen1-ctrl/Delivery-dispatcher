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
  getDocs
} from "firebase/firestore";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously
} from "firebase/auth";
import { 
  Truck, CheckCircle, XCircle, AlertTriangle, 
  MapPin, Plus, LayoutDashboard, 
  Mail, User, Lock, Users, Database, LogOut, ChevronLeft,
  ArrowRight, Smartphone, RefreshCw, Loader2, Key, Package, Trash2, Calendar, ShieldCheck, Ticket, Ban, Send, UserPlus, Search, X, PenTool, Eraser, ArrowLeftRight, FileClock, RotateCcw, Activity
} from 'lucide-react';

/* ==========================================================================
   1. CONFIGURACIÓN FIREBASE
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
   2. INTERFACES
   ========================================================================== */
interface Pump { id: string; code: string; brand?: string; model?: string; status: 'available' | 'with_client' | 'maintenance' | 'with_driver'; currentClientId?: string | null; currentDriverId?: string | null; pharmacyId: string; deliveredBy?: string; }
interface Client { id: string; name: string; email: string; address: string; city: string; state?: string; country?: string; pharmacyId: string; }
interface Order { id: string; orderCode: string; clientName: string; clientEmail: string; clientId: string; address: string; city: string; status: "ready" | "claimed" | "picked_up" | "delivered" | "cancelled"; pumps: { pumpId: string; code: string }[]; pharmacyId: string; createdAt: any; claimedBy?: string; signaturePharmacy?: string; signatureDriverPickup?: string; signatureDriverDelivery?: string; signatureClient?: string; returnedPumpIds?: string[]; failedReturns?: { pumpId: string; code: string; reason: string }[]; }
interface Employee { id: string; name: string; pin: string; role: 'driver' | 'pharmacy_admin' | 'pharmacy_staff'; email: string; city?: string; state?: string; country?: string; pharmacyId?: string; signature?: string; }

/* ==========================================================================
   3. COMPONENTES DE APOYO (UI BASE)
   ========================================================================== */

function LoadingScreen() { 
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8">
      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
      <p className="font-black uppercase text-[10px] tracking-[0.3em] opacity-30">Cargando Dispatcher Pro...</p>
    </div>
  ); 
}

function ErrorScreen({ msg, onRetry }: { msg: string, onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2 uppercase italic tracking-tighter">Error de Sistema</h2>
        <p className="text-slate-400 text-xs mb-8 max-w-xs">{msg}</p>
        <button onClick={onRetry} className="bg-emerald-500 text-slate-900 px-8 py-4 rounded-3xl font-black uppercase text-xs flex items-center gap-2 active:scale-95 transition-all">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
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
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
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
            {!hasSignature && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-[10px] font-black uppercase">Firma aquí</div>}
        </div>
    </div>
  );
}

function SearchableSelect({ label, options, value, onChange, placeholder }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => { if (!value) setSearch(""); }, [value]);
  const filtered = options.filter((o:any) => o.label.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-2 relative text-slate-900">
      <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">{label}</label>
      <div className="relative">
        <input className="w-full p-4 rounded-2xl border-2 border-slate-200 font-bold bg-white outline-none focus:border-indigo-500 text-slate-700 uppercase text-xs shadow-sm" placeholder={value ? options.find((o:any)=>o.value===value)?.label : placeholder} value={search} onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Search className="w-5 h-5" /></div>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
            <div className="absolute top-full left-0 w-full bg-white mt-2 rounded-2xl shadow-2xl border border-slate-100 max-h-60 overflow-y-auto z-20 text-slate-900">
              {filtered.length === 0 ? (
                <div className="p-4 text-xs font-bold text-slate-400">Sin resultados</div>
              ) : (
                filtered.map((opt:any) => (
                  <div key={opt.value} className="p-4 border-b border-slate-50 hover:bg-indigo-50 cursor-pointer transition-colors" onClick={() => { onChange(opt.value); setSearch(""); setIsOpen(false); }}>
                    <p className="font-bold text-sm text-slate-800">{opt.label}</p>
                    {opt.sub && <p className="text-[9px] text-slate-400 font-black uppercase">{opt.sub}</p>}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MenuCard({ icon, label, color, onClick, full }: any) {
  return (
    <button onClick={onClick} className={`${color} ${full ? 'col-span-2' : ''} p-6 rounded-4xl text-white flex flex-col items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all`}>
      <div className="bg-white/20 p-4 rounded-3xl">{icon}</div>
      <span className="font-black text-[10px] uppercase tracking-widest text-center leading-tight">{label}</span>
    </button>
  );
}

/* ==========================================================================
   4. COMPONENTES DE NEGOCIO (LISTAS Y FORMULARIOS)
   ========================================================================== */

function ListPumps({ pumps, readOnly }: { pumps: Pump[], readOnly?: boolean }) {
  const remove = async(id:string) => { if(confirm("¿Eliminar Bomba?")) await deleteDoc(doc(db,'pumps',id)); };
  return (
    <div className="space-y-3 pb-20 animate-in fade-in text-slate-900">
      <div>
        {pumps.map((p: Pump) => (
          <div key={p.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm mb-3">
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">S/N: {p.code}</p>
              <p className="font-bold text-slate-800">{p.brand || 'Sin Marca'}</p>
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg mt-1 inline-block ${p.status === 'with_driver' ? 'bg-blue-100 text-blue-600' : p.status === 'with_client' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>{p.status.replace('_', ' ')}</span>
            </div>
            {!readOnly && <button onClick={() => remove(p.id)} className="text-slate-300 p-2 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListClients({ clients, readOnly }: { clients: Client[], readOnly?: boolean }) {
  const del = async (id: string) => { if(confirm("¿Borrar?")) { await deleteDoc(doc(db, 'clients', id)); } };
  return (
    <div className="space-y-4 pb-20 animate-in fade-in text-slate-900">
      <div>
        {clients.map((c: Client) => (
          <div key={c.id} className="bg-white p-6 rounded-3xl border flex flex-col gap-1 shadow-sm relative mb-3 border-slate-100">
            {!readOnly && <button onClick={() => del(c.id)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>}
            <h4 className="font-black text-slate-800 text-lg">{c.name}</h4>
            <p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.address}, {c.city}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddPumpForm({ onFinish, pharmacyId }: any) {
  const [f, setF] = useState({ code: '', brand: '', model: '' }); const [msg, setMsg] = useState("");
  const save = async () => { if (!f.code) return; await addDoc(collection(db, 'pumps'), { ...f, status: 'available', lastReview: new Date().toLocaleString(), pharmacyId }); setMsg(`S/N ${f.code} registrada`); setF({ code: '', brand: '', model: '' }); setTimeout(() => setMsg(""), 3000); };
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 text-slate-900">
      <div className="flex justify-between items-center"><h3 className="font-black text-xl italic uppercase">Nueva Bomba</h3><button onClick={onFinish} className="bg-slate-100 p-2 rounded-xl text-xs font-bold text-slate-500">Volver</button></div>
      {msg && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-center font-bold text-xs">{msg}</div>}
      <div className="space-y-4 bg-white p-6 rounded-4xl border border-slate-100 shadow-sm">
        <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold focus:border-indigo-500 text-slate-900" placeholder="Serial Number (S/N)" value={f.code} onChange={e=>setF({...f, code: e.target.value})} />
        <div className="grid grid-cols-2 gap-2">
          <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-sm text-slate-900" placeholder="Marca" value={f.brand} onChange={e=>setF({...f, brand: e.target.value})} />
          <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-sm text-slate-900" placeholder="Modelo" value={f.model} onChange={e=>setF({...f, model: e.target.value})} />
        </div>
      </div>
      <button onClick={save} className="w-full bg-indigo-600 text-white py-5 rounded-4xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Guardar Bomba</button>
    </div>
  );
}

function AddClientForm({ onFinish, pharmacyId, user }: any) {
  const [f, setF] = useState({ name: '', email: '', address: '', city: '', state: '' }); const [msg, setMsg] = useState("");
  const save = async () => { if (!f.name) return; await addDoc(collection(db, 'clients'), { ...f, pharmacyId, country: user.country || 'EC' }); setMsg(`${f.name} Guardado`); setF({ name: '', email: '', address: '', city: '', state: '' }); setTimeout(() => setMsg(""), 3000); };
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 text-slate-900">
      <div className="flex justify-between items-center"><h3 className="font-black text-xl italic uppercase tracking-tighter">Nuevo Cliente</h3><button onClick={onFinish} className="bg-slate-100 p-2 rounded-xl text-xs font-bold transition-colors hover:bg-slate-200">Volver</button></div>
      {msg && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-center font-bold text-xs">{msg}</div>}
      <div className="bg-white p-6 rounded-4xl border border-slate-100 space-y-4 shadow-sm text-slate-900">
        <input className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none text-slate-900" placeholder="Nombre completo" value={f.name} onChange={e=>setF({...f, name: e.target.value})} />
        <input className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none text-slate-900" placeholder="Email contacto" value={f.email} onChange={e=>setF({...f, email: e.target.value})} />
        <div className="grid grid-cols-2 gap-2">
          <input className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none text-slate-900" placeholder="Dirección" value={f.address} onChange={e=>setF({...f, address: e.target.value})} />
          <input className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none text-slate-900" placeholder="Ciudad" value={f.city} onChange={e=>setF({...f, city: e.target.value})} />
        </div>
      </div>
      <button onClick={save} className="w-full bg-emerald-600 text-slate-900 py-5 rounded-4xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Registrar Cliente</button>
    </div>
  );
}

function CreateDeliveryForm({ clients, pumps, onFinish, user, pharmacyId }: any) {
  const [cId, setCId] = useState(''); const [sP, setSP] = useState<any[]>([]); const [debts, setDebts] = useState<any[]>([]);
  useEffect(() => { if (!cId) { setDebts([]); return; } setDebts(pumps.filter((p: any) => p.currentClientId === cId && p.status === 'with_client')); }, [cId, pumps]);
  const add = (id: string) => { const p = pumps.find((x: any) => x.id === id); if (p) setSP([...sP, p]); };
  const create = async () => {
    if (!cId || sP.length === 0) return; const c = clients.find((x: any) => x.id === cId);
    await addDoc(collection(db, 'deliveries'), { orderCode: Math.floor(1000 + Math.random()*9000).toString(), clientName: c.name, clientId: c.id, address: c.address, city: user.city || 'Desconocido', state: user.state || 'Desconocido', status: 'ready', pumps: sP.map((p: any) => ({ pumpId: p.id, code: p.code })), createdAt: serverTimestamp(), pharmacyId });
    onFinish();
  };
  return (
    <div className="space-y-6 animate-in zoom-in-95 text-slate-900">
      <div className="bg-white p-8 rounded-4xl shadow-xl border border-slate-100 space-y-6 text-slate-900">
        <SearchableSelect label="1. Seleccionar Cliente" options={clients.map((c:any)=>({label:c.name, value:c.id}))} value={cId} onChange={setCId} />
        {debts.length > 0 && (
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 animate-pulse shadow-sm text-slate-900">
            <p className="text-[10px] font-black text-red-600 mb-2 uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> EQUIPOS PENDIENTES:</p>
            <div className="flex flex-wrap gap-1">{debts.map((p: any) => <span key={p.id} className="text-[10px] bg-white px-2 py-1 rounded font-mono font-bold text-red-700 border border-red-200">{p.code}</span>)}</div>
          </div>
        )}
        <SearchableSelect label="2. Equipos a enviar" options={pumps.filter((p:any)=>p.status==='available'&&!sP.find((x: any)=>x.id===p.id)).map((p:any)=>({label:p.code, value:p.id}))} value="" onChange={add} />
        {sP.length > 0 && (
          <div className="space-y-2 text-slate-900">
            {sP.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <div><p className="font-black text-xs uppercase opacity-70 text-slate-900">S/N: {p.code}</p></div>
                <button onClick={()=>setSP((prev: any[]) => prev.filter(x=>x.id!==p.id))} className="text-red-500 hover:bg-red-50 p-1 rounded-full"><XCircle className="w-5 h-5"/></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <button onClick={create} disabled={!cId || sP.length === 0} className="w-full bg-slate-900 text-white py-6 rounded-4xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50">Lanzar Despacho</button>
    </div>
  );
}

function StaffManager({ staff, pharmacyId }: any) {
  const [f, setF] = useState({ name: '', email: '' }); const [p, setP] = useState(""); const [s, setS] = useState("");
  const create = async () => { if (!f.name || !s) return; const pinVal = Math.floor(1000 + Math.random()*9000).toString(); await addDoc(collection(db, 'pharmacyEmployees'), { ...f, pin: pinVal, role: 'pharmacy_staff', pharmacyId, signature: s }); setP(pinVal); };
  return (
    <div className="space-y-6 animate-in fade-in text-slate-900"> 
      {p ? (
        <div className="bg-emerald-500 text-white p-8 rounded-4xl text-center shadow-lg">
          <p className="font-bold mb-2 uppercase tracking-widest text-white">PIN DEL EMPLEADO:</p>
          <p className="text-6xl font-black text-white">{p}</p>
          <button onClick={()=>setP("")} className="mt-6 text-xs underline text-white">Registrar otro personal</button>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-4xl shadow-xl border border-slate-100 space-y-4 text-slate-900">
          <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-900" placeholder="Nombre completo del personal" onChange={e=>setF({...f, name: e.target.value})} />
          <SignaturePad onSave={setS} label="Firma de registro del personal" />
          <button onClick={create} disabled={!s} className="w-full bg-[#0f172a] text-white py-5 rounded-2xl font-black uppercase text-xs disabled:opacity-50 active:scale-95 transition-all shadow-xl">Generar PIN Acceso</button>
        </div>
      )}
    </div>
  );
}

function ReturnPumpsForm({ drivers, pumps, onFinish, pharmacyId }: any) {
    const [driverId, setDriverId] = useState(""); const [selectedPumps, setSelectedPumps] = useState<string[]>([]); const [signDriver, setSignDriver] = useState(""); const [signStaff, setSignStaff] = useState(""); const [loading, setLoading] = useState(false);
    const indebtedDrivers = drivers.filter((d: any) => pumps.some((p: any) => p.status === 'with_driver' && p.currentDriverId === d.id && p.pharmacyId === pharmacyId));
    const driverPumps = pumps.filter((p: any) => p.status === 'with_driver' && p.currentDriverId === driverId && p.pharmacyId === pharmacyId);
    const processReturn = async () => {
        if (!signDriver || !signStaff || selectedPumps.length === 0) return; setLoading(true);
        const b = writeBatch(db);
        selectedPumps.forEach((id: string) => b.update(doc(db, 'pumps', id), { status: 'available', currentDriverId: null, lastReview: `Recibido el ${new Date().toLocaleDateString()}` }));
        await b.commit(); setLoading(false); onFinish();
    };
    return (
        <div className="space-y-6 p-4 animate-in zoom-in-95 text-slate-900">
            <div className="flex justify-between items-center text-slate-900"><h3 className="font-black text-xl italic uppercase">Recibir Equipos</h3><button onClick={onFinish} className="bg-slate-100 p-2 rounded-xl text-xs font-bold text-slate-500">Volver</button></div>
            <div className="bg-white p-6 rounded-4xl shadow-lg border border-slate-100 space-y-6 text-slate-900">
                <SearchableSelect label="Chofer con deuda" options={indebtedDrivers.map((d:any)=>({label:d.name, value:d.id}))} value={driverId} onChange={(val: string) => { setDriverId(val); setSelectedPumps([]); }} />
                {driverId && driverPumps.map((p: any) => (
                  <div key={p.id} onClick={() => setSelectedPumps((s: string[]) => s.includes(p.id) ? s.filter((i: any)=>i!==p.id) : [...s, p.id])} className={`flex justify-between items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedPumps.includes(p.id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100'}`}>
                    <div><p className="font-black text-slate-900 text-sm">S/N: {p.code}</p></div>
                    {selectedPumps.includes(p.id) && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                  </div>
                ))}
                {selectedPumps.length > 0 && (<div className="space-y-4 pt-4 border-t border-slate-100 text-slate-900"><SignaturePad onSave={setSignDriver} label="Firma del Chofer (Entrega)" /><SignaturePad onSave={setSignStaff} label="Firma Farmacia (Recibe)" /></div>)}
            </div>
            <button onClick={processReturn} disabled={loading || !signDriver || !signStaff || selectedPumps.length === 0} className="w-full bg-[#10b981] text-slate-900 py-5 rounded-4xl font-black uppercase text-xs active:scale-95 disabled:opacity-50 shadow-xl transition-all">Liberar Deuda del Chofer</button>
        </div>
    );
}
function HistoryLogView({ orders, allPumps, onBack }: any) {
  const history = orders
    .filter((o: any) => o.status === "delivered" || o.status === "cancelled")
    .sort(
      (a: any, b: any) =>
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
    );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <div className="p-6 flex justify-between items-center bg-white border-b border-slate-100 sticky top-0 z-20">
        <h2 className="text-xl font-black italic uppercase">
          Historial
        </h2>
        <button
          onClick={onBack}
          className="bg-slate-100 p-2 rounded-xl text-xs font-bold"
        >
          Volver
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && (
          <p className="text-center py-20 opacity-30 text-xs font-black uppercase">
            Sin registros
          </p>
        )}

        {history.map((o: any) => (
          <div
            key={o.id}
            className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100"
          >
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-black text-indigo-600 uppercase">
                #{o.orderCode}
              </span>
              <span
                className={`text-[8px] px-2 py-1 rounded font-black uppercase ${
                  o.status === "delivered"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {o.status}
              </span>
            </div>

            <p className="font-bold">{o.clientName}</p>
            <p className="text-[10px] text-slate-400 uppercase">
              {o.address}
            </p>

            {o.signatureClient && (
              <img
                src={o.signatureClient}
                alt="Firma"
                className="h-10 mt-2 opacity-60"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   5. VISTAS DE ROL PRINCIPALES (DASHBOARDS)
   ========================================================================== */

function PharmacyAdminView({ orders, pumps, clients, staff, onLogout, user, pharmacyId, allPumps, drivers }: any) {
  const [section, setSection] = useState<'menu'|'add_pump'|'list_pumps'|'add_client'|'list_clients'|'create_delivery'|'staff'|'history'|'receive_returns'>('menu');
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative text-slate-900">
        <header className="p-8 pt-12 bg-white border-b border-slate-100 flex justify-between items-end shadow-sm">
          <div><h2 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">{user.city}</h2><p className="text-[10px] font-black text-emerald-600 mt-1 uppercase tracking-widest">{user.role.replace('_', ' ')}</p></div>
          {section!=='menu'?<button onClick={()=>setSection('menu')} className="p-4 bg-slate-100 rounded-2xl transition-colors hover:bg-slate-200 text-slate-900"><ChevronLeft className="text-slate-900"/></button>:<button onClick={onLogout} className="p-4 bg-red-50 text-red-500 rounded-2xl"><LogOut/></button>}
        </header>
        <div className="flex-1 overflow-y-auto p-6 pb-24 text-slate-900">
            {section==='menu' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <MenuCard icon={<Plus/>} label="Nueva Bomba" color="bg-indigo-600" onClick={()=>setSection('add_pump')}/>
                <MenuCard icon={<Database/>} label="Inventario" color="bg-[#0f172a]" onClick={()=>setSection('list_pumps')}/>
                <MenuCard icon={<UserPlus/>} label="Nuevo Cliente" color="bg-emerald-600" onClick={()=>setSection('add_client')}/>
                <MenuCard icon={<Users/>} label="Clientes" color="bg-slate-800" onClick={()=>setSection('list_clients')}/><MenuCard icon={<ShieldCheck/>} label="Personal" color="bg-amber-500" onClick={()=>setSection('staff')}/>
                <MenuCard icon={<Truck/>} label="Despachar" color="bg-indigo-500" onClick={()=>setSection('create_delivery')}/>
                <MenuCard icon={<RotateCcw/>} label="RECOGER EQUIPOS" color="bg-blue-600" onClick={()=>setSection('receive_returns')} full />
                <MenuCard icon={<FileClock/>} label="Historial Completo" color="bg-slate-500" onClick={()=>setSection('history')} full />
              </div>
            )}
            {section==='add_pump' && <AddPumpForm onFinish={()=>setSection('menu')} pharmacyId={pharmacyId}/>}
            {section==='list_pumps' && <ListPumps pumps={pumps}/>}
            {section==='add_client' && <AddClientForm onFinish={()=>setSection('menu')} pharmacyId={pharmacyId} user={user}/>}
            {section==='list_clients' && <ListClients clients={clients}/>}
            {section==='staff' && <StaffManager staff={staff} pharmacyId={pharmacyId}/>}
            {section==='create_delivery' && <CreateDeliveryForm clients={clients} pumps={pumps} onFinish={()=>setSection('menu')} user={user} pharmacyId={pharmacyId}/>}
            {section==='history' && <HistoryLogView orders={orders} allPumps={allPumps} onBack={()=>setSection('menu')} />}
            {section==='receive_returns' && <ReturnPumpsForm drivers={drivers} pumps={allPumps} onFinish={()=>setSection('menu')} pharmacyId={pharmacyId}/>}
        </div>
    </div>
  );
}

function SelectionView({ onLogin, onRegister }: { onLogin: () => void, onRegister: () => void }) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8 text-white relative overflow-hidden text-center">
        <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center mb-8 shadow-2xl animate-bounce duration-[3000ms] shadow-emerald-500/20">
            <Truck className="w-12 h-12 text-[#0f172a]" />
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter mb-1 uppercase text-white">Dispatcher Pro</h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-16 text-center text-white/50">Medical Supply Logistics Pro</p>
        <div className="w-full max-w-xs space-y-4">
            <button onClick={onLogin} className="w-full bg-white text-slate-900 py-6 rounded-4xl font-black uppercase text-xs flex items-center justify-between px-10 shadow-xl transition-all active:scale-95"><span>Acceso Portal</span><ArrowRight className="w-5 h-5 text-emerald-600"/></button>
            <button onClick={onRegister} className="w-full bg-white/5 border border-white/10 py-6 rounded-4xl font-black uppercase text-xs flex items-center justify-between px-10 hover:bg-white/10 transition-all active:scale-95 text-white"><span>Registrarse</span><Plus className="w-5 h-5 text-emerald-400"/></button>
        </div>
        <div className="absolute bottom-10">
            <button onClick={onLogin} className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors">Administrator</button>
        </div>
    </div>
  );
}

function LoginView({ pin, error, onInput, onClear, onBack }: any) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center p-8 text-white">
        <button onClick={onBack} className="self-start p-4 bg-white/5 rounded-2xl mb-8 transition-colors hover:bg-white/10"><ChevronLeft className="text-white"/></button>
        <h2 className="text-3xl font-black italic mb-2 tracking-tighter uppercase text-white text-center">Ingresar PIN</h2>
        <div className="flex gap-4 mb-16 h-8 mt-10">{[...Array(4)].map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-emerald-500 scale-150 shadow-lg shadow-emerald-500/50' : 'bg-slate-800'}`} />))}</div>
        {error && <p className="text-red-500 text-[10px] font-black uppercase mb-6 animate-pulse text-center">{error}</p>}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[300px]">
            {[1,2,3,4,5,6,7,8,9].map(n => (<button key={n} onClick={() => onInput(n.toString())} className="h-20 rounded-3xl bg-white/5 text-2xl font-black hover:bg-white/10 active:scale-90 transition-all text-white">{n}</button>))}
            <button onClick={onClear} className="h-20 rounded-3xl bg-red-500/10 text-red-500 font-black text-xs uppercase flex items-center justify-center active:scale-95">CLR</button>
            <button onClick={() => onInput("0")} className="h-20 rounded-3xl bg-white/5 text-2xl font-black text-white">0</button>
        </div>
    </div>
  );
}

function RegisterView({ onBack }: any) {
    const [form, setForm] = useState({ name: '', email: '', role: 'driver' as any, city: '', state: '', country: 'US' }); 
    const [lic, setLic] = useState(""); const [newPin, setNewPin] = useState(""); const [sign, setSign] = useState(""); const [load, setLoad] = useState(false);
    const register = async () => {
        if (!form.name || !sign) return; setLoad(true);
        try {
            if (form.role === 'pharmacy_admin') {
                const q = query(collection(db, 'pharmacyEmployees'), where('role', '==', 'license_code'), where('code', '==', lic), where('status', '==', 'active'));
                const s = await getDocs(q); if (s.empty) { alert("Licencia inválida"); setLoad(false); return; }
                await updateDoc(doc(db, 'pharmacyEmployees', s.docs[0].id), { status: 'used', usedBy: form.email });
            }
            const pinVal = Math.floor(1000 + Math.random() * 9000).toString();
            const col = form.role === 'driver' ? 'deliveryDrivers' : 'pharmacyEmployees';
            const docRef = await addDoc(collection(db, col), { ...form, pin: pinVal, signature: sign, createdAt: serverTimestamp() });
            if (form.role === 'pharmacy_admin') await updateDoc(docRef, { pharmacyId: docRef.id });
            setNewPin(pinVal);
        } catch (e: any) { alert(e.message); } setLoad(false);
    };
    if (newPin) return (<div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8 text-white text-center shadow-inner"><h2 className="text-3xl font-black italic mb-4 uppercase text-white tracking-tighter">Registro Exitoso</h2><p className="text-sm text-slate-400 mb-2 uppercase tracking-widest">Tu PIN de acceso es:</p><p className="text-7xl font-black text-emerald-400 mb-10 tracking-tighter">{newPin}</p><button onClick={onBack} className="w-full bg-white text-slate-900 py-5 rounded-4xl font-black uppercase text-xs active:scale-95 transition-all">Ir al Login</button></div>);
    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col p-8 text-white overflow-y-auto pb-20">
            <button onClick={onBack} className="self-start p-4 bg-white/5 rounded-2xl mb-8 transition-colors hover:bg-white/10"><ChevronLeft className="text-white"/></button>
            <h2 className="text-3xl font-black italic mb-8 uppercase tracking-tighter text-white">Crear Cuenta</h2>
            <div className="grid grid-cols-2 gap-3 mb-8">
                <button onClick={() => setForm({...form, role: 'driver'})} className={`py-4 rounded-2xl font-black text-[10px] uppercase border transition-all ${form.role === 'driver' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-transparent border-white/10 text-slate-400'}`}>Chofer</button>
                <button onClick={() => setForm({...form, role: 'pharmacy_admin'})} className={`py-4 rounded-2xl font-black text-[10px] uppercase border transition-all ${form.role === 'pharmacy_admin' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-transparent border-white/10 text-slate-400'}`}>Farmacia</button>
            </div>
            <div className="space-y-4 text-slate-900">
                {form.role === 'pharmacy_admin' && (<input className="w-full bg-white/5 p-4 rounded-2xl font-black border border-emerald-500/30 text-emerald-300 outline-none uppercase placeholder-emerald-500/50" placeholder="Código Licencia" value={lic} onChange={e=>setLic(e.target.value.toUpperCase())} />)}
                <input className="w-full bg-white/5 p-4 rounded-2xl font-bold border border-white/10 outline-none text-white placeholder-white/30" placeholder="Nombre completo" onChange={e=>setForm({...form, name: e.target.value})} />
                <input className="w-full bg-white/5 p-4 rounded-2xl font-bold border border-white/10 outline-none text-white placeholder-white/30" placeholder="Email" onChange={e=>setForm({...form, email: e.target.value})} />
                <div className="grid grid-cols-2 gap-2 text-slate-900">
                    <select className="bg-white/5 p-4 rounded-2xl border border-white/10 text-sm outline-none text-white" onChange={e=>setForm({...form, state: e.target.value})}><option value="" className="text-black">Estado...</option>{LOCATIONS['EC']?.states.map((s: any)=><option key={s} value={s} className="text-black">{s}</option>)}</select>
                    <input className="bg-white/5 p-4 rounded-2xl border border-white/10 font-bold outline-none text-sm text-white placeholder-white/30" placeholder="Ciudad" onChange={e=>setForm({...form, city: e.target.value})} />
                </div>
                <SignaturePad onSave={setSign} label="Tu Firma (Validación ID)" />
                <button onClick={register} disabled={load || !sign} className="w-full bg-emerald-600 py-6 rounded-4xl font-black uppercase text-sm mt-4 shadow-xl active:scale-95 transition-all disabled:opacity-50 text-slate-900">{load ? "Procesando..." : "Completar Registro"}</button>
            </div>
        </div>
    );
}

function SuperAdminView({ onLogout }: any) {
    const [l, setL] = useState<any[]>([]); const [e, setE] = useState("");
    useEffect(() => onSnapshot(query(collection(db, 'pharmacyEmployees'), where('role','==','license_code')), s => setL(s.docs.map((d:any)=>({id:d.id,...d.data()}))), (err) => console.error(err)), []);
    const gen = async () => { if(!e) return; const code=`FARM-${Math.random().toString(36).substring(2,6).toUpperCase()}`; await addDoc(collection(db,'pharmacyEmployees'),{code, role:'license_code', status:'active', assignedEmail:e, createdAt:serverTimestamp()}); setE(""); };
    return (<div className="min-h-screen bg-[#0f172a] text-white p-8 max-w-md mx-auto flex flex-col text-white"><header className="flex justify-between items-end mb-10 text-white"><div><h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Master Hub</h2><p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest opacity-60 text-white text-white">Global Licenses</p></div><button onClick={onLogout} className="p-4 bg-white/10 rounded-2xl transition-colors hover:bg-white/20 text-white"><LogOut/></button></header><div className="space-y-6 flex-1 overflow-y-auto text-white"><div className="bg-white/5 p-8 rounded-4xl border border-white/10 space-y-4 shadow-2xl text-white"><h3 className="font-bold flex gap-2 text-white text-sm uppercase tracking-widest"><Ticket className="text-emerald-500"/> Generar Licencia</h3><input className="w-full bg-slate-800 p-4 rounded-2xl outline-none text-sm border border-white/5 font-bold text-white uppercase placeholder-white/20" placeholder="Email del cliente" value={e} onChange={v=>setE(v.target.value)}/><button onClick={gen} className="w-full bg-emerald-600 text-slate-900 py-5 rounded-4xl font-black uppercase text-xs active:scale-95 shadow-lg shadow-emerald-500/20">Generar Código</button></div><div className="space-y-3">{l.map((x: any)=>(<div key={x.id} className="bg-white/5 p-5 rounded-3xl flex justify-between border border-white/5 items-center text-white"><div><p className="font-black text-emerald-400 tracking-wider text-lg">{x.code}</p><p className="text-[10px] opacity-40 uppercase tracking-widest text-white">{x.assignedEmail}</p></div><span className={`text-[8px] px-3 py-1 rounded-full uppercase font-black ${x.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{x.status}</span></div>))}</div></div></div>);
}

function DriverApp({ orders, allPumps, user, onLogout, myCustodyPumps }: any) {
  const activeOrder = orders.find((o: any) => o.claimedBy === user.id && o.status !== 'delivered' && o.status !== 'cancelled');
  const claimOrder = async (id: string) => { await updateDoc(doc(db, 'deliveries', id), { status: 'claimed', claimedBy: user.id, claimedAt: serverTimestamp() }); };
  if (activeOrder) return <DriverWorkflow order={activeOrder} allPumps={allPumps} user={user} />;
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 text-slate-900">
        <header className="p-8 pt-12 bg-white border-b border-slate-100 flex justify-between items-end shadow-sm"><div><h2 className="text-2xl font-black italic text-[#0f172a] uppercase tracking-tighter text-slate-900 text-slate-900 text-slate-900">{user.city}</h2><p className="text-[10px] font-black text-indigo-600 mt-1 uppercase tracking-widest text-slate-900">{user.name}</p></div><button onClick={onLogout} className="p-4 bg-slate-100 rounded-2xl text-slate-900 text-slate-900 transition-colors active:bg-slate-200"><LogOut/></button></header>
        {myCustodyPumps.length > 0 && (<div className="mx-6 mt-4 bg-red-500 p-5 rounded-3xl text-white shadow-lg animate-pulse"><div className="flex items-center gap-2 mb-2"><AlertTriangle/><span className="font-black text-xs uppercase tracking-widest text-white text-white">DEVOLUCIÓN REQUERIDA</span></div><div className="flex flex-wrap gap-2 text-white text-white">{myCustodyPumps.map((p:any) => <span key={p.id} className="text-[9px] bg-white text-red-600 px-2 py-1 rounded font-black">{p.code}</span>)}</div></div>)}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto pb-20 text-slate-900 text-slate-900">{orders.filter((o:any)=>o.status==='ready').length === 0 ? <div className="text-center py-20 opacity-30 font-black text-xs uppercase tracking-widest text-slate-900">Sin rutas disponibles</div> : orders.filter((o:any)=>o.status==='ready').map((o: any) => (<div key={o.id} className="bg-white p-8 rounded-4xl shadow-xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500 text-slate-900 text-slate-900"><div className="flex justify-between mb-6 text-slate-900"><span className="text-[10px] font-black text-indigo-600 tracking-widest uppercase text-indigo-600">#{o.orderCode}</span><span className="bg-slate-100 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter text-slate-600">{o.status}</span></div><h3 className="text-2xl font-black text-slate-800 mb-2 leading-none text-slate-900 text-slate-900 text-slate-900">{o.clientName}</h3><p className="text-xs text-slate-500 mb-8 flex items-center gap-2 font-bold uppercase text-slate-400 text-slate-400"><MapPin className="w-4 h-4 text-emerald-500"/> {o.address}</p><button onClick={()=>claimOrder(o.id)} className="w-full bg-[#0f172a] text-white py-5 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all shadow-xl shadow-xl">Aceptar Ruta</button></div>))}</div>
    </div>
  );
}

function DriverWorkflow({ order, allPumps, user }: any) {
    const [step, setStep] = useState(order.status==='picked_up'?'delivery':'pickup'); 
    const [s1, setS1] = useState(""); const [s2, setS2] = useState(""); const [dS, setDS] = useState<Record<string,any>>({});
    const pR = allPumps.filter((p: any) => p.status === 'with_driver' && p.currentDriverId === user.id && p.pharmacyId === order.pharmacyId);
    const cD = allPumps.filter((p: any) => p.currentClientId === order.clientId && p.status === 'with_client');
    const action = async () => {
        const b = writeBatch(db);
        if (step === 'pickup') {
            if (pR.length > 0) pR.forEach((p: any) => b.update(doc(db, 'pumps', p.id), { status: 'available', currentDriverId: null }));
            b.update(doc(db, 'deliveries', order.id), { status: 'picked_up', signatureDriverPickup: s1 });
            order.pumps.forEach((p: any) => b.update(doc(db, 'pumps', p.pumpId), { status: 'with_driver', currentDriverId: user.id }));
            await b.commit(); setStep('delivery'); setS1("");
        } else {
            const retIds = cD.filter((d: any) => dS[d.id]==='collected').map((d: any) => d.id);
            b.update(doc(db, 'deliveries', order.id), { status: 'delivered', signatureDriverDelivery: s1, signatureClient: s2, returnedPumpIds: retIds });
            order.pumps.forEach((p: any) => b.update(doc(db, 'pumps', p.pumpId), { status: 'with_client', currentClientId: order.clientId, currentDriverId: null, deliveredBy: user.name }));
            retIds.forEach((id: string) => b.update(doc(db, 'pumps', id), { status: 'with_driver', currentClientId: null, currentDriverId: user.id }));
            await b.commit(); setS1(""); setS2("");
        }
    };
    return (
      <div className="flex-1 flex flex-col bg-white text-slate-900">
        <div className="bg-[#0f172a] p-10 pt-16 rounded-b-4xl text-white shadow-2xl">
          <h2 className="text-3xl font-black italic tracking-tighter text-white">#{order.orderCode}</h2>
          <p className="text-[10px] font-black text-emerald-400 mt-2 tracking-widest uppercase">{step}</p>
        </div>
        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          {step === 'pickup' ? (
            <div className="space-y-6">
              {pR.length > 0 && (
                <div className="bg-amber-100 p-6 rounded-3xl border-2 border-amber-300 animate-pulse">
                  <p className="text-xs font-black text-amber-700 mb-3 uppercase flex items-center gap-2"><AlertTriangle/> Devolver a Farmacia</p>
                  <div className="flex flex-wrap gap-2">{pR.map((p: any)=>(<div key={p.id} className="bg-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm text-slate-900">S/N: {p.code}</div>))}</div>
                </div>
              )}
              <div className="bg-slate-50 p-6 rounded-3xl shadow-inner text-slate-900"><p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">Equipos para Recoger:</p>{order.pumps.map((p:any)=><p key={p.code} className="font-black text-2xl text-[#0f172a] mb-1">S/N: {p.code}</p>)}</div>
              <SignaturePad onSave={setS1} label="Firma Conformidad Chofer" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-8 bg-[#0f172a] rounded-4xl text-white shadow-xl">
                <h3 className="text-2xl font-black mb-1 leading-tight text-white">{order.clientName}</h3>
                <p className="text-sm opacity-60 flex items-center gap-2 font-bold text-white/50"><MapPin className="w-4 h-4"/> {order.address}</p>
              </div>
              {cD.length > 0 && (
                <div className="space-y-4">
                  {cD.map((p: any)=>(
                    <div key={p.id} className="p-5 rounded-3xl border-2 flex justify-between items-center bg-white shadow-sm border-slate-100 text-slate-900">
                      <div><p className="font-black text-lg text-indigo-950">#{p.code}</p><p className="text-[10px] text-red-500 font-black uppercase tracking-tighter">Recoger del paciente</p></div>
                      <button onClick={()=>setDS((prev: any)=>({...prev, [p.id]:'collected'}))} className={`p-4 rounded-2xl transition-all ${dS[p.id]==='collected'?'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30':'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}><CheckCircle/></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-4 pt-4"><SignaturePad onSave={setS1} label="Firma Chofer (Entrega)" /><SignaturePad onSave={setS2} label="Firma Receptor / Paciente" /></div>
            </div>
          )}
        </div>
        <div className="p-6 border-t bg-white"><button onClick={action} disabled={!s1 || (step==='delivery'&&!s2)} className="w-full bg-[#10b981] text-[#0f172a] py-6 rounded-4xl font-black uppercase text-sm shadow-xl active:scale-95 transition-all">Confirmar Paso</button></div>
      </div>
    );
}

/* ==========================================================================
   6. COMPONENTE APP (ROOT)
   ========================================================================== */

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [view, setView] = useState<'selection' | 'login' | 'register' | 'super_admin' | 'pharmacy_admin' | 'pharmacy_staff' | 'driver_market'>('selection');
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [orders, setOrders] = useState<any[]>([]);
  const [pumps, setPumps] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

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
    return () => { u1 && u1(); u2 && u2(); u3 && u3(); u4 && u4(); u5 && u5(); };
  }, [user]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit; setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === "1844") { setPin(""); setView('super_admin'); return; }
        const emp = employees.find((e: any) => e.pin === newPin);
        if (emp) { setActiveEmployee(emp); setPin(""); setView(emp.role === 'pharmacy_admin' ? 'pharmacy_admin' : 'pharmacy_staff'); return; } 
        const dri = drivers.find((d: any) => d.pin === newPin);
        if (dri) { setActiveEmployee(dri); setPin(""); setView('driver_market'); return; }
        setLoginError("PIN INCORRECTO"); setTimeout(() => { setPin(""); setLoginError(""); }, 1000);
      }
    }
  };

  const manualRetry = () => { setLoading(true); setErrorMsg(""); signInAnonymously(auth).catch((e: any) => { setErrorMsg(e.message); setLoading(false); }); };

  if (loading) return <LoadingScreen />;
  if (errorMsg) return <ErrorScreen msg={errorMsg} onRetry={manualRetry} />;

  if (view === 'selection') return <SelectionView onLogin={() => setView('login')} onRegister={() => setView('register')} />;
  if (view === 'login') return <LoginView pin={pin} error={loginError} onInput={handlePinInput} onClear={() => setPin("")} onBack={() => setView('selection')} />;
  if (view === 'register') return <RegisterView onBack={() => setView('selection')} />;
  if (view === 'super_admin') return <SuperAdminView onLogout={() => { setActiveEmployee(null); setView('selection'); }} />;

  if (view === 'pharmacy_admin' && activeEmployee) {
    const pId = activeEmployee.pharmacyId || activeEmployee.id;
    return <PharmacyAdminView user={activeEmployee} pharmacyId={pId} orders={orders.filter((o: any) => o.pharmacyId === pId)} pumps={pumps.filter((p: any) => p.pharmacyId === pId)} clients={clients.filter((c: any) => c.pharmacyId === pId)} staff={employees.filter((e: any) => e.pharmacyId === pId && e.role === 'pharmacy_staff')} drivers={drivers} onLogout={() => { setActiveEmployee(null); setView('selection'); setPin(""); }} allPumps={pumps} />;
  }

  if (view === 'pharmacy_staff' && activeEmployee) {
    const pId = activeEmployee.pharmacyId!;
    return <PharmacyAdminView user={activeEmployee} pharmacyId={pId} orders={orders.filter((o: any) => o.pharmacyId === pId)} pumps={pumps.filter((p: any) => p.pharmacyId === pId)} clients={clients.filter((c: any) => c.pharmacyId === pId)} staff={[]} drivers={drivers} onLogout={() => { setActiveEmployee(null); setView('selection'); setPin(""); }} allPumps={pumps} />;
  }

  if (view === 'driver_market' && activeEmployee) {
    const myCustody = pumps.filter((p: any) => p.status === 'with_driver' && p.currentDriverId === activeEmployee.id);
    return <DriverApp user={activeEmployee} orders={orders.filter((o: any)=>o.status==='ready')} allOrders={orders} allPumps={pumps} myCustodyPumps={myCustody} onLogout={() => { setActiveEmployee(null); setView('selection'); setPin(""); }} />;
  }

  return null;
}