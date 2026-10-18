// Sound and voice cues for guided workouts, all on-device (no network).
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

const SOUNDS = {
  tick: require('../../assets/sounds/tick.wav'),
  go: require('../../assets/sounds/go.wav'),
  done: require('../../assets/sounds/done.wav'),
};
type Cue = keyof typeof SOUNDS;

let players: Partial<Record<Cue, AudioPlayer>> = {};
let ready = false;

/** Call when a workout starts: plays even on silent mode and lowers (not stops) the user's music. */
export async function prepareCoach() {
  if (!ready) {
    ready = true;
    try {
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
    } catch {
      // Sounds still work with the default session.
    }
  }
  for (const cue of Object.keys(SOUNDS) as Cue[]) players[cue] ??= createAudioPlayer(SOUNDS[cue]);
}

export function beep(cue: Cue) {
  const player = players[cue];
  if (!player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // A missed beep is harmless.
  }
}

export function say(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'en-IN', rate: 1.0 });
}

/** Stops speech and frees the sound players when leaving the workout. */
export function releaseCoach() {
  Speech.stop();
  for (const player of Object.values(players)) player?.remove();
  players = {};
}
