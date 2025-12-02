"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";
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
  height = 200,
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
    <div className={cn("space-y-3", className)} ref={containerRef}>
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed bg-white transition-colors",
          disabled
            ? "border-muted cursor-not-allowed opacity-50"
            : "border-muted-foreground/25 hover:border-muted-foreground/40"
        )}
        style={{ width: canvasSize.width, height: canvasSize.height }}
      >
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            width: canvasSize.width,
            height: canvasSize.height,
            className: "rounded-lg cursor-crosshair",
            style: { touchAction: "none" },
          }}
          backgroundColor="white"
          penColor="black"
          onEnd={handleEnd}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm">
              Sign here with your finger or mouse
            </p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={isEmpty || disabled}
          className="flex-1"
        >
          <Eraser className="h-4 w-4 mr-2" />
          Clear
        </Button>
        <Button
          type="button"
          variant={isEmpty ? "outline" : "default"}
          size="sm"
          disabled={isEmpty || disabled}
          className="flex-1"
        >
          <Check className="h-4 w-4 mr-2" />
          {isEmpty ? "Sign Above" : "Signed"}
        </Button>
      </div>
    </div>
  );
}
