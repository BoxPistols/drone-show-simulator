import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FORMATIONS, TOTAL_TIME } from '~/lib/formations';
import { ProgrammeBar } from './ProgrammeBar';

describe('<ProgrammeBar>', () => {
  it('renders one chapter button per formation', () => {
    render(
      <ProgrammeBar
        formations={FORMATIONS}
        currentIndex={0}
        currentTime={0}
        totalTime={TOTAL_TIME}
        onSeek={() => {}}
      />
    );
    const chapters = screen.getAllByRole('button');
    expect(chapters).toHaveLength(FORMATIONS.length);
  });

  it('marks the active chapter with aria-current', () => {
    render(
      <ProgrammeBar
        formations={FORMATIONS}
        currentIndex={2}
        currentTime={80}
        totalTime={TOTAL_TIME}
        onSeek={() => {}}
      />
    );
    const active = screen.getByRole('button', { name: /演目 3/ });
    expect(active).toHaveAttribute('aria-current', 'true');
    // siblings should not have it
    expect(screen.getByRole('button', { name: /演目 1/ })).not.toHaveAttribute('aria-current');
  });

  it('seeks when a chapter is clicked', async () => {
    const onSeek = vi.fn();
    render(
      <ProgrammeBar
        formations={FORMATIONS}
        currentIndex={0}
        currentTime={0}
        totalTime={TOTAL_TIME}
        onSeek={onSeek}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /演目 4/ }));
    expect(onSeek).toHaveBeenCalledWith(3);
  });
});
