import type { UrlState } from '../ports/url-state';
export const browserUrlState = (): UrlState => ({ write(view) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(view)) url.searchParams.set(key, String(value));
  window.history.replaceState(null, '', url);
} });
