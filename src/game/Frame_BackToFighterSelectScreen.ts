import { g, label, PASS, Behavior } from '../runtime';

export class Frame_BackToFighterSelectScreen extends Behavior {
  exitFrame(): unknown {
    switch (g.playerID) {
      case g.FIGHTER_ID_ROBIN:
        g.goFrame = label('SCREEN_SELECTFIGHTER_ROBIN');
        break;
      case g.FIGHTER_ID_RAVEN:
        g.goFrame = label('SCREEN_SELECTFIGHTER_RAVEN');
        break;
      case g.FIGHTER_ID_CYBORG:
        g.goFrame = label('SCREEN_SELECTFIGHTER_CYBORG');
        break;
      case g.FIGHTER_ID_STARFIRE:
        g.goFrame = label('SCREEN_SELECTFIGHTER_STARFIRE');
        break;
      case g.FIGHTER_ID_BEASTBOY:
        g.goFrame = label('SCREEN_SELECTFIGHTER_BEASTBOY');
        break;
      case g.FIGHTER_ID_JINX:
        g.goFrame = label('SCREEN_SELECTFIGHTER_JINX');
        break;
      case g.FIGHTER_ID_GIZMO:
        g.goFrame = label('SCREEN_SELECTFIGHTER_GIZMO');
        break;
      case g.FIGHTER_ID_MAMMOTH:
        g.goFrame = label('SCREEN_SELECTFIGHTER_MAMMOTH');
        break;
      case g.FIGHTER_ID_CINDERBLOCK:
        g.goFrame = label('SCREEN_SELECTFIGHTER_CINDERBLOCK');
        break;
      case g.FIGHTER_ID_PLASMUS:
        g.goFrame = label('SCREEN_SELECTFIGHTER_PLASMUS');
        break;
    }
    return PASS;
  }
}
