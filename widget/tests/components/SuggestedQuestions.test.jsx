import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SuggestedQuestions from '../../src/components/SuggestedQuestions.jsx';

describe('SuggestedQuestions', () => {
  it('sends the clicked question and only that one', () => {
    const onSelect = vi.fn();
    render(
      <SuggestedQuestions
        questions={['What are your hours?', 'How do I reset my password?']}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText('What are your hours?'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('What are your hours?');
  });
});
