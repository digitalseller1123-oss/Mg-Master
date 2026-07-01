import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button } from "./ui/button";
import { Eraser } from "lucide-react";

const SignaturePad = forwardRef(function SignaturePad({ height = 180, onChange }, ref) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1E4484";
    ctx.lineWidth = 2.2;
  }, [height]);

  const pos = (e) => {
    const c = canvasRef.current.getBoundingClientRect();
    const t = e.touches?.[0];
    const x = (t ? t.clientX : e.clientX) - c.left;
    const y = (t ? t.clientY : e.clientY) - c.top;
    return { x, y };
  };

  const start = (e) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };
  const end = (e) => {
    e.preventDefault();
    setDrawing(false);
    if (onChange) onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    setHasInk(false);
    if (onChange) onChange(null);
  };

  useImperativeHandle(ref, () => ({
    getDataUrl: () => (hasInk ? canvasRef.current.toDataURL("image/png") : null),
    clear,
    isEmpty: () => !hasInk,
  }));

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="signature-canvas"
        style={{ height }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        data-testid="signature-canvas"
      />
      <div className="flex justify-between items-center mt-2">
        <span className="text-overline text-[#737373]">Firma con dedo o lápiz óptico</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear}
                data-testid="signature-clear-btn" className="text-[#737373]">
          <Eraser className="w-4 h-4 mr-1" />Limpiar
        </Button>
      </div>
    </div>
  );
});

export default SignaturePad;
