import { go, Behavior } from '../../runtime';

// cartoon_network_enhancements cast: "BehaviorScript 14 - Launch Orbit Script".
export class CN_LaunchOrbitScript extends Behavior {
  beginSprite(): void {
    // if gOrbitURL <> VOID then gotoNetPage(gOrbitURL, "Orbit"):
    // no external pages in the port (gOrbitURL is always VOID, see CN_BillboardScript), so nothing happens.
  }

  exitFrame(): void {
    go('Win animation');
  }
}
