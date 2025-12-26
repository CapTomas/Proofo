"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Check, PenLine, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  onSignatureChange?: (signatureData: string | null) => void;
  className?: string;
  disabled?: boolean;
  savedSignatureUrl?: string; // URL of saved signature to load
}

export function SignaturePad({
  onSignatureChange,
  className,
  disabled = false,
  savedSignatureUrl,
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

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

  // Load saved signature
  const handleLoadSaved = useCallback(async () => {
    if (!savedSignatureUrl || !sigCanvas.current || canvasSize.width === 0) return;

    setIsLoadingSaved(true);
    try {
      // Load the image and draw it on the canvas
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (sigCanvas.current) {
          // Clear existing content
          sigCanvas.current.clear();

          // Get canvas context
          const canvas = sigCanvas.current.getCanvas();
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Calculate scaling to fit the signature in the canvas
            const scale = Math.min(
              (canvasSize.width * 0.8) / img.width,
              (canvasSize.height * 0.7) / img.height
            );
            const width = img.width * scale;
            const height = img.height * scale;
            const x = (canvasSize.width - width) / 2;
            const y = (canvasSize.height - height) / 2 - 10; // Slightly above center for signature line

            ctx.drawImage(img, x, y, width, height);
          }

          // Mark as not empty and get the data
          setIsEmpty(false);
          const signatureData = sigCanvas.current.toDataURL("image/png");
          onSignatureChange?.(signatureData);
        }
        setIsLoadingSaved(false);
      };
      img.onerror = () => {
        console.error("Failed to load saved signature");
        setIsLoadingSaved(false);
      };
      img.src = savedSignatureUrl;
    } catch {
      setIsLoadingSaved(false);
    }
  }, [savedSignatureUrl, canvasSize, onSignatureChange]);

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
        <div className="flex items-center gap-3">
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
          {savedSignatureUrl && isEmpty && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLoadSaved}
              disabled={disabled || isLoadingSaved}
              className="h-6 text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 transition-colors rounded-lg px-2"
            >
              <Download className="h-3 w-3 mr-1" />
              {isLoadingSaved ? "Loading..." : "Use Saved"}
            </Button>
          )}
        </div>
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
