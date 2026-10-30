import { Capacitor, registerPlugin } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { loadSettings } from './storage';

/**
 * sale / undo: a Sell tile tap; step: a small change (stepper, switch, product saved);
 * remove: something deleted; success: a day, event, edit or backup done; warn: refused or failed.
 */
export type Feedback = 'sale' | 'undo' | 'step' | 'remove' | 'success' | 'warn';

const isNative = Capacitor.isNativePlatform();

// The vibrator's own click effects (android/.../TapFeedbackPlugin.java); the Haptics plugin's plain vibration is the
// fallback when there is no vibrator or the call fails.
const TapFeedback = registerPlugin<{ perform(options: { kind: string }): Promise<{ done: boolean }> }>('TapFeedback');
const TAP_KIND: Record<Feedback, string> = { sale: 'tap', step: 'tap', undo: 'strong', remove: 'strong', success: 'confirm', warn: 'reject' };

function vibrate(kind: Feedback) {
  return kind === 'success' || kind === 'warn'
    ? Haptics.notification({ type: kind === 'success' ? NotificationType.Success : NotificationType.Warning })
    : Haptics.impact({ style: kind === 'undo' || kind === 'remove' ? ImpactStyle.Medium : ImpactStyle.Light });
}

// Sine notes as [Hz, start s]: short, but loud enough to hear from a phone speaker at a busy booth. Kinds without notes are touch only.
const NOTES: Partial<Record<Feedback, [number, number][]>> = {
  sale: [[1046, 0]],
  undo: [[523, 0]],
  success: [[784, 0], [1175, 0.09]],
};

let audio: AudioContext | null = null;

function play(notes: [number, number][]) {
  try {
    audio ??= new AudioContext();
    void audio.resume(); // Android suspends it until a tap; every caller is a tap
    for (const [hz, at] of notes) {
      const start = audio.currentTime + at;
      const tone = new OscillatorNode(audio, { frequency: hz });
      const gain = new GainNode(audio);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      tone.connect(gain).connect(audio.destination);
      tone.start(start);
      tone.stop(start + 0.17);
    }
  } catch {
    // No Web Audio: stay silent.
  }
}

/** A short vibration (phone only) and, if Sound effects is on, a soft tone. */
export function feedback(kind: Feedback) {
  if (isNative) {
    TapFeedback.perform({ kind: TAP_KIND[kind] })
      .then(({ done }) => (done ? undefined : vibrate(kind)), () => vibrate(kind))
      .catch(() => {});
  }
  const notes = NOTES[kind];
  if (notes && loadSettings().sound) play(notes);
}
