export function buildProjectStoreErrorMessage(action: string) {
  const readableAction = action.split("_").join(" ");
  return `Worldie could not ${readableAction} in the active project file.`;
}

export function resolveProjectStoreErrorMessage(action: string, error: unknown) {
  const baseMessage = buildProjectStoreErrorMessage(action);
  if (typeof error === "string") {
    const message = error.trim();
    if (message) {
      return `${baseMessage} Detail: ${message}`;
    }
  }
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      return `${baseMessage} Detail: ${message}`;
    }
  }
  return baseMessage;
}
