import { go, Behavior } from '../../runtime';

// cartoon_network_enhancements cast: "BehaviorScript 16 - Play-Game".
export class CN_PlayGame extends Behavior {
  mouseUp(): void {
    // if gTrackerURL <> VOID: ping the tracker (preloadNetThing), show "(Tracker message sent.)" in member
    // "Info" and busy-wait 60 ticks. No network in the port (gTrackerURL is always VOID, see
    // CN_BillboardScript), so this is skipped and the script just navigates.
    go('Game');
  }
}
