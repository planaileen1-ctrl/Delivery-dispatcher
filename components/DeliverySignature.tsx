"use client";

import { useRef, useState } from "react";

type Props = {
  title: string;
  onSave: (dataUrl: string) => void;
  mode?: "manual" | "auto";
  onMetrics?: (metrics: {
    strokeCount: number;
    pointCount: number;
    pathLength: number;
  }) => void;
};

export default function DeliverySignature({
  title,
  onSave,
  mode = "manual",
  onMetrics,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const strokeCountRef = useRef(0);
  const pointCountRef = useRef(0);
  const pathLengthRef = useRef(0);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  function getPosition(e: any) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function start(e: any) {
    if (e?.cancelable) e.preventDefault();
    setDrawing(true);
    strokeCountRef.current += 1;
    const pos = getPosition(e);
    lastPointRef.current = pos;
    pointCountRef.current += 1;
    draw(e);
  }

  function end() {
    setDrawing(false);
    lastPointRef.current = null;
    canvasRef.current?.getContext("2d")?.beginPath();

    if (mode === "auto") {
      autoSave();
    }
  }

  function draw(e: any) {
    if (e?.cancelable) e.preventDefault();
    if (!drawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const pos = getPosition(e);

    if (lastPointRef.current) {
      const dx = pos.x - lastPointRef.current.x;
      const dy = pos.y - lastPointRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      pathLengthRef.current += distance;
    }

    lastPointRef.current = pos;
    pointCountRef.current += 1;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#ffffff";

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    setHasDrawn(true);
  }

  function clear() {
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, 400, 200);
    ctx?.beginPath();
    strokeCountRef.current = 0;
    pointCountRef.current = 0;
    pathLengthRef.current = 0;
    lastPointRef.current = null;
    setHasDrawn(false);
    onMetrics?.({
      strokeCount: 0,
      pointCount: 0,
      pathLength: 0,
    });
    onSave("");
  }

  function save() {
    if (!canvasRef.current) return;

    if (!hasDrawn) {
      alert("Signature is required.");
      return;
    }

    const dataUrl = canvasRef.current.toDataURL("image/png");

    // Validación mínima de tamaño
    if (dataUrl.length < 2000) {
      alert("Signature is too small or invalid.");
      return;
    }

    onMetrics?.({
      strokeCount: strokeCountRef.current,
      pointCount: pointCountRef.current,
      pathLength: pathLengthRef.current,
    });
    onSave(dataUrl);
  }

  function autoSave() {
    if (!canvasRef.current || !hasDrawn) return;

    const dataUrl = canvasRef.current.toDataURL("image/png");
    if (dataUrl.length < 2000) return;

    onMetrics?.({
      strokeCount: strokeCountRef.current,
      pointCount: pointCountRef.current,
      pathLength: pathLengthRef.current,
    });
    onSave(dataUrl);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>

      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="border border-white/20 rounded bg-black touch-none"
        onMouseDown={start}
        onMouseUp={end}
        onMouseMove={draw}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchEnd={end}
        onTouchMove={draw}
      />

      <div className="flex gap-2">
        <button
          onClick={clear}
          className="text-xs px-3 py-1 bg-gray-700 rounded"
        >
          Clear
        </button>

        {mode === "manual" && (
          <button
            onClick={save}
            className="text-xs px-3 py-1 bg-green-600 rounded"
          >
            Save Signature
          </button>
        )}
      </div>
    </div>
  );
}
