/**
 * Extracts a human-readable error message from an Axios error response.
 * Handles both { message } and FluentValidation { errors: { Field: ["msg"] } } shapes.
 */
export function extractApiError(error: unknown, fallback = 'Eroare server. Încearcă din nou.'): string {
  const err = error as { response?: { data?: unknown } };
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.message === 'string' && d.message) return d.message;
    if (d.errors && typeof d.errors === 'object') {
      const msgs = Object.values(d.errors as Record<string, string[]>).flat();
      if (msgs.length > 0) return msgs[0];
    }
  }
  return fallback;
}
