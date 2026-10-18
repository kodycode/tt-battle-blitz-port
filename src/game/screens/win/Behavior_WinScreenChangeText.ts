import { g, sprite, member, b2i, LList, Member, Behavior } from '../../../runtime';

export class Behavior_WinScreenChangeText extends Behavior {
  beginSprite(): void {
    const txtMems = new LList<Member>();
    txtMems.set(g.FIGHTER_ID_ROBIN, member('tt_ending_txt_robin', 'win_screen'));
    txtMems.set(g.FIGHTER_ID_RAVEN, member('tt_ending_txt_raven', 'win_screen'));
    txtMems.set(g.FIGHTER_ID_CYBORG, member('tt_ending_txt_cyborg', 'win_screen'));
    txtMems.set(g.FIGHTER_ID_STARFIRE, member('tt_ending_txt_starfire', 'win_screen'));
    txtMems.set(g.FIGHTER_ID_BEASTBOY, member('tt_ending_txt_beastboy', 'win_screen'));
    txtMems.set(g.FIGHTER_ID_JINX, member('tt_ending_txt_villain', 'win_screen'));
    txtMems.set(g.FIGHTER_ID_GIZMO, member('tt_ending_txt_villain', 'win_screen'));
    txtMems.set(g.FIGHTER_ID_MAMMOTH, member('tt_ending_txt_villain', 'win_screen'));
    txtMems.set(g.FIGHTER_ID_CINDERBLOCK, member('tt_ending_txt_villain', 'win_screen'));
    txtMems.set(g.FIGHTER_ID_PLASMUS, member('tt_ending_txt_villain', 'win_screen'));
    let defeatedAll = 1;
    for (const i of g.VILLAIN_FIGHTER_ORDER) {
      for (const j of g.TITAN_FIGHTER_ORDER) {
        defeatedAll = b2i(defeatedAll && g.defeatedEnemies.get(j).get(i));
      }
    }
    if (defeatedAll && g.playMode === g.PLAYMODE_AS_TITANS) {
      sprite(this.spriteNum).member = member('tt_ending_txt_ALL', 'win_screen');
    } else {
      sprite(this.spriteNum).member = txtMems.get(g.playerID);
    }
  }

  endSprite(): void {}
}
