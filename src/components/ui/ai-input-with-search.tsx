"use client";

import { Send, ImagePlus, X } from "lucide-react";
import { motion } from "framer-motion";

import { useState, useRef, useMemo, type ReactNode } from "react";
import { validateFile, validateTaggedFiles, FILE_VALIDATION_LIMITS } from "@/lib/utils/file-validation";
import { INPUT_LIMITS } from "@/lib/constants";

import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";

import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { FileAutocomplete } from "@/components/ui/file-autocomplete";
import AiImageUploadInfoModal from "@/components/ui/modals/ai-image-upload-info-modal";

interface AIInputWithSearchProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  onSubmit?: (value: string, withSearch: boolean, images?: File[], taggedFiles?: Array<{path: string, name: string}>) => void;
  onFileSelect?: (file: File) => void;
  className?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  enableImageUpload?: boolean;
  extraControlsLeft?: ReactNode;
  availableFiles?: Array<{file_path: string, content?: string}>;
  enableFileTagging?: boolean;
  onTaggedFilesChange?: (files: Array<{path: string, name: string}>) => void;
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
  extraControlsLeft,
  availableFiles = [],
  enableFileTagging = false,
  onTaggedFilesChange,
}: AIInputWithSearchProps) {
  const [internalValue, setInternalValue] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [taggedFiles, setTaggedFiles] = useState<Array<{path: string, name: string}>>([]);
  const [showFileAutocomplete, setShowFileAutocomplete] = useState(false);
  const [autocompleteFilter, setAutocompleteFilter] = useState("");
  const [autocompletePosition, setAutocompletePosition] = useState<{top: number, left: number} | null>(null);
  const [fileValidations, setFileValidations] = useState<Map<string, {lineCount: number, isValid: boolean}>>(new Map());
  const [isImageInfoModalOpen, setIsImageInfoModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });

  const handleChange = (newValue: string) => {
    const capped = newValue.slice(0, INPUT_LIMITS.PROMPT);
    if (!isControlled) {
      setInternalValue(capped);
    }
    controlledOnChange?.(capped);

    // Detect @ character for file tagging
    if (enableFileTagging && availableFiles.length > 0) {
      const cursorPos = textareaRef.current?.selectionStart || capped.length;
      const textBeforeCursor = capped.slice(0, cursorPos);

      // Check if @ is at start or after whitespace
      const atMatch = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);

      if (atMatch) {
        const filter = atMatch[1];
        setAutocompleteFilter(filter);
        setShowFileAutocomplete(true);

        // Position at a reasonable offset from the left edge
        // This creates an inline appearance near where the user is typing
        setAutocompletePosition({ top: 0, left: 24 }); // 24px offset for inline feel
      } else {
        setShowFileAutocomplete(false);
        setAutocompleteFilter("");
      }
    }
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

  const handleImageUploadClick = () => {
    try {
      const hasSeenInfo = typeof window !== 'undefined' &&
        window.localStorage.getItem('ai_image_upload_info_seen') === '1';

      if (!hasSeenInfo) {
        setIsImageInfoModalOpen(true);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('ai_image_upload_info_seen', '1');
        }
      } else {
        fileInputRef.current?.click();
      }
    } catch (e) {
      // If localStorage fails, just open the file picker
      fileInputRef.current?.click();
    }
  };

  const handleFileTagSelect = (file: {path: string, name: string}) => {
    // Check for duplicates
    if (taggedFiles.some(t => t.path === file.path)) {
      setShowFileAutocomplete(false);
      return;
    }

    // Fetch content and validate
    const fileData = availableFiles.find(f => f.file_path === file.path)
    if (fileData?.content) {
      const validation = validateFile(fileData.content)
      setFileValidations(prev => new Map(prev).set(file.path, validation))
    }

    // Add to tagged files
    const newTaggedFiles = [...taggedFiles, file];
    setTaggedFiles(newTaggedFiles);
    onTaggedFilesChange?.(newTaggedFiles);

    // Remove the @ mention from input
    const currentValue = isControlled ? controlledValue! : internalValue;
    const cursorPos = textareaRef.current?.selectionStart || currentValue.length;
    const textBeforeCursor = currentValue.slice(0, cursorPos);
    const textAfterCursor = currentValue.slice(cursorPos);

    // Find and remove the @ mention
    const atMatch = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
    if (atMatch) {
      const beforeAt = textBeforeCursor.slice(0, textBeforeCursor.length - atMatch[0].length);
      const newValue = beforeAt + (beforeAt.endsWith(' ') ? '' : ' ') + textAfterCursor;
      handleChange(newValue);
    }

    setShowFileAutocomplete(false);
  };

  const handleRemoveTag = (index: number) => {
    const removedFile = taggedFiles[index]
    const newTaggedFiles = taggedFiles.filter((_, i) => i !== index);
    setTaggedFiles(newTaggedFiles);
    onTaggedFilesChange?.(newTaggedFiles);

    // Remove validation state
    setFileValidations(prev => {
      const newMap = new Map(prev)
      newMap.delete(removedFile.path)
      return newMap
    })
  };

  const totalValidation = useMemo(() => {
    if (taggedFiles.length === 0) return null

    const filesWithContent = taggedFiles.map(tag => {
      const fileData = availableFiles.find(f => f.file_path === tag.path)
      return {
        path: tag.path,
        name: tag.name,
        content: fileData?.content || ''
      }
    })

    return validateTaggedFiles(filesWithContent)
  }, [taggedFiles, availableFiles])

  const handleSubmit = () => {
    if ((value.trim() || selectedImages.length > 0) && !disabled) {

      if (value.length > INPUT_LIMITS.PROMPT) {
        alert(`Message must be ${INPUT_LIMITS.PROMPT.toLocaleString()} characters or less.`);
        return;
      }

      // Validate tagged files before submission
      if (taggedFiles.length > 0 && totalValidation) {
        if (totalValidation.hasInvalidFiles) {
          const invalidFiles = totalValidation.files.filter(f => !f.isValid)
          alert(
            `Cannot submit: ${invalidFiles.length} file(s) exceed ${FILE_VALIDATION_LIMITS.MAX_LINES_PER_FILE} lines.\n\n` +
            `Files:\n${invalidFiles.map(f => `- ${f.name} (${f.lineCount} lines)`).join('\n')}\n\n` +
            `Please remove these files to continue.`
          )
          return
        }

        if (totalValidation.exceedsTotalLimit) {
          alert(
            `Cannot submit: Total context (${(totalValidation.totalChars / 1000).toFixed(1)}K chars) exceeds limit (${FILE_VALIDATION_LIMITS.MAX_TOTAL_CHARACTERS / 1000}K chars).\n\n` +
            `Please remove some files to continue.`
          )
          return
        }
      }

      onSubmit?.(
        value,
        false,
        selectedImages.length > 0 ? selectedImages : undefined,
        taggedFiles.length > 0 ? taggedFiles : undefined
      );
      if (!isControlled) {
        setInternalValue("");
      }
      setSelectedImages([]);
      setImagePreviews([]);
      // Clear tagged files after submission
      setTaggedFiles([]);
      setFileValidations(new Map());
      onTaggedFilesChange?.([]);
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
          {/* Tagged Files Pills */}
          {taggedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-4 pb-2">
              {taggedFiles.map((file, index) => {
                const validation = fileValidations.get(file.path)
                const isInvalid = validation && !validation.isValid

                return (
                  <div
                    key={index}
                    className={cn(
                      "group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors",
                      isInvalid
                        ? "bg-red-900/30 border border-red-500/50 hover:bg-red-900/40"
                        : "bg-slate-700/80 border border-slate-600 hover:bg-slate-700"
                    )}
                  >
                    <span className="text-purple-400">@</span>
                    <span className="font-medium text-white">{file.name}</span>
                    {validation && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full",
                        isInvalid ? "bg-red-500 text-white" : "bg-slate-600 text-slate-300"
                      )}>
                        {validation.lineCount}L
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(index)}
                      className="ml-1 hover:bg-slate-600 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3 text-slate-400 hover:text-white" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary Counter */}
          {totalValidation && totalValidation.files.length > 0 && (
            <div className="px-4 pb-2 text-xs">
              <div className={cn(
                "flex items-center justify-between px-3 py-1.5 rounded-lg",
                totalValidation.hasInvalidFiles || totalValidation.exceedsTotalLimit
                  ? "bg-red-900/20 border border-red-500/30 text-red-400"
                  : "bg-slate-800/50 border border-slate-600/30 text-slate-400"
              )}>
                <span>
                  {totalValidation.files.length} file{totalValidation.files.length !== 1 ? 's' : ''} tagged
                </span>
                <span>
                  {(totalValidation.totalChars / 1000).toFixed(1)}K chars
                </span>
              </div>
              {totalValidation.hasInvalidFiles && (
                <p className="mt-1 text-red-400 text-[11px] px-3">
                  ⚠️ Some files exceed {FILE_VALIDATION_LIMITS.MAX_LINES_PER_FILE} line limit
                </p>
              )}
              {totalValidation.exceedsTotalLimit && (
                <p className="mt-1 text-red-400 text-[11px] px-3">
                  ⚠️ Total context exceeds {FILE_VALIDATION_LIMITS.MAX_TOTAL_CHARACTERS / 1000}K character limit
                </p>
              )}
            </div>
          )}

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
              maxLength={INPUT_LIMITS.PROMPT}
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
            {extraControlsLeft && (
              <div className="flex items-center">
                {extraControlsLeft}
              </div>
            )}
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
                  onClick={handleImageUploadClick}
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
                  title="Attach images to guide frontend design (not added to extension)"
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

        {/* File Autocomplete Dropdown */}
        {enableFileTagging && showFileAutocomplete && (
          <FileAutocomplete
            files={availableFiles}
            filter={autocompleteFilter}
            isVisible={showFileAutocomplete}
            onFileSelect={handleFileTagSelect}
            onClose={() => setShowFileAutocomplete(false)}
          />
        )}

        {/* AI Image Upload Info Modal */}
        <AiImageUploadInfoModal
          isOpen={isImageInfoModalOpen}
          onClose={() => {
            setIsImageInfoModalOpen(false);
            fileInputRef.current?.click();
          }}
        />
      </div>
    </div>
  );
}

