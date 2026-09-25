// Shared cart-reset plumbing (no components in this file, so Fast Refresh
// stays happy). Imported by the cart provider, logout buttons and the API
// client's session-expiry handler.
export const CART_KEY = 'ff_cart';
// Fired alongside clearAuth() on every logout (and session expiry) so no
// cart — memory or storage — leaks into the next account.
export const CART_CLEARED_EVENT = 'ff:cart-cleared';

export function clearCartStorage() {
  try {
    localStorage.removeItem(CART_KEY);
  } catch {
    // storage unavailable — the in-memory reset below still applies
  }
  window.dispatchEvent(new Event(CART_CLEARED_EVENT));
}
