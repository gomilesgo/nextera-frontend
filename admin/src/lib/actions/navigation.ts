import { unstable_rethrow } from "next/navigation";

export function isNavigationError(error: unknown): boolean {
  try {
    unstable_rethrow(error);
    return false;
  } catch {
    return true;
  }
}

export async function runAction<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    unstable_rethrow(error);
    throw error;
  }
}
