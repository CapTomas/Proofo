"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Check, PenLine, Download, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

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
  const fullscreenSigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const fullscreenWrapperRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [fullscreenCanvasSize, setFullscreenCanvasSize] = useState({ width: 0, height: 0 });
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle responsive sizing for normal mode
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        const newHeight = Math.max(160, Math.min(220, window.innerHeight * 0.2));
        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Handle sizing for fullscreen mode
  useEffect(() => {
    if (!isFullscreen) return;

    const updateFullscreenSize = () => {
      // Use most of the viewport, with padding
      const padding = 32;
      const maxWidth = Math.min(window.innerWidth - padding * 2, 800);
      const maxHeight = Math.min(window.innerHeight * 0.5, 400);
      setFullscreenCanvasSize({ width: maxWidth, height: maxHeight });
    };

    updateFullscreenSize();
    window.addEventListener('resize', updateFullscreenSize);

    // Prevent body scroll when in fullscreen
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('resize', updateFullscreenSize);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Prevent page scrolling when drawing on mobile - only on canvas, not the whole wrapper
  useEffect(() => {
    if (canvasSize.width === 0) return;

    const canvas = sigCanvas.current?.getCanvas();
    if (!canvas) return;

    const preventScroll = (e: TouchEvent) => {
      // Only prevent if touch is on the canvas itself
      if (e.target === canvas) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchstart', preventScroll, { passive: false });
    canvas.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventScroll);
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, [canvasSize.width]);

  // Prevent scrolling in fullscreen mode - only on canvas
  useEffect(() => {
    if (!isFullscreen || fullscreenCanvasSize.width === 0) return;

    const canvas = fullscreenSigCanvas.current?.getCanvas();
    if (!canvas) return;

    const preventScroll = (e: TouchEvent) => {
      if (e.target === canvas) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchstart', preventScroll, { passive: false });
    canvas.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventScroll);
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, [isFullscreen, fullscreenCanvasSize.width]);

  const handleClear = useCallback(() => {
    sigCanvas.current?.clear();
    fullscreenSigCanvas.current?.clear();
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

  const handleFullscreenEnd = useCallback(() => {
    if (fullscreenSigCanvas.current) {
      const isCanvasEmpty = fullscreenSigCanvas.current.isEmpty();
      setIsEmpty(isCanvasEmpty);
      if (!isCanvasEmpty) {
        const signatureData = fullscreenSigCanvas.current.toDataURL("image/png");
        onSignatureChange?.(signatureData);
      } else {
        onSignatureChange?.(null);
      }
    }
  }, [onSignatureChange]);

  // Transfer signature from fullscreen to main canvas when closing
  const handleCloseFullscreen = useCallback(() => {
    if (fullscreenSigCanvas.current && sigCanvas.current && !fullscreenSigCanvas.current.isEmpty()) {
      // Get signature data from fullscreen canvas
      const signatureData = fullscreenSigCanvas.current.toDataURL("image/png");

      // Load into main canvas
      const img = new Image();
      img.onload = () => {
        if (sigCanvas.current) {
          sigCanvas.current.clear();
          const canvas = sigCanvas.current.getCanvas();
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Scale to fit in the smaller canvas
            const scale = Math.min(
              (canvasSize.width * 0.9) / img.width,
              (canvasSize.height * 0.8) / img.height
            );
            const width = img.width * scale;
            const height = img.height * scale;
            const x = (canvasSize.width - width) / 2;
            const y = (canvasSize.height - height) / 2 - 5;
            ctx.drawImage(img, x, y, width, height);
          }
          setIsEmpty(false);
          onSignatureChange?.(signatureData);
        }
      };
      img.src = signatureData;
    }
    setIsFullscreen(false);
  }, [canvasSize, onSignatureChange]);

  // Open fullscreen and transfer existing signature if any
  const handleOpenFullscreen = useCallback(() => {
    setIsFullscreen(true);

    // Transfer existing signature to fullscreen canvas after it mounts
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signatureData = sigCanvas.current.toDataURL("image/png");

      // Small delay to ensure fullscreen canvas is mounted
      setTimeout(() => {
        if (fullscreenSigCanvas.current) {
          const img = new Image();
          img.onload = () => {
            if (fullscreenSigCanvas.current) {
              const canvas = fullscreenSigCanvas.current.getCanvas();
              const ctx = canvas.getContext("2d");
              if (ctx) {
                const scale = Math.min(
                  (fullscreenCanvasSize.width * 0.9) / img.width,
                  (fullscreenCanvasSize.height * 0.8) / img.height
                );
                const width = img.width * scale;
                const height = img.height * scale;
                const x = (fullscreenCanvasSize.width - width) / 2;
                const y = (fullscreenCanvasSize.height - height) / 2 - 10;
                ctx.drawImage(img, x, y, width, height);
              }
            }
          };
          img.src = signatureData;
        }
      }, 100);
    }
  }, [fullscreenCanvasSize]);

  // Load saved signature
  const handleLoadSaved = useCallback(async () => {
    if (!savedSignatureUrl || !sigCanvas.current || canvasSize.width === 0) return;

    setIsLoadingSaved(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (sigCanvas.current) {
          sigCanvas.current.clear();
          const canvas = sigCanvas.current.getCanvas();
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const scale = Math.min(
              (canvasSize.width * 0.8) / img.width,
              (canvasSize.height * 0.7) / img.height
            );
            const width = img.width * scale;
            const height = img.height * scale;
            const x = (canvasSize.width - width) / 2;
            const y = (canvasSize.height - height) / 2 - 10;

            ctx.drawImage(img, x, y, width, height);
          }

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
    <>
      <div className={cn("space-y-4 w-full", className)} ref={containerRef}>
        <div
          ref={canvasWrapperRef}
          style={{
            height: canvasSize.height > 0 ? canvasSize.height : 180,
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none"
          }}
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
          {/* Expand button - top right - minimal grey icon */}
          {!disabled && (
            <button
              type="button"
              onClick={handleOpenFullscreen}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleOpenFullscreen();
              }}
              className="absolute top-2.5 right-2.5 z-20 p-1.5 cursor-pointer text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200"
              title="Expand signature pad"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}

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

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseFullscreen();
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden w-full max-w-[832px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <PenLine className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Signature Focus Mode</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">More space to sign comfortably</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseFullscreen}
                  className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Canvas Area */}
              <div className="md:p-5 p-3 bg-background">
                <div
                  ref={fullscreenWrapperRef}
                  style={{
                    height: fullscreenCanvasSize.height > 0 ? fullscreenCanvasSize.height : 300,
                    touchAction: "none",
                    userSelect: "none",
                    WebkitUserSelect: "none"
                  }}
                  className={cn(
                    "relative w-full rounded-xl border-2 border-dashed bg-white overflow-hidden transition-all duration-200 mx-auto",
                    isEmpty
                      ? "border-muted-foreground/20"
                      : "border-primary/50 shadow-sm"
                  )}
                >
                  {/* Signature line */}
                  <div className="absolute bottom-16 left-12 right-12 h-px bg-muted-foreground/15" />
                  <div className="absolute bottom-8 left-12 text-xs text-muted-foreground/40 tracking-widest uppercase font-bold">
                    Sign above
                  </div>

                  {fullscreenCanvasSize.width > 0 && (
                    <SignatureCanvas
                      ref={fullscreenSigCanvas}
                      canvasProps={{
                        width: fullscreenCanvasSize.width,
                        height: fullscreenCanvasSize.height,
                        className: "cursor-crosshair w-full h-full",
                        style: { touchAction: "none" },
                      }}
                      backgroundColor="white"
                      penColor="#111111"
                      minWidth={2}
                      maxWidth={4.5}
                      onEnd={handleFullscreenEnd}
                    />
                  )}

                  {isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                      <div className="flex flex-col items-center gap-3">
                        <PenLine className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-muted-foreground/50 text-sm font-bold uppercase tracking-widest">
                          Draw your signature
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">
                    {isEmpty ? (
                      <span className="flex items-center gap-1.5 opacity-60">
                        <PenLine className="h-3 w-3" />
                        Draw your signature above
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-bold uppercase tracking-tighter">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        Signature Captured
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    disabled={isEmpty}
                    className="h-9 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors rounded-lg"
                  >
                    <Eraser className="h-3.5 w-3.5 mr-1.5" />
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCloseFullscreen}
                    className="h-9 px-4 text-xs font-bold uppercase tracking-wider rounded-lg bg-foreground text-background hover:bg-foreground/90"
                  >
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Done
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
