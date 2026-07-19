import { useRef, useState, useCallback } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useUploadDocument } from '@/hooks/useDocuments';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'text/plain': '.txt',
  'text/markdown': '.md',
};

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

function validateFile(file) {
  if (!ACCEPTED_TYPES[file.type]) {
    return `${file.name}: unsupported file type. Use PDF, DOCX, DOC, TXT, or MD.`;
  }
  if (file.size > MAX_BYTES) {
    return `${file.name}: file exceeds the 20 MB limit.`;
  }
  return null;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadDropzone() {
  const inputRef        = useRef(null);
  const dragCounter     = useRef(0);
  const { mutateAsync } = useUploadDocument();

  const [isDragging, setIsDragging]   = useState(false);
  const [queue, setQueue]             = useState([]);      // { id, file, status, progress, error }

  const enqueue = useCallback(
    async (files) => {
      const items = Array.from(files).map((file) => ({
        id:       crypto.randomUUID(),
        file,
        error:    validateFile(file),
        status:   validateFile(file) ? 'invalid' : 'pending',
        progress: 0,
      }));

      setQueue((q) => [...q, ...items]);

      for (const item of items) {
        if (item.error) continue;

        setQueue((q) =>
          q.map((i) => (i.id === item.id ? { ...i, status: 'uploading' } : i))
        );

        try {
          await mutateAsync({
            file: item.file,
            onProgress: (pct) =>
              setQueue((q) =>
                q.map((i) => (i.id === item.id ? { ...i, progress: pct } : i))
              ),
          });
          setQueue((q) =>
            q.map((i) => (i.id === item.id ? { ...i, status: 'done', progress: 100 } : i))
          );
        } catch (err) {
          setQueue((q) =>
            q.map((i) =>
              i.id === item.id
                ? { ...i, status: 'error', error: err.message || 'Upload failed' }
                : i
            )
          );
        }
      }
    },
    [mutateAsync]
  );

  const onDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length) enqueue(e.dataTransfer.files);
  };

  const removeItem = (id) => setQueue((q) => q.filter((i) => i.id !== id));

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors',
          isDragging
            ? 'border-brand-400 bg-brand-50'
            : 'border-gray-300 bg-white hover:border-brand-300 hover:bg-gray-50'
        )}
      >
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
            isDragging ? 'bg-brand-100' : 'bg-gray-100'
          )}
        >
          <Upload
            className={cn('h-6 w-6', isDragging ? 'text-brand-500' : 'text-gray-400')}
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {isDragging ? 'Drop files here' : 'Drag & drop files, or click to browse'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            PDF, DOCX, DOC, TXT, MD &mdash; up to 20 MB each
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={Object.keys(ACCEPTED_TYPES).join(',')}
          className="hidden"
          onChange={(e) => e.target.files?.length && enqueue(e.target.files)}
        />
      </div>

      {/* Upload queue */}
      {queue.length > 0 && (
        <ul className="space-y-2">
          {queue.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5"
            >
              <FileText className="h-4 w-4 shrink-0 text-gray-400" />

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-gray-700">
                    {item.file.name}
                  </p>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatBytes(item.file.size)}
                  </span>
                </div>

                {item.status === 'uploading' && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-200"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}

                {(item.status === 'invalid' || item.status === 'error') && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {item.error}
                  </p>
                )}
              </div>

              {item.status === 'done' && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              )}

              {(item.status === 'done' || item.status === 'invalid' || item.status === 'error') && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                  className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
