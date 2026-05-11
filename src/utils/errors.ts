export class DocirError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DocirError";
  }
}

export function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
