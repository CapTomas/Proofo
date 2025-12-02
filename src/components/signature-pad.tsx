"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Check, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  onSignatureChange?: (signatureData: string | null) => void;
  width?: number;
  height?: number;
  className?: string;
  disabled?: boolean;
}

export function SignaturePad({
  onSignatureChange,
  width = 400,
  height = 180,
  className,
  disabled = false,
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width, height });

  // Handle responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const newWidth = Math.min(containerWidth - 2, width);
        const newHeight = Math.round((newWidth / width) * height);
        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [width, height]);

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
    <div className={cn("space-y-4", className)} ref={containerRef}>
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed bg-white overflow-hidden transition-all duration-200",
          disabled
            ? "border-muted cursor-not-allowed opacity-50"
            : isEmpty
              ? "border-muted-foreground/20 hover:border-primary/40"
              : "border-primary/50 shadow-sm"
        )}
        style={{ width: canvasSize.width, height: canvasSize.height }}
        role="application"
        aria-label="Signature canvas - draw your signature here"
      >
        {/* Signature line */}
        <div className="absolute bottom-8 left-6 right-6 h-px bg-muted-foreground/20" />
        <div className="absolute bottom-4 left-6 text-[10px] text-muted-foreground/50 tracking-wide uppercase">
          Sign here
        </div>
        
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            width: canvasSize.width,
            height: canvasSize.height,
            className: "cursor-crosshair",
            style: { touchAction: "none" },
            role: "img",
            "aria-label": isEmpty ? "Empty signature canvas" : "Your signature",
          }}
          backgroundColor="white"
          penColor="#1a1625"
          minWidth={1.5}
          maxWidth={3}
          onEnd={handleEnd}
        />
        
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
                <PenLine className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground/60 text-sm font-medium" id="signature-instructions">
                Draw your signature
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={isEmpty || disabled}
          className="flex-1 h-10"
        >
          <Eraser className="h-4 w-4 mr-2" />
          Clear
        </Button>
        <Button
          type="button"
          variant={isEmpty ? "outline" : "default"}
          size="sm"
          disabled={isEmpty || disabled}
          className={cn(
            "flex-1 h-10 transition-all",
            !isEmpty && "shadow-lg shadow-primary/20"
          )}
        >
          <Check className="h-4 w-4 mr-2" />
          {isEmpty ? "Sign Above" : "Signed ✓"}
        </Button>
      </div>
    </div>
  );
}
