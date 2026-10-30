import { useCallback, useEffect, useRef } from 'react';
import { useLatestRef } from '~/hooks/useLatestRef';
import type { Ambient } from '../audio/ambient';

interface Options {
  enabled: boolean;
  volume: number;
  playing: boolean;
  formationIndex: number;
}

type AudioContextCtor = new () => AudioContext;

/**
 * アンビエント音楽の制御。
 * - AudioContext は利用者の操作（クリック / キー）の中で同期的に作る。ブラウザの自動再生制限のため
 * - 生成コード（ambient.ts）は初めて ON にしたときだけ動的に読み込む（使わない人には 0 バイト）
 * - 再生 / 一時停止に追従してフェードし、タブが隠れたら止める
 * - 設定が ON のまま再読込したときは、最初の操作で鳴り始める
 *
 * `start()` は操作ハンドラから直接呼ぶこと（effect からでは Safari が鳴らさない）。
 */
export function useAmbientMusic(opts: Options): { start: () => void } {
  const ctxRef = useRef<AudioContext | null>(null);
  const ambientRef = useRef<Ambient | null>(null);
  const optsRef = useLatestRef(opts);
  const loadingRef = useRef(false);

  const applyAll = useCallback(() => {
    const a = ambientRef.current;
    if (!a) return;
    const o = optsRef.current;
    a.setVolume(o.volume);
    a.setFormation(o.formationIndex);
    a.setPlaying(o.enabled && o.playing && !document.hidden);
  }, [optsRef]);

  const start = useCallback(() => {
    if (ambientRef.current || loadingRef.current) {
      void ctxRef.current?.resume();
      applyAll();
      return;
    }
    if (!ctxRef.current) {
      const Ctor =
        (window.AudioContext as AudioContextCtor | undefined) ??
        (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
      if (!Ctor) return;
      ctxRef.current = new Ctor();
    }
    const ctx = ctxRef.current;
    void ctx.resume();
    loadingRef.current = true;
    void import('../audio/ambient').then((m) => {
      loadingRef.current = false;
      if (ctxRef.current !== ctx) return; // アンマウント済み
      ambientRef.current = m.createAmbient(ctx, optsRef.current.formationIndex);
      applyAll();
    });
  }, [applyAll, optsRef]);

  // 設定が変わったら反映
  useEffect(() => {
    applyAll();
    const ctx = ctxRef.current;
    if (!ctx || !ambientRef.current) return;
    if (opts.enabled && opts.playing) void ctx.resume();
    else {
      // フェードが終わってから止める（音声スレッドも休ませる）
      const id = window.setTimeout(() => {
        const o = optsRef.current;
        if (!(o.enabled && o.playing)) void ctxRef.current?.suspend();
      }, 1500);
      return () => window.clearTimeout(id);
    }
  }, [opts.enabled, opts.playing, opts.volume, opts.formationIndex, applyAll, optsRef]);

  // ON のまま再読込したとき: 最初の操作で鳴らす
  useEffect(() => {
    if (!opts.enabled || ambientRef.current) return;
    const once = () => start();
    window.addEventListener('pointerdown', once, { once: true });
    window.addEventListener('keydown', once, { once: true });
    return () => {
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('keydown', once);
    };
  }, [opts.enabled, start]);

  // タブの表示 / 非表示
  useEffect(() => {
    const onVis = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else if (optsRef.current.enabled && optsRef.current.playing) void ctx.resume();
      applyAll();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [applyAll, optsRef]);

  // 片付け
  useEffect(
    () => () => {
      ambientRef.current?.dispose();
      ambientRef.current = null;
      const ctx = ctxRef.current;
      ctxRef.current = null;
      void ctx?.close();
    },
    []
  );

  return { start };
}
