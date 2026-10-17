import { sprite, member, point, go, theFrame, theTicks, marker, stageRect, idiv, Member, Behavior } from '../runtime';
// TODO(runtime): `(the stage).bgColor` is not re-exported from '../runtime'; use the director module directly.
import { setStage, stageWidth, stageHeight, stageBgColor } from '../runtime/director';
import { invalidateStage } from '../runtime/sprite';

// cartoon_network_enhancements cast: "BehaviorScript 13 - Billboard Script".
// The Cartoon Network web wrapper passed an ad billboard / "Orbit" page / tracker through the Shockwave
// <embed> params sw1..sw7. The port has no network and no external pages: externalParamValue() returns VOID,
// as in the standalone projector, so the script runs its "no ad configured" path and moves on to the next
// marker after a few frames. The download/display/link branches are kept for structure but never run.

// Lingo globals shared by the cartoon_network_enhancements scripts.
let gBillboardNetID: number;
let gBillboardState: string | undefined;
let gBillboardDelay: number;
let gBillboardMember: Member | undefined;
let gBGColor: string;
let gBillboardURL: string | undefined;
let gBillboardDuration: number | undefined;
let gBillboardLink: string | undefined;
let gOrbitURL: string | undefined;
let gTrackerURL: string | undefined;

// externalParamValue(name): no embed params outside the CN web wrapper.
function externalParamValue(_name: string): string | undefined {
  return undefined;
}

// value(VOID) is VOID.
function value(s: string | undefined): number | undefined {
  return s === undefined ? undefined : Number(s);
}

// netDone(-1): no operation is pending.
function netDone(_id: number): number {
  return 1;
}

// netError(-1): no download took place, so it never reports "OK".
function netError(_id: number): string {
  return '';
}

export class CN_BillboardScript extends Behavior {
  beginSprite(): void {
    gBillboardState = 'Download';
    sprite(1).puppet = true;
    const aStageWidth = stageRect().right - stageRect().left;
    const aStageHeight = stageRect().bottom - stageRect().top;
    sprite(1).loc = point(idiv(aStageWidth, 2), idiv(aStageHeight, 2));
    gBGColor = stageBgColor;
    setStage(stageWidth, stageHeight, '#000000');
    invalidateStage(); // (the stage).bgColor = c repaints the whole stage (see sprite.ts invalidateStage)
  }

  exitFrame(): void {
    switch (gBillboardState) {
      case 'Download':
      case undefined:
        gBillboardURL = externalParamValue('sw1');
        gBillboardDuration = value(externalParamValue('sw2'));
        gBillboardLink = externalParamValue('sw4');
        gOrbitURL = externalParamValue('sw6');
        gTrackerURL = externalParamValue('sw7');
        gBillboardMember = undefined;
        gBillboardDelay = theTicks() + 15 * 60;
        if (gBillboardDuration === undefined) {
          gBillboardDuration = 7;
        }
        gBillboardNetID = -1;
        if (gBillboardURL !== undefined) {
          // gBillboardNetID = preloadNetThing(gBillboardURL): ad download removed (never reached, URL is VOID).
        }
        gBillboardState = 'Downloading';
        break;
      case 'Downloading':
        if (netDone(gBillboardNetID) !== 0 || gBillboardDelay < theTicks()) {
          gBillboardState = 'Downloaded';
        }
        break;
      case 'Downloaded':
        if (netError(gBillboardNetID) === 'OK') {
          // Ad bitmap import removed (never reached): new(#bitmap), importFileInto(gBillboardURL),
          // sprite(1).member = gBillboardMember, gBillboardDelay = the ticks + gBillboardDuration * 60.
        } else {
          gBillboardDelay = 0;
        }
        gBillboardState = 'Display Billboard';
        break;
      case 'Display Billboard':
        if (gBillboardDelay < theTicks()) {
          if (gBillboardMember !== undefined) {
            gBillboardMember.erase();
          }
          gBillboardDelay = theTicks() + (gBillboardDuration as number) * 60;
          if (gOrbitURL !== undefined) {
            gBillboardState = 'Display Orbit';
            sprite(1).member = member('Orbit Screen');
          } else {
            gBillboardState = undefined;
          }
        }
        break;
      case 'Display Orbit':
        if (gBillboardDelay < theTicks()) {
          gBillboardState = undefined;
        }
        break;
      default:
        gBillboardState = 'Download';
        break;
    }
    if (gBillboardState !== undefined) {
      go(theFrame());
    } else {
      setStage(stageWidth, stageHeight, gBGColor);
      invalidateStage();
      sprite(1).loc = point(-1000, -1000);
      sprite(1).puppet = false;
      // go(#next): the next marker.
      go(marker(1));
    }
  }

  mouseDown(): void {
    switch (gBillboardState) {
      case 'Display Billboard':
        gBillboardDelay = 0;
        if (gBillboardLink !== undefined) {
          // gotoNetPage(gBillboardLink, "_blank"): external page removed (never reached, link is VOID).
        }
        break;
      case 'Display Orbit':
        gBillboardDelay = 0;
        break;
    }
  }
}
