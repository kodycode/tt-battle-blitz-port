// Emulation of Class_Main.update's busy-wait:
//   repeat while 1
//     audioMgr.update(); keyMgr.update()
//     if (the milliSeconds - g.frameTimestamp) >= g.FRAME_DURATION_MIN then exit repeat
//   end repeat
// On real hardware that loop spins thousands of times per frame. Effects that matter for gameplay:
//  - every key transition is polled at its own time (combo timing uses keydown timestamps), and
//  - audio fades complete within the frame they start in.
// We replay this frame's key transitions in time order, polling after each one, then spin the audio
// update enough times to finish any fade (fades in this game last at most integer(0.75 * 30) = 22 steps).
import { applyKeyTransition, KeyTransition } from './input';
import { setClock, theMilliseconds } from './director';

let frameTransitions: KeyTransition[] = [];
let frameClock = 0;

// Called by the main loop before each frame with that frame's key transitions and end-of-frame clock.
export function setFrameInput(transitions: KeyTransition[], clockAtFrameEnd: number): void {
  frameTransitions = transitions;
  frameClock = clockAtFrameEnd;
}

const AUDIO_SPINS = 64;

export function runBusyWait(audioUpdate: () => void, keyUpdate: () => void): void {
  const transitions = frameTransitions;
  frameTransitions = [];
  for (const e of transitions) {
    setClock(e.t);
    applyKeyTransition(e);
    audioUpdate();
    keyUpdate();
  }
  setClock(frameClock);
  for (let i = 0; i < AUDIO_SPINS; i++) audioUpdate();
  keyUpdate();
  // Leave the clock at the frame time for the rest of the frame.
  void theMilliseconds;
}
