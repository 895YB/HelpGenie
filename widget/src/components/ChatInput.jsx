import { useState } from 'react';
import { SendIcon } from './icons.jsx';

/** @param {{onSend: (question: string) => void, disabled: boolean, placeholder: string}} props */
export default function ChatInput({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState('');

  function submit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2 border-t border-gray-100 p-2.5 dark:border-gray-800">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit(e);
          }
        }}
        rows={1}
        placeholder={placeholder}
        disabled={disabled}
        className="max-h-24 flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
        style={{ backgroundColor: 'var(--aiw-primary)' }}
      >
        <SendIcon />
      </button>
    </form>
  );
}
