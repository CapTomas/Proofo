"use client";

import { useRef, useEffect, useState, KeyboardEvent, ClipboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  // Track the last submitted value to prevent duplicate submissions
  const lastSubmittedRef = useRef<string | null>(null);

  // Initialize input refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Auto-complete when all digits are filled (only once per unique value)
  useEffect(() => {
    if (value.length === length && onComplete && lastSubmittedRef.current !== value) {
      lastSubmittedRef.current = value;
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const focusInput = (index: number) => {
    const input = inputRefs.current[index];
    if (input) {
      input.focus();
      input.select();
      setActiveIndex(index);
    }
  };

  const handleChange = (index: number, inputValue: string) => {
    // Only allow digits
    const digit = inputValue.replace(/\D/g, "").slice(-1);

    const newValue = value.split("");
    newValue[index] = digit;
    const newOtp = newValue.join("").slice(0, length);

    onChange(newOtp);

    // Move to next input if digit was entered
    if (digit && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Backspace
    if (e.key === "Backspace") {
      e.preventDefault();
      const newValue = value.split("");

      if (newValue[index]) {
        // Clear current field
        newValue[index] = "";
        onChange(newValue.join(""));
      } else if (index > 0) {
        // Move to previous field and clear it
        newValue[index - 1] = "";
        onChange(newValue.join(""));
        focusInput(index - 1);
      }
    }
    // Delete
    else if (e.key === "Delete") {
      e.preventDefault();
      const newValue = value.split("");
      newValue[index] = "";
      onChange(newValue.join(""));
    }
    // Arrow Left
    else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    }
    // Arrow Right
    else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
    // Home
    else if (e.key === "Home") {
      e.preventDefault();
      focusInput(0);
    }
    // End
    else if (e.key === "End") {
      e.preventDefault();
      focusInput(length - 1);
    }
    // Select all (Cmd/Ctrl + A)
    else if ((e.metaKey || e.ctrlKey) && e.key === "a") {
      e.preventDefault();
      inputRefs.current.forEach((input) => input?.select());
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, length);

    if (pastedData) {
      onChange(pastedData);
      // Focus the next empty input or the last one
      const nextIndex = Math.min(pastedData.length, length - 1);
      focusInput(nextIndex);
    }
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
    // Select the content when focused
    inputRefs.current[index]?.select();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }, (_, index) => {
        const digit = value[index] || "";

        return (
          <Input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={() => handleFocus(index)}
            onPaste={handlePaste}
            disabled={disabled}
            className={cn(
              "w-12 h-14 text-center text-xl font-semibold",
              "transition-all duration-200",
              activeIndex === index && "ring-2 ring-primary ring-offset-2",
              digit && "border-primary"
            )}
            autoComplete="one-time-code"
            aria-label={`Digit ${index + 1}`}
          />
        );
      })}
    </div>
  );
}
