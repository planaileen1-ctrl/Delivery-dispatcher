"use client";

import { useRef, useState } from "react";
import { PenTool, Eraser } from "lucide-react";

export default function SignaturePad({
  onSave,
  label,
}: {
  onSave: (data: string) => void;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const getCoordinates = (event: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (e.type === "touchstart") document.body.style.overflow = "hidden";

    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    const move = (mE: any) => {
      if (mE.type === "touchmove") mE.preventDefault();
      const c = getCoordinates(mE, canvas);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
      setHasSignature(true);
    };

    const end = () => {
      document.body.style.overflow = "auto";
      canvas.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
      onSave(canvas.toDataURL());
    };

    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
  };

  return (
    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-slate-900 mb-2 text-left">
      <div className="flex justify-between items-center mb-1 text-slate-400">
        <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 text-slate-500">
          <PenTool size={12} /> {label}
        </label>
        <button
          type="button"
          onClick={() => {
            const c = canvasRef.current;
            const ctx = c?.getContext("2d");
            if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
            setHasSignature(false);
            onSave("");
          }}
          className="text-red-400 p-1"
        >
          <Eraser size={14} />
        </button>
      </div>

      <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden touch-none relative h-24">
        <canvas
          ref={canvasRef}
          width={400}
          height={160}
          className="w-full h-full block cursor-crosshair"
          onMouseDown={startDrawing}
          onTouchStart={startDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-[10px] font-black uppercase">
            Draw Signature
          </div>
        )}
      </div>
    </div>
  );
}
