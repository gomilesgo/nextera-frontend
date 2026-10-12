import { isNavigationError } from "./navigation";

export type FieldErrors = Partial<Record<string, string[]>>;

export type ActionFailure = { status: "error"; code: string; message: string; errors?: FieldErrors };

export type ActionOutcome<T> = { status: "ok"; data: T } | ActionFailure;

export const CHECK_FIELDS = "Please check the highlighted fields.";

export class ActionError extends Error {
  readonly code?: string;
  readonly errors: FieldErrors;

  constructor(message: string, options: { code?: string; errors?: FieldErrors } = {}) {
    super(message);
    this.name = "ActionError";
    this.code = options.code;
    this.errors = options.errors ?? {};
  }
}

export class CustomerActionError extends Error {
  readonly code: string;
  readonly errors: FieldErrors;

  constructor(failure: Omit<ActionFailure, "status">) {
    super(failure.message);
    this.name = "CustomerActionError";
    this.code = failure.code;
    this.errors = failure.errors ?? {};
  }
}

export function failure(code: string, message: string, errors?: FieldErrors): ActionFailure {
  return errors && Object.keys(errors).length > 0
    ? { status: "error", code, message, errors }
    : { status: "error", code, message };
}

export function addError(errors: FieldErrors, field: string, message: string): void {
  (errors[field] ??= []).push(message);
}

export function mapFields(fields: Record<string, string[]> | undefined, aliases: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {};
  for (const [key, messages] of Object.entries(fields ?? {})) {
    const field = aliases[key] ?? "_";
    for (const message of messages) addError(errors, field, message);
  }
  return errors;
}

export function unwrapOutcome<T>(outcome: ActionOutcome<T>): T {
  if (outcome.status === "error") {
    throw new ActionError(outcome.message, { code: outcome.code, errors: outcome.errors });
  }
  return outcome.data;
}

export function actionErrorMessage(error: unknown): string | null {
  if (!error || isNavigationError(error)) return null;
  if (error instanceof ActionError) return error.message;
  return "Could not reach the console server. Please try again.";
}

export function fieldErrors(error: unknown): FieldErrors {
  return error instanceof ActionError ? error.errors : {};
}

export function issuesToFields(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
  map: Record<string, string> = {},
): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_";
    (fields[map[key] ?? key] ??= []).push(issue.message);
  }
  return fields;
}
