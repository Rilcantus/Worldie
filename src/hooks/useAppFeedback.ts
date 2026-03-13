import { useCallback, useMemo, useRef, useState } from "react";
import {
  buildConfirmState,
  buildToastState,
  shouldAutoClearToast,
  type ConfirmOptions,
  type ConfirmState,
  type ToastState,
} from "./appFeedbackState";

export function useAppFeedback() {
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const confirmResolver = useRef<((value: boolean) => void) | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const confirmAction = useCallback(
    (message: string, options?: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        confirmResolver.current = resolve;
        setConfirmState(buildConfirmState(message, options));
      }),
    [],
  );

  const resolveConfirm = useCallback((value: boolean) => {
    confirmResolver.current?.(value);
    confirmResolver.current = null;
    setConfirmState(null);
  }, []);

  const showToast = useCallback((message: string, onUndo?: () => void) => {
    setToast(buildToastState(message, onUndo));
    window.setTimeout(() => {
      setToast((current) => (shouldAutoClearToast(current, message) ? null : current));
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
