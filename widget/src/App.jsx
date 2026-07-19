import { useMemo, useState } from 'react';
import LauncherButton from './components/LauncherButton.jsx';
import ChatWindow from './components/ChatWindow.jsx';
import { useWidgetConfig } from './hooks/useWidgetConfig.js';
import { useSocketChat } from './hooks/useSocketChat.js';
import { cn } from './lib/cn.js';

/** @param {{widgetId: string, themeOverride: 'dark'|'light'|null}} props */
export default function App({ widgetId, themeOverride }) {
  const { config } = useWidgetConfig(widgetId);
  const chat = useSocketChat({ widgetId });
  const [isOpen, setIsOpen] = useState(false);

  const isDark = themeOverride ? themeOverride === 'dark' : config.theme === 'dark';
  const positionClass = config.position === 'bottom-left' ? 'left-4' : 'right-4';

  const cssVars = useMemo(
    () => ({
      '--aiw-primary': config.primaryColor,
      '--aiw-secondary': config.secondaryColor,
      '--aiw-accent': config.accentColor,
    }),
    [config.primaryColor, config.secondaryColor, config.accentColor]
  );

  return (
    <div
      className={cn('aiw-root fixed bottom-4 flex flex-col items-end gap-3 font-sans', positionClass, isDark && 'dark')}
      style={{ zIndex: config.zIndex, ...cssVars }}
    >
      {isOpen && <ChatWindow config={config} chat={chat} onClose={() => setIsOpen(false)} />}
      <LauncherButton isOpen={isOpen} onClick={() => setIsOpen((prev) => !prev)} primaryColor={config.primaryColor} />
    </div>
  );
}
