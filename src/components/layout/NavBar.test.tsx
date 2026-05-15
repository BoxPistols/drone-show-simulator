import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NavBar } from './NavBar';

function withRouter(initialPath: string, ui: React.ReactNode) {
  return render(<MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>);
}

describe('<NavBar>', () => {
  it('renders the four primary nav links', () => {
    withRouter('/', <NavBar />);
    expect(screen.getByRole('link', { name: /観賞 Show/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /機体 Fleet/ })).toHaveAttribute('href', '/fleet');
    expect(screen.getByRole('link', { name: /振付 Choreo/ })).toHaveAttribute(
      'href',
      '/choreography'
    );
    expect(screen.getByRole('link', { name: /運航 Schedule/ })).toHaveAttribute(
      'href',
      '/schedule'
    );
  });

  it('marks the matching route as active', () => {
    withRouter('/fleet', <NavBar />);
    const fleet = screen.getByRole('link', { name: /機体 Fleet/ });
    expect(fleet).toHaveClass('active');
    const show = screen.getByRole('link', { name: /観賞 Show/ });
    expect(show).not.toHaveClass('active');
  });

  it('renders the live pill only when showLivePill is true', () => {
    const { rerender } = withRouter('/', <NavBar showLivePill />);
    expect(screen.getByRole('status', { name: /ライブ配信中/ })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );
    expect(screen.queryByRole('status', { name: /ライブ配信中/ })).not.toBeInTheDocument();
  });

  it('exposes a primary navigation landmark', () => {
    withRouter('/', <NavBar />);
    expect(screen.getByRole('navigation', { name: /プライマリ/ })).toBeInTheDocument();
  });
});
