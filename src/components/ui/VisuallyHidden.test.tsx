import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisuallyHidden } from './VisuallyHidden';

describe('<VisuallyHidden>', () => {
  it('renders text accessible to screen readers but visually hidden', () => {
    render(<VisuallyHidden>secret label</VisuallyHidden>);
    const el = screen.getByText('secret label');
    expect(el).toBeInTheDocument();
    // sr-only style: clip rect collapses the box visually
    expect(el).toHaveStyle({ position: 'absolute', width: '1px', height: '1px' });
  });

  it('renders inline when visible=true', () => {
    render(<VisuallyHidden visible>shown</VisuallyHidden>);
    expect(screen.getByText('shown')).toBeInTheDocument();
  });
});
