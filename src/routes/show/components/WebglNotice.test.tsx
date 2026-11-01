import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { detectBrowser } from '../browser';
import { WebglNotice } from './WebglNotice';

const UA = {
  chrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  firefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
  safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
};

describe('detectBrowser', () => {
  it.each(Object.entries(UA))('detects %s', (kind, ua) => {
    expect(detectBrowser(ua)).toBe(kind);
  });
  it('falls back to other', () => {
    expect(detectBrowser('curl/8.0')).toBe('other');
  });
});

describe('<WebglNotice>', () => {
  it('shows Chrome-specific steps and the safety explanation', () => {
    render(<WebglNotice userAgent={UA.chrome} />);
    expect(screen.getByRole('heading', { name: '3D 表示を利用できません' })).toBeInTheDocument();
    expect(screen.getByText('chrome://settings/system')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '有効にしても安全ですか' })).toBeInTheDocument();
  });

  it('shows Edge steps for Edge, not Chrome ones', () => {
    render(<WebglNotice userAgent={UA.edge} />);
    expect(screen.getByText('edge://settings/system')).toBeInTheDocument();
    expect(screen.queryByText('chrome://settings/system')).not.toBeInTheDocument();
  });

  it('can be closed', () => {
    render(<WebglNotice userAgent={UA.chrome} />);
    expect(screen.getByRole('dialog', { name: '3D 表示を利用できません' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
