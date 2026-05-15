import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioMeta {
  name: string;
  duration: number;
  samples: number[];
  buffer: AudioBuffer;
}

interface AudioContextCtor {
  new (): AudioContext;
}

const WAVEFORM_SAMPLES = 200;

function downsamplePeaks(channel: Float32Array, n: number): number[] {
  const step = Math.max(1, Math.floor(channel.length / n));
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let peak = 0;
    const start = i * step;
    const end = Math.min(start + step, channel.length);
    for (let j = start; j < end; j++) {
      const v = Math.abs(channel[j]!);
      if (v > peak) peak = v;
    }
    out[i] = peak;
  }
  return out;
}

/**
 * Web Audio API loader + scrubable playback for an uploaded audio file.
 * The hook owns the AudioContext and the active BufferSource; callers control
 * play/stop/seek via the returned API. State changes are caller-driven so the
 * loop in ChoreographyPage stays the master clock.
 */
export function useAudio(): {
  audio: AudioMeta | null;
  load: (file: File) => Promise<AudioMeta | null>;
  clear: () => void;
  startAt: (offset: number) => void;
  stop: () => void;
} {
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [audio, setAudio] = useState<AudioMeta | null>(null);

  const stop = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        /* already stopped */
      }
      try {
        sourceRef.current.disconnect();
      } catch {
        /* already disconnected */
      }
      sourceRef.current = null;
    }
  }, []);

  const load = useCallback(async (file: File): Promise<AudioMeta | null> => {
    if (!ctxRef.current) {
      const Ctor =
        (window.AudioContext as AudioContextCtor | undefined) ??
        (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    const arrayBuf = await file.arrayBuffer();
    const buffer = await ctxRef.current.decodeAudioData(arrayBuf);
    const channel = buffer.getChannelData(0);
    const samples = downsamplePeaks(channel, WAVEFORM_SAMPLES);
    const meta: AudioMeta = { name: file.name, duration: buffer.duration, samples, buffer };
    setAudio(meta);
    return meta;
  }, []);

  const startAt = useCallback(
    (offset: number) => {
      if (!audio || !ctxRef.current) return;
      stop();
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      if (offset >= audio.buffer.duration) return;
      const source = ctx.createBufferSource();
      source.buffer = audio.buffer;
      source.connect(ctx.destination);
      source.start(0, Math.max(0, offset));
      sourceRef.current = source;
    },
    [audio, stop]
  );

  const clear = useCallback(() => {
    stop();
    setAudio(null);
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { audio, load, clear, startAt, stop };
}
