import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('<Modal>', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} label="test">
        <p>hidden</p>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders with role=dialog + aria-modal + aria-label when open', () => {
    render(
      <Modal open onClose={() => {}} label="設定">
        <button type="button">First</button>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', '設定');
  });

  it('focuses the first focusable child on open', () => {
    render(
      <Modal open onClose={() => {}} label="trap-test">
        <button type="button">First</button>
        <button type="button">Second</button>
      </Modal>
    );
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('closes when Esc is pressed', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} label="esc-test">
        <button type="button">x</button>
      </Modal>
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking the backdrop', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} label="backdrop">
        <button type="button">x</button>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement!;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close when clicking inside the dialog body', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} label="inner">
        <button type="button">inside</button>
      </Modal>
    );
    await userEvent.click(screen.getByRole('button', { name: 'inside' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
