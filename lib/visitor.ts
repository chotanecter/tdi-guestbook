// Random, anonymous, per-browser visitor id kept in localStorage.
// Used to rate-limit likes and attribute analytics without any real identity.

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'tdi_visitor_id';
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
