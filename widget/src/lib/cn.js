// Minimal className merge utility — mirrors frontend/src/lib/utils.js,
// kept dependency-free since every byte here ships to third-party sites.
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
