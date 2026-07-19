import {
  FALLBACK_RESPONSE,
  buildContextSections,
  buildSystemPrompt,
  buildMessages,
} from '../../src/utils/promptBuilder.js';

// ── Test data ────────────────────────────────────────────────

const CHUNKS = [
  {
    _id: 'chunk1',
    documentId: 'doc1',
    documentName: 'Product Manual',
    content: 'The widget supports dark mode via the theme settings.',
    score: 0.92,
    metadata: { page: 3, url: null },
  },
  {
    _id: 'chunk2',
    documentId: 'doc2',
    documentName: 'FAQ',
    content: 'To reset your password, visit the account settings page.',
    score: 0.85,
    metadata: { page: null, url: 'https://docs.example.com/faq' },
  },
  {
    _id: 'chunk3',
    documentId: 'doc1',
    documentName: 'Product Manual',
    content: 'Supported browsers include Chrome 90+, Firefox 88+, and Safari 14+.',
    score: 0.76,
    metadata: { page: 7, url: null },
  },
];

// ── buildContextSections ─────────────────────────────────────

describe('buildContextSections', () => {
  it('assigns sequential 1-based index to each section', () => {
    const sections = buildContextSections(CHUNKS);
    expect(sections[0].index).toBe(1);
    expect(sections[1].index).toBe(2);
    expect(sections[2].index).toBe(3);
  });

  it('preserves documentId, documentName, excerpt, score, page, url', () => {
    const sections = buildContextSections(CHUNKS);
    expect(sections[0].documentId).toBe('doc1');
    expect(sections[0].documentName).toBe('Product Manual');
    expect(sections[0].excerpt).toContain('dark mode');
    expect(sections[0].score).toBe(0.92);
    expect(sections[0].page).toBe(3);
    expect(sections[1].url).toBe('https://docs.example.com/faq');
  });

  it('falls back to "Knowledge Base" when documentName is missing', () => {
    const chunks = [{ _id: 'c1', documentId: 'd1', content: 'some text', score: 0.9, metadata: {} }];
    const sections = buildContextSections(chunks);
    expect(sections[0].documentName).toBe('Knowledge Base');
  });

  it('truncates very long chunk content to MAX_EXCERPT_CHARS', () => {
    const longChunk = {
      _id: 'c1',
      documentId: 'd1',
      documentName: 'Manual',
      content: 'x'.repeat(5000),
      score: 0.9,
      metadata: {},
    };
    const [section] = buildContextSections([longChunk]);
    expect(section.excerpt.length).toBeLessThanOrEqual(1200);
  });

  it('returns empty array for empty input', () => {
    expect(buildContextSections([])).toEqual([]);
  });
});

// ── buildSystemPrompt ────────────────────────────────────────

