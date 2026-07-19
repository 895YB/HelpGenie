import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../src/hooks/useWidgetConfig.js', () => ({
  useWidgetConfig: () => ({
    config: {
      companyName: 'Acme',
      botName: 'Ada',
      welcomeMessage: 'Hi!',
      placeholder: 'Ask...',
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
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../src/hooks/useSocketChat.js', () => ({
  useSocketChat: () => ({
    messages: [],
    sendMessage: vi.fn(),
    sendFeedback: vi.fn(),
    sendTranscript: vi.fn(),
    isConnected: true,
    isStreaming: false,
    error: null,
  }),
}));

const { default: App } = await import('../src/App.jsx');

describe('App', () => {
  it('opens the chat window from the launcher, and closes it again', () => {
    render(<App widgetId="wid_1" themeOverride={null} />);

    expect(screen.queryByPlaceholderText('Ask...')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Open chat'));
    expect(screen.getByPlaceholderText('Ask...')).toBeInTheDocument();

    const closeButtons = screen.getAllByLabelText('Close chat');
    fireEvent.click(closeButtons.at(-1));

    expect(screen.queryByPlaceholderText('Ask...')).not.toBeInTheDocument();
  });
});
