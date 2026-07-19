import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from './error.middleware.js';
import { env } from '../config/env.js';

// Ensure upload subdirectories exist at startup
const UPLOAD_ROOT = path.resolve(env.uploadDir);
const IMAGE_DIR = path.join(UPLOAD_ROOT, 'images');
[UPLOAD_ROOT, IMAGE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {fs.mkdirSync(dir, { recursive: true });}
});

// ── Allowed types ────────────────────────────────────────────

const DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// ── Storage engines ──────────────────────────────────────────

const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doc_${uuidv4()}${ext}`);
  },
});

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMAGE_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `img_${uuidv4()}${ext}`);
  },
});

// ── File filters ─────────────────────────────────────────────

const documentFilter = (_req, file, cb) => {
  if (DOCUMENT_TYPES.has(file.mimetype)) {return cb(null, true);}
  cb(AppError.badRequest('Only PDF, DOCX, and TXT files are allowed'), false);
};

const imageFilter = (_req, file, cb) => {
  if (IMAGE_TYPES.has(file.mimetype)) {return cb(null, true);}
  cb(AppError.badRequest('Only JPEG, PNG, and WebP images are allowed'), false);
};

// ── Multer instances ─────────────────────────────────────────

const documentUploader = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: { fileSize: env.maxFileSizeMB * 1024 * 1024, files: 1 },
}).single('file');

const imageUploader = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // 2 MB for images
}).single('image');

// ── Error wrapper ─────────────────────────────────────────────
// Converts multer's callback-style errors into Express next(err) calls
function wrap(uploader) {
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (!err) {return next();}
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            AppError.badRequest(
              `File too large. Maximum allowed size is ${env.maxFileSizeMB} MB.`
            )
          );
        }
        return next(AppError.badRequest(err.message));
      }
      next(err);
    });
  };
}

export const uploadDocument = wrap(documentUploader);
export const uploadImage = wrap(imageUploader);

/** Deletes a file from disk; logs but does not throw on failure. */
export function deleteUploadedFile(filePath) {
  if (!filePath) {return;}
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      // Only log — a missing file is not a hard error
      console.warn(`Could not delete uploaded file ${filePath}: ${err.message}`);
    }
  });
}

/** Returns the public URL path for a file stored in uploads/images. */
export function imagePublicPath(filename) {
  return `/uploads/images/${filename}`;
}
