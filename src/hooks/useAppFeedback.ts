import { useRef, useState } from "react";

type ConfirmState = { message: string } | null;
type ToastState = { message: string; onUndo?: () => void } | null;

export function useAppFeedback() {
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const confirmResolver = useRef<((value: boolean) => void) | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const confirmAction = (message: string) =>
    new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
      setConfirmState({ message });
    });

  const resolveConfirm = (value: boolean) => {
    confirmResolver.current?.(value);
    confirmResolver.current = null;
    setConfirmState(null);
  };

  const showToast = (message: string, onUndo?: () => void) => {
    setToast({ message, onUndo });
    window.setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 5000);
  };

  return {
    confirmState,
    toast,
    confirmAction,
    resolveConfirm,
    showToast,
    clearToast: () => setToast(null),
  };
}
