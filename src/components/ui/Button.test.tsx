import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('<Button>', () => {
  it('defaults to type="button" so it never submits a parent form', () => {
    render(<Button>click</Button>);
    expect(screen.getByRole('button', { name: 'click' })).toHaveAttribute('type', 'button');
  });

  it('forwards click events', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies the primary variant class', () => {
    render(<Button variant="primary">save</Button>);
    expect(screen.getByRole('button', { name: 'save' })).toHaveClass('ch-btn', 'primary');
  });

  it('applies the danger variant class', () => {
    render(<Button variant="danger">delete</Button>);
    const btn = screen.getByRole('button', { name: 'delete' });
    expect(btn).toHaveClass('ch-btn', 'ghost', 'danger');
  });

  it('respects disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        nope
      </Button>
    );
    await userEvent.click(screen.getByRole('button', { name: 'nope' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
