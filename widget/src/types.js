/**
 * Shared JSDoc type definitions for the widget. Plain-JS + JSDoc (not .ts) to
 * stay consistent with the rest of the monorepo, while still giving editors
 * type-checking and autocomplete via `@type {import('./types').X}` comments.
 */

/**
 * @typedef {Object} WidgetConfig
 * @property {string} companyName
 * @property {string} botName
 * @property {string} welcomeMessage
 * @property {string} placeholder
 * @property {string} primaryColor
 * @property {string} secondaryColor
 * @property {string} accentColor
 * @property {string|null} logo
 * @property {string|null} avatar
 * @property {'bottom-right'|'bottom-left'} position
 * @property {number} zIndex
 * @property {'dark'|'light'} theme
 * @property {string[]} suggestedQuestions
 * @property {boolean} showSources
 * @property {boolean} allowFeedback
 * @property {boolean} allowEmailTranscript
 */

/**
 * @typedef {Object} ChatSource
 * @property {string} chunkId
 * @property {string} documentId
 * @property {string} documentName
 * @property {string} excerpt
 * @property {number} score
 * @property {number|null} [page]
 * @property {string|null} [url]
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string|null} id
 * @property {'user'|'assistant'} role
 * @property {string} content
 * @property {ChatSource[]} [sources]
 * @property {boolean} [answeredFromContext]
 * @property {number} [responseTimeMs]
 * @property {string} createdAt
 * @property {'thumbs_up'|'thumbs_down'|null} [feedback]
 * @property {boolean} [streaming]
 */

/**
 * @typedef {Object} ChatDonePayload
 * @property {string} sessionId
 * @property {string} conversationId
 * @property {string} messageId
 * @property {string} answer
 * @property {ChatSource[]} sources
 * @property {boolean} answeredFromContext
 * @property {{prompt: number, completion: number, total: number}} tokensUsed
 * @property {number} responseTimeMs
 */

export {};
