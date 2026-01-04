"use client";

import { Send, ImagePlus, X } from "lucide-react";
import { motion } from "framer-motion";

import { useState, useRef } from "react";

import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";

import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";

interface AIInputWithSearchProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  onSubmit?: (value: string, withSearch: boolean, images?: File[]) => void;
  onFileSelect?: (file: File) => void;
  className?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  enableImageUpload?: boolean;
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
  enableImageUpload = false,
}: AIInputWithSearchProps) {
  const [internalValue, setInternalValue] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...imageFiles]);
      
      // Create previews
      imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if ((value.trim() || selectedImages.length > 0) && !disabled) {
      onSubmit?.(value, false, selectedImages.length > 0 ? selectedImages : undefined);
      if (!isControlled) {
        setInternalValue("");
      }
      setSelectedImages([]);
      setImagePreviews([]);
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
          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

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
            {enableImageUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  whileHover={!disabled ? { scale: 1.05 } : {}}
                  whileTap={!disabled ? { scale: 0.95 } : {}}
                  className={cn(
                    "rounded-full p-3 transition-all duration-200",
                    !disabled
                      ? "bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white"
                      : "bg-slate-700/50 text-slate-400 cursor-not-allowed",
                    disabled && "opacity-50"
                  )}
                  title="Upload images"
                >
                  <ImagePlus className="w-5 h-5" />
                </motion.button>
              </>
            )}
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={(!value.trim() && selectedImages.length === 0) || disabled}
              whileHover={(value.trim() || selectedImages.length > 0) && !disabled ? { scale: 1.05 } : {}}
              whileTap={(value.trim() || selectedImages.length > 0) && !disabled ? { scale: 0.95 } : {}}
              className={cn(
                "rounded-full p-3 transition-all duration-200",
                (value.trim() || selectedImages.length > 0) && !disabled
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

