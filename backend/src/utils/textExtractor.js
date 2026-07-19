/**
 * Extracts plain text from PDF, DOCX, TXT files and website URLs.
 * Each extractor returns { text: string, metadata: object }.
 */

import fs from 'fs';
import { createRequire } from 'module';
import mammoth from 'mammoth';
import { load as cheerioLoad } from 'cheerio';
import axios from 'axios';
import logger from './logger.js';

// pdf-parse is CJS — use createRequire to avoid ESM interop issues
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const MAX_URL_BYTES = 5 * 1024 * 1024;   // 5 MB cap on fetched HTML
const URL_TIMEOUT_MS = 15_000;

// ── PDF ──────────────────────────────────────────────────────

export async function extractFromPDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);

  if (!data.text?.trim()) {
    throw new Error(
      'No text could be extracted from this PDF. It may be a scanned image — ' +
        'OCR is not yet supported.'
    );
  }

  return {
    text: data.text,
    metadata: {
      pageCount: data.numpages,
      title: data.info?.Title || null,
      author: data.info?.Author || null,
      creator: data.info?.Creator || null,
    },
  };
}

// ── DOCX ─────────────────────────────────────────────────────

export async function extractFromDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });

  if (result.messages?.length) {
    result.messages.forEach((m) =>
      logger.warn(`DOCX extraction warning: ${m.message}`)
    );
  }

  if (!result.value?.trim()) {
    throw new Error('No text could be extracted from this DOCX file.');
  }

  return {
    text: result.value,
    metadata: {},
  };
}

// ── TXT ──────────────────────────────────────────────────────

export async function extractFromTXT(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');

  if (!text.trim()) {
    throw new Error('The uploaded text file appears to be empty.');
  }

  return { text, metadata: {} };
}

// ── URL ──────────────────────────────────────────────────────

// CSS selectors for the main content region, tried in priority order
const CONTENT_SELECTORS = [
  'main',
  'article',
  '[role="main"]',
  '#main-content',
  '#content',
  '.content',
  '.post-content',
  '.entry-content',
  '.article-body',
];

// Elements that add noise without relevant content
const NOISE_SELECTORS = [
  'script', 'style', 'noscript',
  'nav', 'header', 'footer', 'aside',
  '.nav', '.navbar', '.menu', '.sidebar',
  '.footer', '.header', '.cookie-banner',
  '.advertisement', '.ads', '.ad',
  'form', 'button',
];

export async function extractFromURL(url) {
  let html;
  try {
    const response = await axios.get(url, {
      timeout: URL_TIMEOUT_MS,
      maxContentLength: MAX_URL_BYTES,
      headers: {
        'User-Agent': 'AI-Widget-Crawler/1.0 (documentation indexer)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 5,
      responseType: 'text',
    });
    html = response.data;
  } catch (err) {
    throw new Error(`Failed to fetch URL: ${err.message}`);
  }

  const $ = cheerioLoad(html);

  // Extract metadata before stripping elements
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().trim() ||
    $('h1').first().text().trim() ||
    url;

  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    null;

  // Remove noise
  $(NOISE_SELECTORS.join(', ')).remove();

  // Try content selectors in priority order
  let contentEl = null;
  for (const sel of CONTENT_SELECTORS) {
    if ($(sel).length) { contentEl = $(sel); break; }
  }

  const rawText = contentEl ? contentEl.text() : $('body').text();

  const text = rawText
    .replace(/[ \t]+/g, ' ')         // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')      // max 2 consecutive newlines
    .trim();

  if (!text || text.length < 50) {
    throw new Error(
      'Could not extract meaningful text from this URL. ' +
        'The page may be JavaScript-rendered or behind a login.'
    );
  }

  return {
    text,
    metadata: {
      title,
      description,
      sourceUrl: url,
      extractedAt: new Date().toISOString(),
    },
  };
}

// ── Dispatcher ───────────────────────────────────────────────

/**
 * Routes to the correct extractor based on fileType.
 * @param {'pdf'|'docx'|'txt'|'url'} fileType
 * @param {string|null} filePath   Disk path (null for URLs)
 * @param {string|null} sourceUrl  URL (null for file uploads)
 * @returns {Promise<{text: string, metadata: object}>}
 */
export async function extractText(fileType, filePath, sourceUrl) {
  switch (fileType) {
    case 'pdf':  return extractFromPDF(filePath);
    case 'docx': return extractFromDOCX(filePath);
    case 'txt':  return extractFromTXT(filePath);
    case 'url':  return extractFromURL(sourceUrl);
    default:     throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Detects file type from the MIME type returned by Multer.
 */
export function mimeToFileType(mimetype) {
  const map = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
  };
  return map[mimetype] ?? null;
}
