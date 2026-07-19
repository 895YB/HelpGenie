import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import widgetStyles from './index.css?inline';

// Captured synchronously at module-evaluation time — by the time DOMContentLoaded
// fires (the `mount()` deferral path below), document.currentScript is already null.
const embedScript = document.currentScript || document.querySelector('script[data-widget-id]');

function mount() {
  const widgetId = embedScript?.getAttribute('data-widget-id');
  const themeOverride = embedScript?.getAttribute('data-theme') || null;

  if (!widgetId) {
    console.error('[AIWidget] Embed script is missing the required data-widget-id attribute.');
    return;
  }

  if (document.getElementById('ai-widget-host')) return; // avoid double-mount on re-execution

  const host = document.createElement('div');
  host.id = 'ai-widget-host';
  document.body.appendChild(host);

  // Shadow DOM isolates the widget's styles/markup from the host page and vice versa.
  const shadowRoot = host.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = widgetStyles;
  shadowRoot.appendChild(styleEl);

  const mountPoint = document.createElement('div');
  shadowRoot.appendChild(mountPoint);

  createRoot(mountPoint).render(createElement(App, { widgetId, themeOverride }));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
