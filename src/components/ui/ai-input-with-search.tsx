"use client";

import { Send } from "lucide-react";
import { motion } from "framer-motion";

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
  minHeight = 32,
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
    <div className={cn("w-full", className)}>
      <div className="relative max-w-3xl w-full mx-auto">
        <div
          className={cn(
            "relative rounded-2xl sm:rounded-3xl",
            "border border-slate-700/50 bg-slate-800/95 backdrop-blur-lg",
            "shadow-2xl shadow-black/60",
            "transition-all duration-300",
            "focus-within:border-sky-500/60 focus-within:shadow-sky-500/30",
            "overflow-hidden"
          )}
        >
          {/* Scrollable Textarea Container */}
          <div
            className="overflow-y-auto custom-scrollbar"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            <Textarea
              id={id}
              value={value}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "w-full px-6 py-4",
                "bg-transparent border-none",
                "text-white placeholder:text-slate-400",
                "resize-none focus-visible:ring-0",
                "leading-[1.2]",
                "flex items-center"
              )}
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

          {/* Button Container */}
          <div className="flex items-center justify-end gap-2 px-4 pb-3">
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              whileHover={value.trim() && !disabled ? { scale: 1.05 } : {}}
              whileTap={value.trim() && !disabled ? { scale: 0.95 } : {}}
              className={cn(
                "rounded-full p-3 transition-all duration-200",
                value.trim() && !disabled
                  ? "bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30"
                  : "bg-slate-700/50 text-slate-400 cursor-not-allowed",
                disabled && "opacity-50"
              )}
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

