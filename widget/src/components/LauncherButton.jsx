import { ChatIcon, CloseIcon } from './icons.jsx';

/** @param {{isOpen: boolean, onClick: () => void, primaryColor: string}} props */
export default function LauncherButton({ isOpen, onClick, primaryColor }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      aria-expanded={isOpen}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ backgroundColor: primaryColor }}
    >
      {isOpen ? <CloseIcon /> : <ChatIcon />}
    </button>
  );
}