describe('buildSystemPrompt', () => {
  const sections = buildContextSections(CHUNKS);

  it('includes the company name', () => {
    const prompt = buildSystemPrompt('Acme Corp', 'Aria', sections);
    expect(prompt).toContain('Acme Corp');
  });

  it('includes the bot name', () => {
    const prompt = buildSystemPrompt('Acme Corp', 'Aria', sections);
    expect(prompt).toContain('Aria');
  });

  it('includes all context section indices', () => {
    const prompt = buildSystemPrompt('Acme Corp', 'Bot', sections);
    expect(prompt).toContain('index="1"');
    expect(prompt).toContain('index="2"');
    expect(prompt).toContain('index="3"');
  });

  it('includes chunk content in the prompt', () => {
    const prompt = buildSystemPrompt('Acme Corp', 'Bot', sections);
    expect(prompt).toContain('dark mode');
    expect(prompt).toContain('reset your password');
  });

  it('includes the FALLBACK_RESPONSE literal so LLM echoes it', () => {
    const prompt = buildSystemPrompt('Acme Corp', 'Bot', sections);
    expect(prompt).toContain(FALLBACK_RESPONSE);
  });

  it('wraps context in <knowledge_base> tags for injection resistance', () => {
    const prompt = buildSystemPrompt('Acme Corp', 'Bot', sections);
    expect(prompt).toContain('<knowledge_base>');
    expect(prompt).toContain('</knowledge_base>');
  });

  it('wraps each source in <source> tags', () => {
    const prompt = buildSystemPrompt('Acme Corp', 'Bot', sections);
    expect(prompt).toContain('<source index="1"');
    expect(prompt).toContain('</source>');
  });

  it('includes page number in source label when available', () => {
    const prompt = buildSystemPrompt('Acme Corp', 'Bot', sections);
    expect(prompt).toContain('page 3');
  });

  it('shows "No relevant context" placeholder when no sections provided', () => {
    const prompt = buildSystemPrompt('Acme Corp', 'Bot', []);
    expect(prompt).toContain('No relevant context was found');
  });

  it('escapes XML special characters in document names', () => {
    const injectionChunk = {
      ...CHUNKS[0],
      documentName: 'Acme & "Corp" <test>',
    };
    const injectionSections = buildContextSections([injectionChunk]);
    const prompt = buildSystemPrompt('Acme', 'Bot', injectionSections);
    // Raw characters should be escaped in the attribute value
    expect(prompt).not.toContain('name="Acme & "Corp" <test>"');
    expect(prompt).toContain('&amp;');
    expect(prompt).toContain('&lt;');
  });

  it('contains anti-hallucination instruction', () => {
    const prompt = buildSystemPrompt('Acme', 'Bot', sections);
    expect(prompt).toMatch(/never fabricate|NEVER fabricate/i);
  });

  it('contains anti-injection instruction', () => {
    const prompt = buildSystemPrompt('Acme', 'Bot', sections);
    expect(prompt).toMatch(/ignore these instructions|adopt a new persona/i);
  });
});

// ── buildMessages ─────────────────────────────────────────────

describe('buildMessages', () => {
  const sysPrompt = 'You are a helpful assistant.';

  it('starts with the system message', () => {
    const msgs = buildMessages(sysPrompt, [], 'Hello?');
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toBe(sysPrompt);
  });

  it('ends with the user question', () => {
    const msgs = buildMessages(sysPrompt, [], 'Hello?');
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'Hello?' });
  });

  it('includes conversation history between system and user messages', () => {
    const history = [
      { role: 'user', content: 'prev question' },
      { role: 'assistant', content: 'prev answer' },
    ];
    const msgs = buildMessages(sysPrompt, history, 'New question');
    expect(msgs).toHaveLength(4); // system + 2 history + user
    expect(msgs[1]).toEqual({ role: 'user', content: 'prev question' });
    expect(msgs[2]).toEqual({ role: 'assistant', content: 'prev answer' });
  });

  it('caps history at MAX_HISTORY_MESSAGES (10)', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `message ${i}`,
    }));
    const msgs = buildMessages(sysPrompt, history, 'Latest question');
    // system + 10 history + user = 12
    expect(msgs).toHaveLength(12);
  });

  it('filters out system messages from history', () => {
    const history = [
      { role: 'system', content: 'injected system prompt' },
      { role: 'user', content: 'question' },
      { role: 'assistant', content: 'answer' },
    ];
    const msgs = buildMessages(sysPrompt, history, 'Follow-up');
    // The injected system message should be filtered out
    const systemMessages = msgs.filter((m) => m.role === 'system');
    expect(systemMessages).toHaveLength(1); // only our controlled system prompt
    expect(systemMessages[0].content).toBe(sysPrompt);
  });

  it('handles null/undefined conversationHistory gracefully', () => {
    expect(() => buildMessages(sysPrompt, null, 'Hello')).not.toThrow();
    expect(() => buildMessages(sysPrompt, undefined, 'Hello')).not.toThrow();
  });
});

// ── FALLBACK_RESPONSE ─────────────────────────────────────────

describe('FALLBACK_RESPONSE', () => {
  it('is a non-empty string', () => {
    expect(typeof FALLBACK_RESPONSE).toBe('string');
    expect(FALLBACK_RESPONSE.length).toBeGreaterThan(10);
  });

  it('mentions "knowledge base"', () => {
    expect(FALLBACK_RESPONSE.toLowerCase()).toContain('knowledge base');
  });
});
