"use client";

import { useRef, useState } from "react";
import { PenTool, Eraser } from "lucide-react";

interface SignaturePadProps {
  onSave: (data: string) => void;
  label: string;
}

export default function SignaturePad({ onSave, label }: SignaturePadProps) {
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

    if (e.type === "touchstart") {
      document.body.style.overflow = "hidden";
    }

    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    const move = (moveEvent: any) => {
      if (moveEvent.type === "touchmove") moveEvent.preventDefault();
      const coords = getCoordinates(moveEvent, canvas);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setHasSignature(true);
    };

    const end = () => {
      document.body.style.overflow = "auto";
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
      onSave(canvas.toDataURL());
    };

    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSave("");
  };

  return (
    <div className="bg-white p-3 rounded-2xl border-2 border-slate-200">
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <PenTool className="w-3 h-3" /> {label}
        </label>
        <button
          onClick={clear}
          type="button"
          className="text-red-400 p-1 hover:bg-red-50 rounded-full"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>

      <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden touch-none relative h-32">
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="w-full h-full block cursor-crosshair"
          onMouseDown={startDrawing}
          onTouchStart={startDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-[10px] font-bold uppercase">
            Firmar Aquí
          </div>
        )}
      </div>
    </div>
  );
}
