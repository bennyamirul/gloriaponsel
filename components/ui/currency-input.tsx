"use client";

import * as React from "react";
import { cn, formatThousands, parseThousands } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: number | string | null;
  onValueChange?: (value: number) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allowZero?: boolean;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      className,
      value,
      onValueChange,
      onChange,
      onKeyDown,
      allowZero = false,
      placeholder = "0",
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    // Merge internal ref with forwarded ref
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const getFormattedValue = React.useCallback(
      (val: number | string | null | undefined): string => {
        if (val === null || val === undefined || val === "") return "";
        const num = parseThousands(val);
        if (num === 0 && !allowZero) return "";
        return formatThousands(num);
      },
      [allowZero]
    );

    const [displayValue, setDisplayValue] = React.useState<string>(() =>
      getFormattedValue(value)
    );

    // Synchronize external value changes
    React.useEffect(() => {
      const formatted = getFormattedValue(value);
      setDisplayValue(formatted);
    }, [value, getFormattedValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const cursorPos = input.selectionStart || 0;
      const rawText = input.value;

      // Hitung jumlah digit di sebelah kiri kursor sebelum pemformatan
      const digitsBeforeCursor = (rawText.slice(0, cursorPos).match(/\d/g) || []).length;

      const digitsOnly = rawText.replace(/\D/g, "");
      const numericVal = digitsOnly ? parseInt(digitsOnly, 10) : 0;

      let nextDisplay = "";
      if (digitsOnly) {
        nextDisplay = formatThousands(numericVal);
      } else if (allowZero && rawText.trim() === "0") {
        nextDisplay = "0";
      }

      setDisplayValue(nextDisplay);
      onValueChange?.(numericVal);

      // Trigger standard onChange if provided
      if (onChange) {
        onChange(e);
      }

      // Kembalikan posisi kursor dengan presisi setelah pemformatan
      requestAnimationFrame(() => {
        if (!input) return;
        let count = 0;
        let nextCursorPos = nextDisplay.length;

        for (let i = 0; i < nextDisplay.length; i++) {
          if (/\d/.test(nextDisplay[i])) {
            count++;
          }
          if (count >= digitsBeforeCursor) {
            nextCursorPos = i + 1;
            break;
          }
        }

        if (digitsBeforeCursor === 0) {
          nextCursorPos = 0;
        }

        input.setSelectionRange(nextCursorPos, nextCursorPos);
      });
    };

    // Tangani backspace saat kursor berada tepat setelah titik pemisah ribuan (.)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      if (e.key === "Backspace") {
        const start = input.selectionStart;
        const end = input.selectionEnd;

        // Jika tidak ada teks yang di-blok dan kursor tepat setelah karakter titik '.'
        if (start !== null && start === end && start > 0) {
          if (input.value[start - 1] === ".") {
            e.preventDefault();
            const digits = input.value.replace(/\D/g, "");
            const digitsBeforeCursor = (input.value.slice(0, start - 1).match(/\d/g) || []).length;

            if (digitsBeforeCursor > 0) {
              const newDigits =
                digits.slice(0, digitsBeforeCursor - 1) + digits.slice(digitsBeforeCursor);
              const num = newDigits ? parseInt(newDigits, 10) : 0;
              const nextDisplay = newDigits ? formatThousands(num) : "";

              setDisplayValue(nextDisplay);
              onValueChange?.(num);

              requestAnimationFrame(() => {
                let count = 0;
                let nextPos = nextDisplay.length;
                for (let i = 0; i < nextDisplay.length; i++) {
                  if (/\d/.test(nextDisplay[i])) count++;
                  if (count >= digitsBeforeCursor - 1) {
                    nextPos = i + 1;
                    break;
                  }
                }
                if (digitsBeforeCursor - 1 <= 0) nextPos = 0;
                input.setSelectionRange(nextPos, nextPos);
              });
              return;
            }
          }
        }
      }

      onKeyDown?.(e);
    };

    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
