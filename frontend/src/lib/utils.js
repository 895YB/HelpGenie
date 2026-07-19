// Minimal className merge utility — avoids pulling in clsx/tailwind-merge
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
