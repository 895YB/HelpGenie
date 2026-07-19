import { chunkText, chunkStats } from '../../src/utils/textChunker.js';

// ── Helpers ──────────────────────────────────────────────────

function repeat(str, n) {
  return Array(n).fill(str).join(' ');
}

// A 100-word sentence (~600 chars)
const SENTENCE = repeat('word', 100);
// A large document that will definitely require splitting
const LARGE_DOC = Array(20)
  .fill(null)
  .map((_, i) => `Paragraph ${i + 1}. ${repeat('content', 50)} end.`)
  .join('\n\n');

// ── chunkText ────────────────────────────────────────────────

describe('chunkText', () => {
  it('returns an empty array for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   ')).toEqual([]);
  });

  it('returns a single chunk for short text', () => {
    const text = 'Hello world. This is a short document.';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].content).toContain('Hello world');
  });

  it('produces multiple chunks for large documents', () => {
    const chunks = chunkText(LARGE_DOC, { chunkSize: 500, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('chunk indices are sequential starting from 0', () => {
    const chunks = chunkText(LARGE_DOC, { chunkSize: 500, overlap: 50 });
    chunks.forEach((c, i) => expect(c.chunkIndex).toBe(i));
  });

  it('no chunk content exceeds chunkSize + overlap by more than one sentence', () => {
    const chunks = chunkText(LARGE_DOC, { chunkSize: 800, overlap: 100 });
    // Allow some slack: a single long sentence may push past the hard limit
    chunks.forEach((c) => {
      expect(c.content.length).toBeLessThan(800 + 100 + 600); // chunkSize + overlap + one sentence
    });
  });

  it('later chunks contain context from the previous chunk (overlap)', () => {
    const chunks = chunkText(LARGE_DOC, { chunkSize: 600, overlap: 150 });
    if (chunks.length > 1) {
      // The second chunk should start with text taken from the end of the first chunk
      const tail = chunks[0].content.slice(-100);
      const tailWord = tail.split(' ').pop();
      expect(chunks[1].content).toContain(tailWord);
    }
  });

  it('all chunks have wordCount > 0', () => {
    const chunks = chunkText(LARGE_DOC, { chunkSize: 600, overlap: 100 });
    chunks.forEach((c) => expect(c.wordCount).toBeGreaterThan(0));
  });

  it('all chunks have tokenCount > 0', () => {
    const chunks = chunkText(LARGE_DOC);
    chunks.forEach((c) => expect(c.tokenCount).toBeGreaterThan(0));
  });

  it('handles text with no paragraph breaks (wall of text)', () => {
    const wallOfText = repeat('This is a sentence.', 200).replace(/ /g, ' ');
    const chunks = chunkText(wallOfText, { chunkSize: 500, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((c) => expect(c.content.trim()).not.toBe(''));
  });

  it('handles text with many consecutive newlines', () => {
    const text = 'Para one.\n\n\n\n\nPara two.\n\n\n\nPara three.';
    const chunks = chunkText(text, { chunkSize: 200 });
    // Should normalize to max 2 newlines and not produce empty chunks
    chunks.forEach((c) => expect(c.content.trim()).toBeTruthy());
  });

  it('handles unicode text correctly', () => {
    const unicode = '日本語テスト。これはテストです。'.repeat(50);
    const chunks = chunkText(unicode, { chunkSize: 300, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((c) => expect(c.content).toBeTruthy());
  });

  it('respects overlap=0 (no overlap)', () => {
    const chunks = chunkText(LARGE_DOC, { chunkSize: 600, overlap: 0 });
    // With no overlap, chunk[1] should not contain text from the tail of chunk[0]
    if (chunks.length > 1) {
      const tail = chunks[0].content.slice(-30).trim();
      // The first few words of chunk[1] should NOT equal the last few words of chunk[0]
      const head = chunks[1].content.slice(0, 30).trim();
      expect(head).not.toBe(tail);
    }
  });

  it('custom chunkSize is respected', () => {
    // With a small chunk size, every chunk should be short
    const chunks = chunkText(LARGE_DOC, { chunkSize: 200, overlap: 20 });
    // Allow some headroom for overlap text
    chunks.forEach((c) => {
      expect(c.content.length).toBeLessThan(200 + 200 + 20);
    });
  });
});

// ── chunkStats ───────────────────────────────────────────────

describe('chunkStats', () => {
  it('returns zeros for empty array', () => {
    const stats = chunkStats([]);
    expect(stats.chunkCount).toBe(0);
    expect(stats.totalWords).toBe(0);
    expect(stats.totalTokens).toBe(0);
    expect(stats.avgChunkLength).toBe(0);
  });

  it('sums wordCount and tokenCount across all chunks', () => {
    const chunks = chunkText(LARGE_DOC, { chunkSize: 500, overlap: 50 });
    const stats = chunkStats(chunks);
    const manualWordTotal = chunks.reduce((s, c) => s + c.wordCount, 0);
    expect(stats.totalWords).toBe(manualWordTotal);
    expect(stats.chunkCount).toBe(chunks.length);
    expect(stats.avgChunkLength).toBeGreaterThan(0);
  });
});
