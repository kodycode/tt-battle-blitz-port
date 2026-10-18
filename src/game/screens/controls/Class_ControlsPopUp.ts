import { g, member, point, voidp, Member } from '../../../runtime';

// In-game pause pop-up showing the player's move list, with "menu" and "fight" buttons.
export class Class_ControlsPopUp {
  bgMem: Member;
  fgMem: Member;
  texMem: Member;
  bgOverlay: any;
  fgOverlay: any;
  texOverlay: any;
  menuButtonOverlay: any;
  fightButtonOverlay: any;
  visible: number;

  constructor() {
    switch (g.playerID) {
      case g.FIGHTER_ID_ROBIN:
        this.bgMem = member('controls_robin_bg', 'controls_screen');
        this.fgMem = member('controls_robin_overlay', 'controls_screen');
        break;
      case g.FIGHTER_ID_RAVEN:
        this.bgMem = member('controls_raven_bg', 'controls_screen');
        this.fgMem = member('controls_raven_overlay', 'controls_screen');
        break;
      case g.FIGHTER_ID_CYBORG:
        this.bgMem = member('controls_cyborg_bg', 'controls_screen');
        this.fgMem = member('controls_cyborg_overlay', 'controls_screen');
        break;
      case g.FIGHTER_ID_STARFIRE:
        this.bgMem = member('controls_starfire_bg', 'controls_screen');
        this.fgMem = member('controls_starfire_overlay', 'controls_screen');
        break;
      case g.FIGHTER_ID_BEASTBOY:
        this.bgMem = member('controls_beastboy_bg', 'controls_screen');
        this.fgMem = member('controls_beastboy_overlay', 'controls_screen');
        break;
      case g.FIGHTER_ID_JINX:
        this.bgMem = member('controls_villains_bg', 'controls_screen');
        this.fgMem = member('controls_jinx_overlay', 'controls_screen');
        break;
      case g.FIGHTER_ID_GIZMO:
        this.bgMem = member('controls_villains_bg', 'controls_screen');
        this.fgMem = member('controls_gizmo_overlay', 'controls_screen');
        break;
      case g.FIGHTER_ID_MAMMOTH:
        this.bgMem = member('controls_villains_bg', 'controls_screen');
        this.fgMem = member('controls_mammoth_overlay', 'controls_screen');
        break;
      case g.FIGHTER_ID_CINDERBLOCK:
        this.bgMem = member('controls_villains_bg', 'controls_screen');
        this.fgMem = member('controls_cinderblock_overlay', 'controls_screen');
        break;
      case g.FIGHTER_ID_PLASMUS:
        this.bgMem = member('controls_villains_bg', 'controls_screen');
        this.fgMem = member('controls_plasmus_overlay', 'controls_screen');
        break;
    }
    this.texMem = member('controls_texture', 'controls_screen');
    // bgMem.preload(), fgMem.preload(), texMem.preload():
    // TODO(runtime): member.preload() is not provided (all members are loaded up front, so it would be a no-op).
    this.visible = 0;
  }

  destroy(): undefined {
    if (!voidp(this.bgOverlay)) {
      this.bgOverlay.destroy();
    }
    if (!voidp(this.fgOverlay)) {
      this.fgOverlay.destroy();
    }
    if (!voidp(this.texOverlay)) {
      // ORIGINAL BUG: assigns the result to bgOverlay instead of texOverlay.
      this.bgOverlay = this.texOverlay.destroy();
    }
    if (!voidp(this.menuButtonOverlay)) {
      this.menuButtonOverlay.getSprite().scriptInstanceList = [];
      this.menuButtonOverlay.destroy();
    }
    if (!voidp(this.fightButtonOverlay)) {
      this.fightButtonOverlay.getSprite().scriptInstanceList = [];
      this.fightButtonOverlay.destroy();
    }
    return undefined;
  }

  isVisible(): number {
    return this.visible;
  }

  setVisible(b: number): void {
    this.visible = b;
    if (this.visible) {
      if (voidp(this.bgOverlay)) {
        this.bgOverlay = new g.classes.Class_StaticOverlay(this.bgMem, point(300, 200), g.SPRITE_LOCZ_POPUP_CONTROLS_BG);
        this.bgOverlay.setInk(g.INK_COPY);
        this.fgOverlay = new g.classes.Class_StaticOverlay(this.fgMem, point(300, 200), g.SPRITE_LOCZ_POPUP_CONTROLS_OVERLAY);
        this.fgOverlay.setInk(g.INK_BGTRANSPARENT);
        this.texOverlay = new g.classes.Class_StaticOverlay(this.texMem, point(300, 200), g.SPRITE_LOCZ_POPUP_CONTROLS_TEXTURE);
        this.texOverlay.setInk(g.INK_BGTRANSPARENT);
        this.texOverlay.getSprite().blend = 10;
        this.menuButtonOverlay = new g.classes.Class_StaticOverlay(member('back_008', 'select_screen'), point(301, 12), g.SPRITE_LOCZ_POPUP_CONTROLS_BUTTONS);
        // new(script("Behavior_ControlPopupMenuButton")); the Lingo does not set the instance's spriteNum.
        this.menuButtonOverlay.getSprite().scriptInstanceList.push(new g.classes.Behavior_ControlPopupMenuButton());
        this.fightButtonOverlay = new g.classes.Class_StaticOverlay(member('button_fight_000', 'select_screen'), point(301, 49), g.SPRITE_LOCZ_POPUP_CONTROLS_BUTTONS);
        this.fightButtonOverlay.getSprite().scriptInstanceList.push(new g.classes.Behavior_ControlPopupFightButton());
      }
    } else {
      if (!voidp(this.bgOverlay)) {
        this.bgOverlay = this.bgOverlay.destroy();
      }
      if (!voidp(this.fgOverlay)) {
        // ORIGINAL BUG: assigns the result to bgOverlay, so fgOverlay keeps pointing at the destroyed overlay.
        this.bgOverlay = this.fgOverlay.destroy();
      }
      if (!voidp(this.texOverlay)) {
        // ORIGINAL BUG: same as above for texOverlay.
        this.bgOverlay = this.texOverlay.destroy();
      }
      if (!voidp(this.menuButtonOverlay)) {
        this.menuButtonOverlay.getSprite().scriptInstanceList = [];
        this.menuButtonOverlay = this.menuButtonOverlay.destroy();
      }
      if (!voidp(this.fightButtonOverlay)) {
        this.fightButtonOverlay.getSprite().scriptInstanceList = [];
        this.fightButtonOverlay = this.fightButtonOverlay.destroy();
      }
    }
  }
}
