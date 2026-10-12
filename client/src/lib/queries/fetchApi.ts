import { ApiError, readApiError } from "@/lib/api/errors";

export async function fetchApi<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      headers: { accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "unavailable", "Could not reach Nextera. Check your connection and try again.");
  }
  if (!response.ok) throw await readApiError(response);
  return (await response.json()) as T;
}
