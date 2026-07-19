/**
 * Validates all required environment variables at startup.
 * Fails fast rather than failing silently at runtime.
 */

const required = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'OPENAI_API_KEY',
];

const optional = {
  NODE_ENV: 'development',
  PORT: '5000',
  CLIENT_URL: 'http://localhost:5173',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small',
  OPENAI_CHAT_MODEL: 'gpt-4.1',
  MAX_FILE_SIZE_MB: '20',
  UPLOAD_DIR: 'uploads',
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX: '100',
  VECTOR_SEARCH_INDEX: 'vector_index',
  VECTOR_SEARCH_NUM_CANDIDATES: '100',
  VECTOR_SEARCH_LIMIT: '5',
  SIMILARITY_THRESHOLD: '0.75',
};

export function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Copy backend/.env.example to backend/.env and fill in the values.'
    );
  }

  // Apply defaults for optional vars
  for (const [key, value] of Object.entries(optional)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export const env = {
  get nodeEnv() { return process.env.NODE_ENV; },
  get port() { return parseInt(process.env.PORT, 10); },
  get clientUrl() { return process.env.CLIENT_URL; },
  get mongodbUri() { return process.env.MONGODB_URI; },
  get jwtSecret() { return process.env.JWT_SECRET; },
  get jwtExpiresIn() { return process.env.JWT_EXPIRES_IN; },
  get jwtRefreshSecret() { return process.env.JWT_REFRESH_SECRET; },
  get jwtRefreshExpiresIn() { return process.env.JWT_REFRESH_EXPIRES_IN; },
  get openaiApiKey() { return process.env.OPENAI_API_KEY; },
  get embeddingModel() { return process.env.OPENAI_EMBEDDING_MODEL; },
  get chatModel() { return process.env.OPENAI_CHAT_MODEL; },
  get maxFileSizeMB() { return parseInt(process.env.MAX_FILE_SIZE_MB ?? '20', 10); },
  get uploadDir() { return process.env.UPLOAD_DIR ?? 'uploads'; },
  get rateLimitWindowMs() { return parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10); },
  get rateLimitMax() { return parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10); },
  get vectorSearchIndex() { return process.env.VECTOR_SEARCH_INDEX ?? 'vector_index'; },
  get vectorSearchNumCandidates() { return parseInt(process.env.VECTOR_SEARCH_NUM_CANDIDATES ?? '100', 10); },
  get vectorSearchLimit() { return parseInt(process.env.VECTOR_SEARCH_LIMIT ?? '5', 10); },
  get similarityThreshold() { return parseFloat(process.env.SIMILARITY_THRESHOLD ?? '0.75'); },
  get isProduction() { return process.env.NODE_ENV === 'production'; },
  get isTest() { return process.env.NODE_ENV === 'test'; },
};
