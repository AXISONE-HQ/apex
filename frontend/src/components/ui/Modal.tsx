"use client";

import { cn } from "@/lib/cn";
import { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          {title ? (
            <h3 className="text-lg font-semibold text-[var(--color-navy-900)]">{title}</h3>
          ) : (
            <span />
          )}
          {onClose && (
            <button
              className="text-[var(--color-navy-400)] hover:text-[var(--color-navy-600)]"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
        <div className={cn("space-y-4")}>{children}</div>
      </div>
    </div>
  );
}
