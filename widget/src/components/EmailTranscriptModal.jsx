import { useState } from 'react';
import { CloseIcon } from './icons.jsx';

/** @param {{onClose: () => void, onSubmit: (email: string) => Promise<unknown>}} props */
export default function EmailTranscriptModal({ onClose, onSubmit }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || status === 'sending') return;
    setStatus('sending');
    try {
      await onSubmit(email.trim());
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/30 p-4">
      <div className="w-full max-w-xs rounded-xl bg-white p-4 shadow-xl dark:bg-gray-900">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Email this conversation</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <CloseIcon size={16} />
          </button>
        </div>

        {status === 'sent' ? (
          <p className="text-sm text-green-600">Transcript sent to {email}.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            {status === 'error' && <p className="text-xs text-red-500">Couldn't send the transcript. Try again.</p>}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
