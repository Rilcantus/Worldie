import { useCallback, useMemo, useRef, useState } from "react";

type ConfirmOptions = {
  confirmLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmState = {
  message: string;
  confirmLabel: string;
  tone: "default" | "danger";
} | null;
type ToastState = { message: string; onUndo?: () => void } | null;

export function useAppFeedback() {
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const confirmResolver = useRef<((value: boolean) => void) | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const confirmAction = useCallback(
    (message: string, options?: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        confirmResolver.current = resolve;
        setConfirmState({
          message,
          confirmLabel: options?.confirmLabel ?? "Delete",
          tone: options?.tone ?? "danger",
        });
      }),
    [],
  );

  const resolveConfirm = useCallback((value: boolean) => {
    confirmResolver.current?.(value);
    confirmResolver.current = null;
    setConfirmState(null);
  }, []);

  const showToast = useCallback((message: string, onUndo?: () => void) => {
    setToast({ message, onUndo });
    window.setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 5000);
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  return useMemo(
    () => ({
      confirmState,
      toast,
      confirmAction,
      resolveConfirm,
      showToast,
      clearToast,
    }),
    [confirmState, toast, confirmAction, resolveConfirm, showToast, clearToast],
  );
}
