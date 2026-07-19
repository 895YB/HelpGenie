import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageBubble from '../../src/components/MessageBubble.jsx';

const config = {
  primaryColor: '#0ea5e9',
  showSources: true,
  allowFeedback: true,
};

describe('MessageBubble', () => {
  it('renders user messages as plain text', () => {
    render(
      <MessageBubble
        message={{ id: null, role: 'user', content: 'Hello there', createdAt: new Date().toISOString() }}
        config={config}
        onFeedback={vi.fn()}
      />
    );
    expect(screen.getByText('Hello there')).toBeInTheDocument();
  });

  it('renders assistant messages via markdown, and shows sources + feedback controls', () => {
    const onFeedback = vi.fn();
    render(
      <MessageBubble
        message={{
          id: 'm1',
          role: 'assistant',
          content: '**Bold** answer',
          sources: [{ chunkId: 'c1', documentId: 'd1', documentName: 'Doc A', excerpt: 'excerpt text', score: 0.9 }],
          createdAt: new Date().toISOString(),
        }}
        config={config}
        onFeedback={onFeedback}
      />
    );

    expect(screen.getByText('Bold').tagName).toBe('STRONG');
    expect(screen.getByText('1 source')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Good response'));
    expect(onFeedback).toHaveBeenCalledWith('m1', 'thumbs_up');
  });

  it('hides feedback controls while a message is still streaming', () => {
    render(
      <MessageBubble
        message={{ id: null, role: 'assistant', content: '', streaming: true, createdAt: new Date().toISOString() }}
        config={config}
        onFeedback={vi.fn()}
      />
    );
    expect(screen.queryByLabelText('Good response')).not.toBeInTheDocument();
  });
});
