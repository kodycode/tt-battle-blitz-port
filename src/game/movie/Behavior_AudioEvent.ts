import { g, voidp, Behavior, Member } from '../../runtime';

export class Behavior_AudioEvent extends Behavior {
  // getPropertyDescriptionList parameters (set by the score player).
  soundName: string;
  assetGroup: string;
  volumeLevel: number;
  stopAtEndSprite: number;
  soundMem: Member | undefined;

  beginSprite(): void {
    if (!voidp(g.main)) {
      const assetObj = g.assets.getaProp(this.assetGroup);
      if (!voidp(assetObj)) {
        this.soundMem = assetObj.getaProp(this.soundName);
        if (!voidp(this.soundMem)) {
          g.main.audioMgr.playSound(this.soundMem, this.volumeLevel, g.SFX_EVENT_PRIORITY_LOW);
        }
      }
    }
  }

  endSprite(): void {
    if (!voidp(g)) {
      if (!voidp(g.main)) {
        if (this.stopAtEndSprite) {
          if (!voidp(this.soundMem)) {
            g.main.audioMgr.stopSound(this.soundMem);
          }
        }
      }
    }
  }
}
