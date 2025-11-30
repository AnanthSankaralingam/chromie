"use client";

import { Send } from "lucide-react";

import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";

import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";

interface AIInputWithSearchProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  onSubmit?: (value: string, withSearch: boolean) => void;
  onFileSelect?: (file: File) => void;
  className?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

export function AIInputWithSearch({
  id = "ai-input-with-search",
  placeholder = "Search the web...",
  minHeight = 48,
  maxHeight = 164,
  onSubmit,
  onFileSelect,
  className,
  disabled = false,
  value: controlledValue,
  onChange: controlledOnChange,
}: AIInputWithSearchProps) {
  const [internalValue, setInternalValue] = useState("");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });

  const handleChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    controlledOnChange?.(newValue);
  };

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit?.(value, false);
      if (!isControlled) {
        setInternalValue("");
      }
      adjustHeight(true);
    }
  };

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto">
        <div className="relative flex flex-col">
          <div
            className="overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            <Textarea
              id={id}
              value={value}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full rounded-xl rounded-b-none px-4 py-3 bg-black border-none text-white placeholder:text-slate-400 resize-none focus-visible:ring-0 leading-[1.2]"
              ref={textareaRef}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              onChange={(e) => {
                handleChange(e.target.value);
                adjustHeight();
              }}
            />
          </div>
          <div className="h-12 bg-black rounded-b-xl">
            <div className="absolute right-3 bottom-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!value.trim() || disabled}
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  value && !disabled
                    ? "bg-sky-500/15 text-sky-500 hover:bg-sky-500/25"
                    : "bg-transparent text-slate-400 hover:text-slate-300",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

