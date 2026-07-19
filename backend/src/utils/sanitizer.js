/**
 * Input sanitization utilities.
 * express-mongo-sanitize handles NoSQL injection at the middleware level;
 * these helpers cover string-level XSS and prompt injection at the field level.
 */

// Characters that break out of JSON or HTML contexts
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escapes HTML special characters.
 * Use on any string rendered directly into HTML without a framework.
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') {return str;}
  return str.replace(/[&<>"'/]/g, (c) => HTML_ESCAPE_MAP[c]);
}

/**
 * Strips null bytes and trims excessive whitespace.
 * Safe baseline for any user-supplied string stored in MongoDB.
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') {return str;}
  return str
    .replace(/\0/g, '')          // null bytes
    .replace(/\r\n/g, '\n')      // normalize line endings
    .trim();
}

/**
 * Lightweight prompt-injection defense for user chat messages.
 * Strips common instruction-override patterns before they reach the LLM.
 *
 * Note: the system prompt is the primary defense; this is a secondary filter.
 */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /forget\s+(all\s+)?previous\s+instructions?/gi,
  /disregard\s+(all\s+)?previous\s+instructions?/gi,
  /you\s+are\s+now\s+(a|an)\s+/gi,
  /act\s+as\s+(a|an)\s+/gi,
  /pretend\s+(you\s+are|to\s+be)\s+/gi,
  /<\|?system\|?>/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
];

export function sanitizeChatMessage(message) {
  if (typeof message !== 'string') {return '';}

  let clean = sanitizeString(message);

  // Flag if injection pattern detected; caller decides how to handle
  const hasInjection = INJECTION_PATTERNS.some((p) => p.test(clean));
  if (hasInjection) {
    // Replace the problematic phrase rather than rejecting outright
    INJECTION_PATTERNS.forEach((p) => {
      clean = clean.replace(p, '[removed]');
    });
  }

  // Truncate to a sane limit before it reaches the LLM
  return clean.slice(0, 2000);
}

/**
 * Sanitizes an object's string values recursively.
 * Used as a belt-and-suspenders layer on incoming request bodies.
 */
export function sanitizeObject(obj, depth = 0) {
  if (depth > 5 || obj === null || typeof obj !== 'object') {return obj;}
  const out = Array.isArray(obj) ? [] : {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      out[key] = sanitizeString(val);
    } else if (typeof val === 'object' && val !== null) {
      out[key] = sanitizeObject(val, depth + 1);
    } else {
      out[key] = val;
    }
  }
  return out;
}
