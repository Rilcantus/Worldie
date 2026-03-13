export type ConfirmOptions = {
  confirmLabel?: string;
  tone?: "default" | "danger";
};

export type ConfirmState = {
  message: string;
  confirmLabel: string;
  tone: "default" | "danger";
} | null;

export type ToastState = { message: string; onUndo?: () => void } | null;

export function buildConfirmState(message: string, options?: ConfirmOptions): NonNullable<ConfirmState> {
  return {
    message,
    confirmLabel: options?.confirmLabel ?? "Delete",
    tone: options?.tone ?? "danger",
  };
}

export function buildToastState(message: string, onUndo?: () => void): NonNullable<ToastState> {
  return { message, onUndo };
}

export function shouldAutoClearToast(current: ToastState, message: string) {
  return current?.message === message;
}
