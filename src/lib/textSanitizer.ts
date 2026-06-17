const REPLACEMENT_CHARACTER = "\uFFFD";

export function sanitizeInvalidUnicodeSurrogates(value: string): string {
  let sanitized = "";
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const nextCode = value.charCodeAt(index + 1);
      if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
        sanitized += value[index] + value[index + 1];
        index += 1;
      } else {
        sanitized += REPLACEMENT_CHARACTER;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      sanitized += REPLACEMENT_CHARACTER;
      continue;
    }
    sanitized += value[index];
  }
  return sanitized;
}

export function sanitizeTextForPersistence<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeInvalidUnicodeSurrogates(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeTextForPersistence(item)) as T;
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, sanitizeTextForPersistence(entry)]),
  ) as T;
}
