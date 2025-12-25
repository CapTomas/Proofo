"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Check, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  onSignatureChange?: (signatureData: string | null) => void;
  className?: string;
  disabled?: boolean;
}

export function SignaturePad({
  onSignatureChange,
  className,
  disabled = false,
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Handle responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        // Use the full width of the container
        const newWidth = containerRef.current.offsetWidth;
        // More compact height for signing
        const newHeight = Math.max(160, Math.min(220, window.innerHeight * 0.2));
        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };

    updateSize();
    // Use ResizeObserver for more reliable updates than window resize
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const handleClear = useCallback(() => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    onSignatureChange?.(null);
  }, [onSignatureChange]);

  const handleEnd = useCallback(() => {
    if (sigCanvas.current) {
      const isCanvasEmpty = sigCanvas.current.isEmpty();
      setIsEmpty(isCanvasEmpty);
      if (!isCanvasEmpty) {
        const signatureData = sigCanvas.current.toDataURL("image/png");
        onSignatureChange?.(signatureData);
      } else {
        onSignatureChange?.(null);
      }
    }
  }, [onSignatureChange]);

  return (
    <div className={cn("space-y-4 w-full", className)} ref={containerRef}>
      <div
        style={{ height: canvasSize.height > 0 ? canvasSize.height : 180 }}
        className={cn(
          "relative w-full rounded-xl border-2 border-dashed bg-white overflow-hidden transition-all duration-200",
          disabled
            ? "border-muted cursor-not-allowed opacity-50"
            : isEmpty
              ? "border-muted-foreground/20 hover:border-primary/40"
              : "border-primary/50 shadow-sm"
        )}
        role="application"
        aria-label="Signature canvas"
      >
        {/* Signature line */}
        <div className="absolute bottom-10 left-8 right-8 h-px bg-muted-foreground/10" />
        <div className="absolute bottom-5 left-8 text-[10px] text-muted-foreground/40 tracking-widest uppercase font-bold">
          Sign above
        </div>

        {canvasSize.width > 0 && (
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              width: canvasSize.width,
              height: canvasSize.height,
              className: "cursor-crosshair w-full h-full",
              style: { touchAction: "none" },
            }}
            backgroundColor="white"
            penColor="#111111"
            minWidth={1.5}
            maxWidth={3.5}
            onEnd={handleEnd}
          />
        )}

        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
            <div className="flex flex-col items-center gap-2">
              <PenLine className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-muted-foreground/40 text-xs font-bold uppercase tracking-widest">
                Signature Area
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center px-4">
        <p className="text-xs text-muted-foreground">
          {isEmpty ? (
            <span className="flex items-center gap-1.5 opacity-50">
              <PenLine className="h-3 w-3" />
              Draw your signature
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold uppercase tracking-tighter">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              Signature Captured
            </span>
          )}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={isEmpty || disabled}
          className="h-8 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors rounded-lg"
        >
          <Eraser className="h-3.5 w-3.5 mr-1.5" />
          Clear
        </Button>
      </div>
    </div>
  );
}
