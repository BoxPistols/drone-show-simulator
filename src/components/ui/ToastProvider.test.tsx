import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToast } from '~/hooks/useToast';
import { ToastProvider } from './ToastProvider';

function Trigger({ msg = 'hello' }: { msg?: string }) {
  const { show } = useToast();
  return (
    <button type="button" onClick={() => show(msg)}>
      go
    </button>
  );
}

describe('<ToastProvider> + useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes a live region with role=status + aria-live=polite (always mounted)', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveAttribute('aria-atomic', 'true');
  });

  it('shows a message and auto-dismisses after the configured duration', () => {
    render(
      <ToastProvider duration={500}>
        <Trigger msg="保存しました" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'go' }));
    expect(screen.getByRole('status')).toHaveTextContent('保存しました');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('throws when useToast is called outside the provider', () => {
    expect(() => render(<Trigger />)).toThrow(/useToast must be used within/);
  });
});
