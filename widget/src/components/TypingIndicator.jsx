export default function TypingIndicator() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-sm bg-gray-100 px-3.5 py-2.5 dark:bg-gray-800">
      <span className="aiw-dot" />
      <span className="aiw-dot" style={{ animationDelay: '0.15s' }} />
      <span className="aiw-dot" style={{ animationDelay: '0.3s' }} />
    </div>
  );
}
