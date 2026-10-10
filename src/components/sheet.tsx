"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** While true, Escape and backdrop clicks are ignored (e.g. during a save). */
  locked?: boolean;
};

/**
 * Native <dialog> as a bottom sheet on phones and a centred modal on larger
 * screens. showModal() gives focus trapping, Escape and focus restore for free.
 */
export function Sheet({ open, onClose, title, children, footer, locked = false }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!locked) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !locked) onClose();
      }}
    >
      {open && (
        <div className="sheet-panel card-surface flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl [@media(max-height:500px)]:max-h-[98dvh]">
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-white/20 sm:hidden [@media(max-height:500px)]:hidden" aria-hidden="true" />
          <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5 [@media(max-height:500px)]:py-1.5">
            <h2 id={titleId} className="font-display text-2xl font-bold uppercase tracking-wide [@media(max-height:500px)]:text-xl">
              {title}
            </h2>
            <button type="button" className="icon-btn" onClick={onClose} disabled={locked} aria-label="Close">
              <CloseIcon />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
          {footer && (
            <footer className="border-t border-white/10 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [@media(max-height:500px)]:py-2">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
