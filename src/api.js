let csrfToken = null;

/** Retrieves the session-bound token required for state-changing requests. */
async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch("/api/v1/csrf", { credentials: "same-origin" });
  const payload = await response.json();
  csrfToken = payload.csrfToken;
  return csrfToken;
}

/**
 * Sends JSON requests and converts API failures into readable Error objects
 * used by forms and global status messaging.
 */
export async function apiRequest(path, options = {}) {
  const { csrfRetry = false, ...fetchOptions } = options;
  const method = fetchOptions.method ?? "GET";
  const headers = new Headers(fetchOptions.headers);
  const request = {
    ...fetchOptions,
    method,
    credentials: "same-origin",
    headers,
  };

  if (!["GET", "HEAD"].includes(method)) {
    headers.set("x-csrf-token", await ensureCsrfToken());
  }
  if (fetchOptions.body && typeof fetchOptions.body !== "string") {
    headers.set("content-type", "application/json");
    request.body = JSON.stringify(fetchOptions.body);
  }

  const response = await fetch(`/api/v1${path}`, request);
  if (response.status === 204) return null;

  const payload = await response.json();
  if (
    response.status === 403 &&
    !csrfRetry &&
    !["GET", "HEAD"].includes(method)
  ) {
    csrfToken = null;
    return apiRequest(path, { ...fetchOptions, csrfRetry: true });
  }
  if (!response.ok) {
    const error = new Error(payload.error ?? "Request failed.");
    error.status = response.status;
    error.details = payload.details;
    throw error;
  }
  return payload;
}

/** Clears client token state after logout so the next session fetches its own. */
export function resetApiSession() {
  csrfToken = null;
}
