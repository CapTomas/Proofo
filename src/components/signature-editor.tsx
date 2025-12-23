"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Check, PenLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadProfileSignatureAction } from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

interface SignatureEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureUrl: string) => void;
  currentSignatureUrl?: string | null;
}

export function SignatureEditor({
  isOpen,
  onClose,
  onSave,
  currentSignatureUrl
}: SignatureEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs for drawing state (no re-renders)
  const isDrawingRef = useRef(false);
  const pointsRef = useRef<Array<{ x: number; y: number; time: number; pressure?: number }>>([]);
  const historyRef = useRef<Array<Array<{ x: number; y: number; time: number; pressure?: number }>>>([]);
  const rafRef = useRef<number>(null);

  // Setup canvas for high DPI
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set actual size in memory
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale to match screen coordinates
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  // Calculate line width based on speed (pressure simulation)
  const getLineWidth = (velocity: number) => {
    const minWidth = 1.5;
    const maxWidth = 4.5;
    const minSpeed = 0.1;
    const maxSpeed = 2.5;

    // Clamp velocity
    const speed = Math.max(minSpeed, Math.min(maxSpeed, velocity));

    // Inverse relationship: faster = thinner
    const t = (speed - minSpeed) / (maxSpeed - minSpeed);
    return maxWidth - (maxWidth - minWidth) * t;
  };

  // Render function using RAF
  const renderAdvanced = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    // Clear and background
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = "black";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Combine previous strokes and current stroke
    const strokes = [...historyRef.current];
    if (pointsRef.current.length > 0) strokes.push(pointsRef.current);

    strokes.forEach(points => {
      if (points.length === 0) return;

      // Initial width
      let width = getLineWidth(0);

      // If only one or two points, draw simple shape
      if (points.length < 3) {
        ctx.beginPath();
        const p0 = points[0];
        ctx.lineWidth = width;
        if (points.length === 1) {
            ctx.arc(p0.x, p0.y, width/2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.stroke();
        }
        return;
      }

      // Variable width smoothing algorithm
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i++) {
        const p_curr = points[i];
        const p_next = points[i+1];

        // Calculate velocity based on time
        // If time is the same, assume 0 velocity deviation
        let velocity = 0;
        if (i > 0) {
           const p_prev = points[i-1];
           const d = Math.hypot(p_curr.x - p_prev.x, p_curr.y - p_prev.y);
           const t = p_curr.time - p_prev.time;
           if (t > 0) velocity = d / t;
        }

        const targetWidth = getLineWidth(velocity);
        // Smooth changes in width
        width = width * 0.7 + targetWidth * 0.3;

        // Ideally we stroke each segment with a different width, but that's expensive/complex for overlapping joints.
        // We will simple stroke the whole path with constant width for geometric smoothness, OR break it.
        // Breaking it allows variable width.
        ctx.stroke(); // Stroke previous segment

        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.moveTo((points[i-1].x + p_curr.x)/2, (points[i-1].y + p_curr.y)/2); // Approx start
        if (i === 1) ctx.moveTo(points[0].x, points[0].y); // Fix start

        // Midpoint algo
        const mid = { x: (p_curr.x + p_next.x)/2, y: (p_curr.y + p_next.y)/2 };
        ctx.quadraticCurveTo(p_curr.x, p_curr.y, mid.x, mid.y);
      }

      // Last segment
      const last = points[points.length-1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    });

    rafRef.current = null;
  }, []);

  const requestRender = () => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(renderAdvanced);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setupCanvas();
        pointsRef.current = [];
        historyRef.current = [];
        setHasDrawn(false);
      }, 50);
    }
    return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, setupCanvas]);

  // Event handlers
  const getPoint = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, time: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: e.timeStamp
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);

    isDrawingRef.current = true;
    const point = getPoint(e);
    pointsRef.current = [point];
    renderAdvanced(); // Immediate render
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    events.forEach(event => {
        pointsRef.current.push(getPoint(event));
    });

    requestRender();
    if (!hasDrawn) setHasDrawn(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;

    const point = getPoint(e);
    pointsRef.current.push(point);
    historyRef.current.push([...pointsRef.current]);
    pointsRef.current = [];

    renderAdvanced();
  };

  const clearCanvas = () => {
    historyRef.current = [];
    pointsRef.current = [];
    renderAdvanced();
    setHasDrawn(false);
  };

  const handleSave = async () => {
    if (!canvasRef.current || !hasDrawn) return;
    setIsSaving(true);
    try {
      const signatureBase64 = canvasRef.current.toDataURL("image/png");
      if (isSupabaseConfigured()) {
        const { signatureUrl, error } = await uploadProfileSignatureAction(signatureBase64);
        if (error) { toast.error("Failed to save", { description: error }); return; }
        if (signatureUrl) { onSave(signatureUrl); toast.success("Saved!"); onClose(); }
      } else {
        onSave(signatureBase64); toast.success("Saved (Demo)"); onClose();
      }
    } catch { toast.error("Error saving"); } finally { setIsSaving(false); }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSaving) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isSaving, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !isSaving && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <PenLine className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Update Signature</h3>
                  <p className="text-xs text-muted-foreground">Professional pressure-sensitive signing</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content Area */}
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Always show current signature if available - Layout Fixed */}
              {currentSignatureUrl && (
                <div className="text-center pb-2 border-b border-border/50">
                   <p className="text-xs text-muted-foreground mb-1">Current Signature</p>
                   <div className="h-12 flex items-center justify-center">
                     <img src={currentSignatureUrl} alt="Current" className="h-full object-contain opacity-70" />
                   </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground text-center">
                 {hasDrawn ? "Looks great! Ready to save?" : "Sign below using your mouse or finger"}
              </p>

              {/* Canvas Container */}
              <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-border bg-white shadow-inner touch-none select-none">
                <canvas
                  ref={canvasRef}
                  className="w-full h-48 cursor-crosshair touch-none block"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
                {!hasDrawn && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                     <span className="text-4xl font-serif italic text-muted-foreground">Sign Here</span>
                   </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 bg-muted/30 border-t border-border shrink-0">
              <Button variant="outline" size="sm" onClick={clearCanvas} disabled={!hasDrawn || isSaving} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Clear
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={!hasDrawn || isSaving} className="gap-2 min-w-[100px]">
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
