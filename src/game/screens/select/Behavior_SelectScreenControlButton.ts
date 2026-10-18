import { g, sprite, member, cursor, label, Behavior } from '../../../runtime';

export class Behavior_SelectScreenControlButton extends Behavior {
  mouseEnter(): void {
    cursor(280);
    sprite(this.spriteNum).member = member('controls_over', 'select_screen');
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEOVER, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  mouseLeave(): void {
    sprite(this.spriteNum).member = member('button_controls_012', 'select_screen');
    cursor(-1);
  }

  mouseUp(): void {
    sprite(this.spriteNum).member = member('button_controls_012', 'select_screen');
    cursor(-1);
    switch (g.playerID) {
      case g.FIGHTER_ID_ROBIN:
        g.goFrame = label('SCREEN_CONTROLS_ROBIN');
        break;
      case g.FIGHTER_ID_RAVEN:
        g.goFrame = label('SCREEN_CONTROLS_RAVEN');
        break;
      case g.FIGHTER_ID_CYBORG:
        g.goFrame = label('SCREEN_CONTROLS_CYBORG');
        break;
      case g.FIGHTER_ID_STARFIRE:
        g.goFrame = label('SCREEN_CONTROLS_STARFIRE');
        break;
      case g.FIGHTER_ID_BEASTBOY:
        g.goFrame = label('SCREEN_CONTROLS_BEASTBOY');
        break;
      case g.FIGHTER_ID_JINX:
        g.goFrame = label('SCREEN_CONTROLS_JINX');
        break;
      case g.FIGHTER_ID_GIZMO:
        g.goFrame = label('SCREEN_CONTROLS_GIZMO');
        break;
      case g.FIGHTER_ID_MAMMOTH:
        g.goFrame = label('SCREEN_CONTROLS_MAMMOTH');
        break;
      case g.FIGHTER_ID_CINDERBLOCK:
        g.goFrame = label('SCREEN_CONTROLS_CINDERBLOCK');
        break;
      case g.FIGHTER_ID_PLASMUS:
        g.goFrame = label('SCREEN_CONTROLS_PLASMUS');
        break;
    }
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEDOWNFIGHT, 100, g.SFX_EVENT_PRIORITY_LOW);
  }
}
