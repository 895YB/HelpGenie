import { CloseIcon, MailIcon } from './icons.jsx';

/** @param {{config: import('../types').WidgetConfig, onClose: () => void, onEmailTranscript: () => void}} props */
export default function Header({ config, onClose, onEmailTranscript }) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-t-2xl px-4 py-3 text-white"
      style={{ backgroundColor: config.primaryColor }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {config.avatar || config.logo ? (
          <img
            src={config.avatar || config.logo}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full bg-white/20 object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
            {config.botName?.[0]?.toUpperCase() ?? 'A'}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{config.botName}</p>
          <p className="truncate text-xs leading-tight text-white/80">{config.companyName}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {config.allowEmailTranscript && (
          <button
            type="button"
            onClick={onEmailTranscript}
            aria-label="Email this conversation"
            className="rounded-full p-1.5 hover:bg-white/10"
          >
            <MailIcon />
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="Close chat" className="rounded-full p-1.5 hover:bg-white/10">
          <CloseIcon size={18} />
        </button>
      </div>
    </div>
  );
}
