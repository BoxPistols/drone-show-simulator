import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FORMATIONS } from '~/lib/formations';
import { NowPlayingCard } from './NowPlayingCard';

describe('<NowPlayingCard>', () => {
  it('shows the formation index zero-padded with total', () => {
    render(<NowPlayingCard formation={FORMATIONS[2]!} index={2} total={9} />);
    expect(screen.getByText('03')).toBeInTheDocument();
    expect(screen.getByText('/09')).toBeInTheDocument();
  });

  it('renders Japanese, English, description, and duration', () => {
    const f = FORMATIONS[4]!;
    render(<NowPlayingCard formation={f} index={4} total={9} />);
    expect(screen.getByText(f.jp)).toBeInTheDocument();
    expect(screen.getByText(f.en)).toBeInTheDocument();
    expect(screen.getByText(f.desc)).toBeInTheDocument();
    // bear is 54s → 00:54
    expect(screen.getByText('00:54')).toBeInTheDocument();
  });
});
