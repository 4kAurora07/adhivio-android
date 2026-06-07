import { useCallback, useRef } from 'react';
import { BuiltInSound } from '@/types/reminder';

function createOscillatorSound(
  ctx: AudioContext,
  gainNode: GainNode,
  frequency: number,
  type: OscillatorType,
  duration: number,
  pattern: number[] = [1]
) {
  let time = ctx.currentTime;
  pattern.forEach((beat) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    osc.connect(gainNode);
    osc.start(time);
    osc.stop(time + beat * duration);
    time += beat * duration + 0.05;
  });
}

export function useSounds() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const playBuiltIn = useCallback(async (sound: BuiltInSound, volume: number = 0.7) => {
    try {
      const ctx = getContext();
      // Resume AudioContext — required after browser autoplay policy suspends it
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, volume));
      gain.connect(ctx.destination);

      switch (sound) {
        case 'alarm':
          createOscillatorSound(ctx, gain, 880, 'square', 0.15, [1, 1, 1, 1]);
          break;
        case 'beep':
          createOscillatorSound(ctx, gain, 1000, 'sine', 0.1, [1, 0.5, 1]);
          break;
        case 'soft-tone':
          createOscillatorSound(ctx, gain, 520, 'sine', 0.3, [1, 1]);
          break;
        case 'bell':
          createOscillatorSound(ctx, gain, 660, 'triangle', 0.4, [1]);
          break;
        case 'digital-alert':
          createOscillatorSound(ctx, gain, 1200, 'sawtooth', 0.08, [1, 1, 1, 0.5, 1, 1]);
          break;
      }
    } catch (e) {
      console.warn('Failed to play sound', e);
    }
  }, [getContext]);

  const playCustom = useCallback((base64Data: string, volume: number = 0.7) => {
    try {
      const audio = new Audio(base64Data);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.play().catch((e) => console.warn('Failed to play custom sound', e));
    } catch (e) {
      console.warn('Failed to play custom sound', e);
    }
  }, []);

  return { playBuiltIn, playCustom };
}
