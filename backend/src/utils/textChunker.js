/**
 * Splits a long text into overlapping chunks for vector indexing.
 *
 * Strategy (priority order):
 *   1. Split on double-newline paragraph boundaries
 *   2. If a paragraph still exceeds chunkSize, split on sentence endings
 *   3. If a sentence still exceeds chunkSize, split on word boundaries
 *
 * Each chunk after the first receives a short "context tail" from the
 * previous chunk so the RAG pipeline can surface answers that span
 * natural chunk boundaries.
 */

const DEFAULT_CHUNK_SIZE = 1500;    // characters (~375 tokens)
const DEFAULT_OVERLAP    = 200;     // characters prepended from prev chunk

// ── Text cleaning ────────────────────────────────────────────

function cleanText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')       // collapse multiple spaces
    .replace(/\n{3,}/g, '\n\n')   // max two consecutive newlines
    .trim();
}

// ── Sentence splitting ───────────────────────────────────────
// Matches any run of text ending with .!? optionally followed by closing
// punctuation/quotes, then whitespace OR end-of-string.
const SENTENCE_RE = /[^.!?]*[.!?][)"'’”]?(?:\s+|$)/g;

function splitSentences(text) {
  const sentences = text.match(SENTENCE_RE) ?? [];
  // Anything left after the last terminal punctuation mark
  const matched = sentences.join('');
  const remainder = text.slice(matched.length).trim();
  if (remainder) sentences.push(remainder);
  return sentences.filter((s) => s.trim().length > 0);
}

// ── Word-boundary fallback ───────────────────────────────────

function splitAtWordBoundary(text, maxLen) {
  const parts = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLen;
    if (end < text.length) {
      const spaceIdx = text.lastIndexOf(' ', end);
      if (spaceIdx > start) end = spaceIdx;
    }
    parts.push(text.slice(start, end).trim());
    start = end;
  }
  return parts.filter(Boolean);
}

// ── Chunk builder ────────────────────────────────────────────

function makeChunk(content, index) {
  const trimmed = content.trim();
  return {
    content: trimmed,
    chunkIndex: index,
    wordCount: trimmed.split(/\s+/).filter(Boolean).length,
    // Rough token estimate: 1 token ≈ 4 chars (works for English)
    tokenCount: Math.ceil(trimmed.length / 4),
  };
}

// ── Main export ──────────────────────────────────────────────

/**
 * @param {string} text       Raw document text
 * @param {object} [options]
 * @param {number} [options.chunkSize=1500]  Target chunk size in characters
 * @param {number} [options.overlap=200]     Overlap tail in characters
 * @returns {Array<{content, chunkIndex, wordCount, tokenCount}>}
 */
export function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap   = options.overlap   ?? DEFAULT_OVERLAP;

  const cleaned = cleanText(text);
  if (!cleaned) return [];

  // Short document: single chunk, no splitting needed
  if (cleaned.length <= chunkSize) {
    return [makeChunk(cleaned, 0)];
  }

  // ── Step 1: paragraph-level split ───────────────────────
  const paragraphs = cleaned.split(/\n\n+/).filter((p) => p.trim());

  // ── Step 2: greedily combine paragraphs into chunks ─────
  const rawChunks = [];   // array of strings (before overlap injection)
  let buffer = '';

  for (const para of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${para}` : para;

    if (candidate.length <= chunkSize) {
      buffer = candidate;
      continue;
    }

    // Flush the current buffer as a completed chunk
    if (buffer.trim()) {
      rawChunks.push(buffer.trim());
      buffer = '';
    }

    // The paragraph itself may be larger than chunkSize
    if (para.length > chunkSize) {
      const sentences = splitSentences(para);
      let sentBuf = '';

      for (const sent of sentences) {
        const sentCandidate = sentBuf ? `${sentBuf} ${sent}` : sent;

        if (sentCandidate.length <= chunkSize) {
          sentBuf = sentCandidate;
          continue;
        }

        if (sentBuf.trim()) {
          rawChunks.push(sentBuf.trim());
          sentBuf = '';
        }

        // Sentence itself is longer than chunkSize — word-boundary split
        if (sent.length > chunkSize) {
          const parts = splitAtWordBoundary(sent.trim(), chunkSize);
          // All but the last go directly to rawChunks
          for (let i = 0; i < parts.length - 1; i++) {
            rawChunks.push(parts[i]);
          }
          sentBuf = parts[parts.length - 1] ?? '';
        } else {
          sentBuf = sent.trim();
        }
      }

      if (sentBuf.trim()) buffer = sentBuf.trim();
    } else {
      buffer = para;
    }
  }

  if (buffer.trim()) rawChunks.push(buffer.trim());

  // ── Step 3: inject overlap ───────────────────────────────
  if (overlap <= 0 || rawChunks.length <= 1) {
    return rawChunks.map(makeChunk);
  }

  return rawChunks.map((content, i) => {
    if (i === 0) return makeChunk(content, i);

    const prev = rawChunks[i - 1];
    const tail = prev.slice(-overlap);
    // Start the overlap at the first word boundary so we don't cut mid-word
    const wordStart = tail.indexOf(' ');
    const contextTail = wordStart > -1 ? tail.slice(wordStart + 1) : tail;

    return makeChunk(`${contextTail} ${content}`, i);
  });
}

/**
 * Returns summary stats for a chunk array — used in analytics and document metadata.
 */
export function chunkStats(chunks) {
  return {
    chunkCount: chunks.length,
    totalWords: chunks.reduce((s, c) => s + c.wordCount, 0),
    totalTokens: chunks.reduce((s, c) => s + c.tokenCount, 0),
    avgChunkLength: chunks.length
      ? Math.round(chunks.reduce((s, c) => s + c.content.length, 0) / chunks.length)
      : 0,
  };
}
