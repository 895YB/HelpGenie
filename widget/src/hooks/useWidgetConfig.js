import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

/** @type {import('../types').WidgetConfig} */
const FALLBACK_CONFIG = {
  companyName: 'Support',
  botName: 'Support Assistant',
  welcomeMessage: 'Hi! How can I help you today?',
  placeholder: 'Ask me anything...',
  primaryColor: '#0ea5e9',
  secondaryColor: '#0284c7',
  accentColor: '#38bdf8',
  logo: null,
  avatar: null,
  position: 'bottom-right',
  zIndex: 9999,
  theme: 'light',
  suggestedQuestions: [],
  showSources: true,
  allowFeedback: true,
  allowEmailTranscript: true,
};

/** Fetches the public branding/config payload for a widgetId, with a sane default while loading or on error. */
export function useWidgetConfig(widgetId) {
  const [config, setConfig] = useState(FALLBACK_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    api
      .getWidgetConfig(widgetId)
      .then((data) => {
        if (!cancelled) setConfig({ ...FALLBACK_CONFIG, ...data });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [widgetId]);

  return { config, isLoading, error };
}
