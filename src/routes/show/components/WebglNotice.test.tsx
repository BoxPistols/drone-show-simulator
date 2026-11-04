import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { detectBrowser, detectPlatform, diagnoseWebglFailure, type WebglFailure } from '../browser';
import { WebglNotice } from './WebglNotice';

const UA = {
  chrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  firefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
  safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  opera:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/115.0.0.0',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
};
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

const FAILED: WebglFailure = { kind: 'creation-failed', detail: '' };

describe('detectBrowser', () => {
  it.each(Object.entries(UA))('detects %s', (kind, ua) => {
    expect(detectBrowser(ua)).toBe(kind);
  });
  it('falls back to other', () => {
    expect(detectBrowser('curl/8.0')).toBe('other');
  });
});

describe('detectPlatform', () => {
  it('treats every iOS browser as ios', () => {
    expect(detectPlatform(IPHONE_CHROME)).toBe('ios');
  });
  it('treats iPadOS desktop-mode Safari as ios via touch points', () => {
    expect(detectPlatform(UA.safari, 5)).toBe('ios');
    expect(detectPlatform(UA.safari, 0)).toBe('desktop');
  });
  it('detects android', () => {
    expect(detectPlatform(ANDROID_CHROME)).toBe('android');
  });
});

describe('diagnoseWebglFailure', () => {
  it('reports a missing API first', () => {
    expect(diagnoseWebglFailure(false, '').kind).toBe('api-missing');
  });
  it('recognises Chrome blocking the page after a GPU crash', () => {
    expect(diagnoseWebglFailure(true, 'Web page caused context loss and was blocked').kind).toBe(
      'blocked'
    );
  });
  it('recognises WebGL turned off by policy or switch', () => {
    expect(
      diagnoseWebglFailure(true, 'disabled by enterprise policy or commandline switch').kind
    ).toBe('disabled');
  });
  it('treats anything else as a creation failure and keeps the message', () => {
    expect(diagnoseWebglFailure(true, ' Could not create a WebGL context ')).toEqual({
      kind: 'creation-failed',
      detail: 'Could not create a WebGL context',
    });
  });
});

describe('<WebglNotice>', () => {
  it('shows cause, Chrome steps and the safety explanation', () => {
    render(<WebglNotice failure={FAILED} userAgent={UA.chrome} maxTouchPoints={0} />);
    expect(screen.getByRole('dialog', { name: '3D 表示を利用できません' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '原因' })).toBeInTheDocument();
    expect(screen.getByText('chrome://settings/system')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '有効にしても安全です' })).toBeInTheDocument();
  });

  it('shows Edge steps for Edge, not Chrome ones', () => {
    render(<WebglNotice failure={FAILED} userAgent={UA.edge} maxTouchPoints={0} />);
    expect(screen.getByText('edge://settings/system')).toBeInTheDocument();
    expect(screen.queryByText('chrome://settings/system')).not.toBeInTheDocument();
  });

  it('shows the about:config fallback for Firefox', () => {
    render(<WebglNotice failure={FAILED} userAgent={UA.firefox} maxTouchPoints={0} />);
    expect(screen.getByText('webgl.disabled')).toBeInTheDocument();
  });

  it('explains Lockdown Mode on iPhone even in Chrome', () => {
    render(
      <WebglNotice
        failure={{ kind: 'api-missing', detail: '' }}
        userAgent={IPHONE_CHROME}
        maxTouchPoints={5}
      />
    );
    expect(screen.getByText(/多くはロックダウンモードが原因/)).toBeInTheDocument();
    expect(screen.getByText(/端末全体はオンのまま/)).toBeInTheDocument();
    expect(screen.queryByText('chrome://settings/system')).not.toBeInTheDocument();
    // iOS の Chrome にはアプリ単位の除外を案内し、Safari の「ぁあ」手順は出さない
    expect(screen.getByText(/Web ブラウズを設定」で Chrome を除外/)).toBeInTheDocument();
    expect(screen.queryByText(/アドレスバー左の「ぁあ」/)).not.toBeInTheDocument();
  });

  it('gives Safari on iPhone the per-site exclusion', () => {
    render(
      <WebglNotice
        failure={{ kind: 'api-missing', detail: '' }}
        userAgent={UA.safari}
        maxTouchPoints={5}
      />
    );
    expect(screen.getByText(/アドレスバー左の「ぁあ」/)).toBeInTheDocument();
  });

  it('keeps keys pressed inside the dialog from reaching page shortcuts', () => {
    const seen: string[] = [];
    const onKey = (e: KeyboardEvent) => seen.push(e.key);
    window.addEventListener('keydown', onKey);
    render(<WebglNotice failure={FAILED} userAgent={UA.chrome} maxTouchPoints={0} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' });
    window.removeEventListener('keydown', onKey);
    expect(seen).toEqual([]);
  });

  it('does not suggest a desktop toggle on Android', () => {
    render(<WebglNotice failure={FAILED} userAgent={ANDROID_CHROME} maxTouchPoints={5} />);
    expect(screen.getByText(/Google Play でブラウザを/)).toBeInTheDocument();
    expect(screen.queryByText('chrome://settings/system')).not.toBeInTheDocument();
  });

  it('includes the browser message in the technical details', () => {
    render(
      <WebglNotice
        failure={{ kind: 'blocked', detail: 'Web page caused context loss and was blocked' }}
        userAgent={UA.chrome}
        maxTouchPoints={0}
      />
    );
    expect(screen.getByText(/blocked \/ desktop \/ chrome \/ Web page caused/)).toBeInTheDocument();
  });

  it('can be closed', () => {
    render(<WebglNotice failure={FAILED} userAgent={UA.chrome} maxTouchPoints={0} />);
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
