"use client";

import { useState, useCallback } from "react";
import { TIMING } from "@/lib/constants";

interface UseCopyToClipboardOptions {
  /** Duration in ms to show the copied state (default: TIMING.COPY_FEEDBACK) */
  resetDelay?: number;
  /** Callback when copy succeeds */
  onSuccess?: () => void;
  /** Callback when copy fails */
  onError?: (error: Error) => void;
}

interface UseCopyToClipboardReturn {
  /** Whether the content was recently copied */
  copied: boolean;
  /** Whether a copy operation is in progress */
  isLoading: boolean;
  /** Any error from the last copy attempt */
  error: Error | null;
  /** Function to copy text to clipboard */
  copyToClipboard: (text: string) => Promise<boolean>;
  /** Reset the copied state manually */
  reset: () => void;
}

/**
 * Hook for copying text to clipboard with feedback state
 *
 * @example
 * ```tsx
 * const { copied, copyToClipboard } = useCopyToClipboard();
 *
 * <button onClick={() => copyToClipboard("Hello!")}>
 *   {copied ? <Check /> : <Copy />}
 * </button>
 * ```
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardReturn {
  const { resetDelay = TIMING.COPY_FEEDBACK, onSuccess, onError } = options;

  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setCopied(false);
    setError(null);
  }, []);

  const copyToClipboard = useCallback(
    async (text: string): Promise<boolean> => {
      if (!text) {
        const err = new Error("No text provided to copy");
        setError(err);
        onError?.(err);
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Modern Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          const result = document.execCommand("copy");
          document.body.removeChild(textArea);

          if (!result) {
            throw new Error("Failed to copy text using fallback method");
          }
        }

        setCopied(true);
        onSuccess?.();

        // Auto-reset after delay
        if (resetDelay > 0) {
          setTimeout(() => {
            setCopied(false);
          }, resetDelay);
        }

        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to copy");
        setError(error);
        onError?.(error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [resetDelay, onSuccess, onError]
  );

  return {
    copied,
    isLoading,
    error,
    copyToClipboard,
    reset,
  };
}
