import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePersistedState } from './usePersistedState';

describe('usePersistedState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes from localStorage when present', () => {
    window.localStorage.setItem('k', JSON.stringify({ count: 7 }));
    const { result } = renderHook(() => usePersistedState('k', { count: 0 }));
    expect(result.current[0]).toEqual({ count: 7 });
  });

  it('falls back to initial when storage is empty', () => {
    const { result } = renderHook(() => usePersistedState('missing', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('persists writes back to localStorage', () => {
    const { result } = renderHook(() => usePersistedState('count', 0));
    act(() => result.current[1](42));
    expect(JSON.parse(window.localStorage.getItem('count') ?? 'null')).toBe(42);
  });

  it('supports functional updates', () => {
    const { result } = renderHook(() => usePersistedState('n', 1));
    act(() => result.current[1]((p) => p + 10));
    expect(result.current[0]).toBe(11);
  });

  it('rejects values that fail validate and falls back to initial', () => {
    window.localStorage.setItem('typed', JSON.stringify({ wrong: true }));
    const isCount = (v: unknown): v is { count: number } =>
      typeof v === 'object' && v !== null && typeof (v as { count?: unknown }).count === 'number';
    const { result } = renderHook(() => usePersistedState('typed', { count: 0 }, isCount));
    expect(result.current[0]).toEqual({ count: 0 });
  });

  it('survives a corrupt JSON payload by returning the initial value', () => {
    window.localStorage.setItem('bad', '{not-json');
    const { result } = renderHook(() => usePersistedState('bad', 'safe'));
    expect(result.current[0]).toBe('safe');
  });

  it('keeps in-memory state when localStorage.setItem throws (quota / private mode)', () => {
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    const { result } = renderHook(() => usePersistedState('q', 'a'));
    act(() => result.current[1]('b'));
    expect(result.current[0]).toBe('b');
    spy.mockRestore();
  });
});
