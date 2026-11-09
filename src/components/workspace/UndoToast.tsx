"use client";

import { useState, useEffect, useCallback } from "react";
import { RotateCcw, X, CheckCircle2 } from "lucide-react";

export interface UndoToastState {
  id: string;
  message: string;
  onUndo: () => void;
  durationMs?: number;
}

interface UndoToastProps {
  toast?: UndoToastState | null;
  onDismiss?: () => void;
  message?: string;
  onUndo?: () => void;
  durationSeconds?: number;
}

export default function UndoToast({
  toast: toastProp,
  onDismiss: onDismissProp,
  message,
  onUndo,
  durationSeconds = 5,
}: UndoToastProps) {
  const [internalDismissed, setInternalDismissed] = useState(false);
  const [progress, setProgress] = useState(100);

  const activeMessage = toastProp?.message || message;
  const activeOnUndo = toastProp?.onUndo || onUndo;
  const activeDuration = toastProp?.durationMs || durationSeconds * 1000;
  const handleDismiss = useCallback(() => {
    if (onDismissProp) {
      onDismissProp();
    } else {
      setInternalDismissed(true);
    }
  }, [onDismissProp]);

  useEffect(() => {
    if (!activeMessage || internalDismissed) return;

    const intervalTime = 50;
    const step = (intervalTime / activeDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          handleDismiss();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeMessage, activeDuration, handleDismiss, internalDismissed]);

  if (!activeMessage || internalDismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-ink text-neutral-1 rounded-sm shadow-md border border-neutral-7 p-3 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-savings shrink-0" strokeWidth={1.75} />
          <p className="text-xs text-neutral-1 truncate">{activeMessage}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeOnUndo && (
            <button
              type="button"
              onClick={() => {
                activeOnUndo();
                handleDismiss();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-action-fill text-action-fill-foreground text-xs font-semibold rounded-xs hover:bg-action-fill-hover transition-standard min-h-[32px] focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
            className="p-1 text-neutral-4 hover:text-neutral-1 transition-standard focus-visible:ring-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Progress countdown bar */}
      <div className="w-full bg-neutral-7 h-0.5 mt-2 rounded-full overflow-hidden">
        <div
          className="bg-action-fill h-0.5 transition-all duration-50 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
