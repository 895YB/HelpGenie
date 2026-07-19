import { useState } from 'react';
import { FileText, Trash2, RefreshCw, Layers, AlertCircle } from 'lucide-react';
import { useDeleteDocument, useReprocessDocument } from '@/hooks/useDocuments';
import StatusBadge from './StatusBadge';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MIME_COLORS = {
  'application/pdf': 'bg-red-50 text-red-500',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'bg-blue-50 text-blue-500',
  'application/msword': 'bg-blue-50 text-blue-500',
  'text/plain': 'bg-gray-50 text-gray-500',
  'text/markdown': 'bg-purple-50 text-purple-500',
};

export default function DocumentCard({ doc }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation     = useDeleteDocument();
  const reprocessMutation  = useReprocessDocument();

  const iconColor = MIME_COLORS[doc.mimeType] ?? 'bg-gray-50 text-gray-500';

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteMutation.mutateAsync(doc._id);
  };

  const handleReprocess = () => reprocessMutation.mutate(doc._id);

  return (
    <div className="card flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            iconColor
          )}
        >
          <FileText className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold text-gray-900"
            title={doc.title || doc.filename}
          >
            {doc.title || doc.filename}
          </p>
          {doc.title && doc.title !== doc.filename && (
            <p className="truncate text-xs text-gray-400">{doc.filename}</p>
          )}
        </div>

        <StatusBadge status={doc.status} />
      </div>

      {/* Error message */}
      {doc.status === 'error' && doc.errorMessage && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
          {doc.errorMessage}
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>{formatBytes(doc.size)}</span>
        {doc.chunkCount > 0 && (
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {doc.chunkCount} chunk{doc.chunkCount !== 1 ? 's' : ''}
          </span>
        )}
        <span className="ml-auto">
          {new Date(doc.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-2">
        {doc.status === 'error' && (
          <Button
            variant="secondary"
            size="sm"
            isLoading={reprocessMutation.isPending}
            onClick={handleReprocess}
            className="gap-1.5"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        )}

        {confirmDelete ? (
          <>
            <span className="text-xs text-red-600">Are you sure?</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleteMutation.isPending}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </>
        ) : (
          <button
            onClick={handleDelete}
            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Delete document"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
