import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageBubble from '@/components/conversations/MessageBubble';

describe('MessageBubble', () => {
  it('renders a user message with the "U" avatar', () => {
    render(
      <MessageBubble
        message={{ role: 'user', content: 'How do refunds work?', createdAt: new Date().toISOString() }}
      />
    );
    expect(screen.getByText('How do refunds work?')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('shows the "From context" indicator and feedback icon for an assistant message', () => {
    render(
      <MessageBubble
        message={{
          role: 'assistant',
          content: 'Refunds are processed within 5 business days.',
          answeredFromContext: true,
          responseTimeMs: 850,
          feedback: { rating: 'thumbs_up' },
          createdAt: new Date().toISOString(),
        }}
      />
    );

    expect(screen.getByText('Refunds are processed within 5 business days.')).toBeInTheDocument();
    expect(screen.getByText('From context')).toBeInTheDocument();
    expect(screen.getByText('850ms')).toBeInTheDocument();
  });
});
