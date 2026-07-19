import { useState } from 'react';
import { FileText, Search, ChevronLeft, ChevronRight, Upload, X } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import DocumentCard from '@/components/documents/DocumentCard';
import UploadDropzone from '@/components/documents/UploadDropzone';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = [
  { value: '',           label: 'All' },
  { value: 'ready',      label: 'Ready' },
  { value: 'processing', label: 'Processing' },
  { value: 'pending',    label: 'Pending' },
  { value: 'error',      label: 'Errors' },
];

export default function DocumentsPage() {
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [showUpload, setShowUpload]   = useState(false);

  const params = {
    page,
    limit: 12,
    ...(search       && { search }),
    ...(statusFilter && { status: statusFilter }),
  };

  const { data, isLoading, isError, error } = useDocuments(params);

  const docs       = data?.data       ?? [];
  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusFilter = (val) => {
    setStatus(val);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Upload knowledge base files that power your widget&apos;s answers.
          </p>
        </div>
        <Button
          onClick={() => setShowUpload((v) => !v)}
          className="gap-2 sm:w-auto w-full"
        >
          {showUpload ? (
            <>
              <X className="h-4 w-4" />
              Close
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload files
            </>
          )}
        </Button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="card p-5">
          <UploadDropzone />
        </div>
      )}

      {/* Error */}
      {isError && (
        <Alert
          type="error"
          message={error?.message || 'Failed to load documents. Please refresh.'}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={handleSearch}
            placeholder="Search documents…"
            className="input-base pl-9"
          />
        </div>

        {/* Status pills */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleStatusFilter(value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                statusFilter === value
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      {!isLoading && (
        <p className="text-sm text-gray-500">
          {pagination.total} document{pagination.total !== 1 ? 's' : ''}
          {statusFilter && ` with status "${statusFilter}"`}
          {search && ` matching "${search}"`}
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-40 animate-pulse p-4">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-lg bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
              <div className="mt-4 h-3 w-1/3 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          hasFilter={!!(search || statusFilter)}
          onUpload={() => setShowUpload(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <DocumentCard key={doc._id} doc={doc} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasFilter, onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <FileText className="h-7 w-7 text-gray-400" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-700">
        {hasFilter ? 'No documents match' : 'No documents yet'}
      </h3>
      <p className="mt-1.5 max-w-xs text-sm text-gray-400">
        {hasFilter
          ? 'Try clearing your filters to see all documents.'
          : 'Upload your first PDF, DOCX, or TXT file and your widget will start answering questions from it.'}
      </p>
      {!hasFilter && (
        <Button onClick={onUpload} className="mt-6 gap-2">
          <Upload className="h-4 w-4" />
          Upload your first document
        </Button>
      )}
    </div>
  );
}
