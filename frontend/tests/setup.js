import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollIntoView — ConversationDetail calls it to auto-scroll.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
