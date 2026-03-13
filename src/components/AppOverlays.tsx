import { memo, useEffect, useRef } from "react";
import type { SearchResult } from "../hooks/useSearch";

type ConfirmState = {
  message: string;
  confirmLabel: string;
  tone: "default" | "danger";
} | null;
type ToastState = { message: string; onUndo?: () => void } | null;
type QuickOpenState = {
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  activeIndex: number;
} | null;

type AppOverlaysProps = {
  confirmState: ConfirmState;
  toast: ToastState;
  quickOpenState: QuickOpenState;
  onResolveConfirm: (value: boolean) => void;
  onClearToast: () => void;
  onQuickOpenQueryChange: (value: string) => void;
  onQuickOpenClose: () => void;
  onQuickOpenMove: (direction: 1 | -1) => void;
  onQuickOpenHover: (index: number) => void;
  onQuickOpenSelect: (result: SearchResult) => void;
};

export const AppOverlays = memo(function AppOverlays({
  confirmState,
  toast,
  quickOpenState,
  onResolveConfirm,
  onClearToast,
  onQuickOpenQueryChange,
  onQuickOpenClose,
  onQuickOpenMove,
  onQuickOpenHover,
  onQuickOpenSelect,
}: AppOverlaysProps) {
  const quickOpenInputRef = useRef<HTMLInputElement | null>(null);
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null);
  const quickOpenReturnFocusRef = useRef<HTMLElement | null>(null);
  const confirmReturnFocusRef = useRef<HTMLElement | null>(null);
  const previousQuickOpenStateRef = useRef(false);
  const previousConfirmStateRef = useRef(false);
  const quickOpenTitleId = "quick-open-title";
  const quickOpenResultsId = "quick-open-results";
  const confirmTitleId = "confirm-title";
  const confirmMessageId = "confirm-message";

  useEffect(() => {
    const isQuickOpenActive = Boolean(quickOpenState?.isOpen);
    const wasQuickOpenActive = previousQuickOpenStateRef.current;
    previousQuickOpenStateRef.current = isQuickOpenActive;

    if (isQuickOpenActive) {
      if (!wasQuickOpenActive) {
        const activeElement = document.activeElement;
        quickOpenReturnFocusRef.current =
          activeElement instanceof HTMLElement ? activeElement : null;
      }
      window.requestAnimationFrame(() => {
        quickOpenInputRef.current?.focus();
        quickOpenInputRef.current?.select();
      });
      return;
    }

    if (wasQuickOpenActive) {
      window.requestAnimationFrame(() => {
        quickOpenReturnFocusRef.current?.focus();
        quickOpenReturnFocusRef.current = null;
      });
    }
  }, [quickOpenState?.isOpen]);

  useEffect(() => {
    const isConfirmActive = Boolean(confirmState);
    const wasConfirmActive = previousConfirmStateRef.current;
    previousConfirmStateRef.current = isConfirmActive;

    if (isConfirmActive) {
      if (!wasConfirmActive) {
        const activeElement = document.activeElement;
        confirmReturnFocusRef.current =
          activeElement instanceof HTMLElement ? activeElement : null;
      }
      window.requestAnimationFrame(() => {
        confirmCancelRef.current?.focus();
      });
      return;
    }

    if (wasConfirmActive) {
      window.requestAnimationFrame(() => {
        confirmReturnFocusRef.current?.focus();
        confirmReturnFocusRef.current = null;
      });
    }
  }, [confirmState]);

  return (
    <>
      {quickOpenState?.isOpen ? (
        <div
          className="quick-open-overlay"
          onClick={onQuickOpenClose}
          role="presentation"
        >
          <div
            className="quick-open-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={quickOpenTitleId}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onQuickOpenClose();
                return;
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                onQuickOpenMove(1);
                return;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                onQuickOpenMove(-1);
                return;
              }

              if (event.key === "Enter") {
                const activeResult = quickOpenState.results[quickOpenState.activeIndex];
                if (!activeResult) return;
                event.preventDefault();
                onQuickOpenSelect(activeResult);
              }
            }}
          >
            <div className="quick-open-head">
              <div className="quick-open-title" id={quickOpenTitleId}>
                Quick Open
              </div>
              <div className="quick-open-hint">Ctrl/Cmd+K</div>
            </div>
            <label className="sr-only" htmlFor="quick-open-input">
              Quick open search
            </label>
            <input
              id="quick-open-input"
              ref={quickOpenInputRef}
              className="quick-open-input"
              placeholder="Jump to a document or lore page..."
              value={quickOpenState.query}
              onChange={(event) => onQuickOpenQueryChange(event.target.value)}
              role="combobox"
              aria-expanded="true"
              aria-controls={quickOpenResultsId}
              aria-autocomplete="list"
              aria-activedescendant={
                quickOpenState.results[quickOpenState.activeIndex]
                  ? `quick-open-result-${quickOpenState.activeIndex}`
                  : undefined
              }
            />
            <div className="quick-open-results" id={quickOpenResultsId} role="listbox">
              {quickOpenState.results.length === 0 ? (
                <div className="quick-open-empty">No matching pages in this world.</div>
              ) : (
                quickOpenState.results.map((result, index) => (
                  <button
                    id={`quick-open-result-${index}`}
                    key={`${result.kind}-${result.id}`}
                    className={`quick-open-result ${index === quickOpenState.activeIndex ? "active" : ""}`}
                    type="button"
                    role="option"
                    aria-selected={index === quickOpenState.activeIndex}
                    onMouseEnter={() => onQuickOpenHover(index)}
                    onClick={() => onQuickOpenSelect(result)}
                  >
                    <div className="quick-open-result-top">
                      <span className="quick-open-result-title">{result.label}</span>
                      <span className="quick-open-result-type">{result.typeLabel}</span>
                    </div>
                    <div className="quick-open-result-meta">{result.meta}</div>
                    <div className="quick-open-result-snippet">{result.snippet}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {confirmState ? (
        <div
          className="confirm-overlay"
          onClick={() => onResolveConfirm(false)}
          role="presentation"
        >
          <div
            className="confirm-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            aria-describedby={confirmMessageId}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onResolveConfirm(false);
              }
            }}
          >
            <div className="confirm-title" id={confirmTitleId}>
              Confirm
            </div>
            <div className="confirm-message" id={confirmMessageId}>
              {confirmState.message}
            </div>
            <div className="confirm-actions">
              <button
                ref={confirmCancelRef}
                className="confirm-btn ghost"
                type="button"
                onClick={() => onResolveConfirm(false)}
              >
                Cancel
              </button>
              <button
                className={`confirm-btn ${confirmState.tone === "danger" ? "danger" : ""}`}
                type="button"
                onClick={() => onResolveConfirm(true)}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          <div className="toast-message">{toast.message}</div>
          {toast.onUndo ? (
            <button
              className="toast-undo"
              type="button"
              onClick={() => {
                toast.onUndo?.();
                onClearToast();
              }}
            >
              Undo
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
});
