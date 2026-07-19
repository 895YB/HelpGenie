import { useState } from 'react';
import { ChevronIcon } from './icons.jsx';

/** @param {{sources: import('../types').ChatSource[]}} props */
export default function SourcesList({ sources }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full text-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        <ChevronIcon className={open ? 'rotate-180' : ''} />
        {sources.length} source{sources.length !== 1 ? 's' : ''}
      </button>

      {open && (
        <ul className="mt-1 space-y-1.5 rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
          {sources.map((source) => (
            <li key={source.chunkId}>
              <p className="font-medium text-gray-700 dark:text-gray-300">{source.documentName}</p>
              {source.excerpt && (
                <p className="mt-0.5 line-clamp-2 text-gray-500 dark:text-gray-400">{source.excerpt}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
