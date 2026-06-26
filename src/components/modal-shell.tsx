"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { lockPageScroll } from "@/lib/page-scroll-lock";

type ModalShellProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  onBackdropClick?: () => void;
};

const defaultOverlayClass =
  "fixed inset-0 z-[9999] flex touch-none items-end justify-center overscroll-contain bg-black/40 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:touch-auto";

export function ModalShell({
  open,
  children,
  className,
  labelledBy,
  onBackdropClick,
}: ModalShellProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    return lockPageScroll();
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={className ?? defaultOverlayClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={
        onBackdropClick
          ? (e) => {
              if (e.target === e.currentTarget) onBackdropClick();
            }
          : undefined
      }
    >
      {children}
    </div>,
    document.body,
  );
}
