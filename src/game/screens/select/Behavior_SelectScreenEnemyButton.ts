import { g, sprite, cursor, Behavior } from '../../../runtime';

export class Behavior_SelectScreenEnemyButton extends Behavior {
  pName: any;
  pFighter: string;
  fighterID: number;
  tagSprite: any;

  beginSprite(): void {
    const whichName = sprite(this.spriteNum).member.name;
    // offset() is 1-based (0 when absent); chars(s, a, b) is EMPTY when b < a.
    const startchar = whichName.indexOf('_') + 1 + 1;
    const endchar = whichName.indexOf('.') + 1 - 1;
    this.pFighter = endchar >= startchar ? whichName.slice(startchar - 1, endchar) : '';
    this.fighterID = g.main.screen.fighterNames.getOne(this.pFighter);
    sprite(this.fighterID + 50).visible = false;
  }

  mouseEnter(): void {
    if (g.availableEnemies.get(this.fighterID) && g.unlockedEnemies.get(g.playerID).get(this.fighterID) && g.enemyID !== this.fighterID) {
      sprite(this.fighterID + 50).visible = true;
      cursor(280);
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEOVERCHARACTERS, 75, g.SFX_EVENT_PRIORITY_LOW);
    }
  }

  mouseLeave(): void {
    sprite(this.fighterID + 50).visible = false;
    cursor(-1);
  }

  mouseDown(): void {
    if (g.availableEnemies.get(this.fighterID) && g.unlockedEnemies.get(g.playerID).get(this.fighterID) && g.enemyID !== this.fighterID) {
      g.main.screen.setOpponent(this.fighterID);
      cursor(-1);
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEDOWNCHARACTERSWITCH, 100, g.SFX_EVENT_PRIORITY_LOW);
      sprite(this.fighterID + 50).visible = false;
    } else {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MISCLICK, 60, g.SFX_EVENT_PRIORITY_LOW);
    }
  }
}
