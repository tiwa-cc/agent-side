export function stringify(value: unknown): string {
  if (Array.isArray(value)) return value.map(stringify).join(", ");
  if (value && typeof value === "object") return Object.values(value).map(stringify).join(", ");
  return String(value ?? "");
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function safeHref(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^(#|\/(?!\/)|\.{0,2}\/)/.test(trimmed)) return trimmed;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return undefined;
}

export function labelize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
