import { g, LList, Member, point, rect, member, voidp, integer, idiv, string } from '../runtime';

export class Class_HUD {
  HUD_PORTRAITS: LList<Member>;
  HUD_SUMMON_PORTRAITS: LList<Member>;
  HUD_SUMMON_PORTRAITS_GREY: LList<Member>;
  HUD_NAMES: LList<Member>;
  WIN_LEFT_MEMBER_ON: any;
  WIN_LEFT_MEMBER_OFF: any;
  WIN_RIGHT_MEMBER_ON: any;
  WIN_RIGHT_MEMBER_OFF: any;
  hudBG: any;
  titanHealthBar: any;
  villainHealthBar: any;
  titanPortrait: any;
  villainPortrait: any;
  titanName: any;
  villainName: any;
  clock: any;
  titanWin1: any;
  titanWin2: any;
  villainWin1: any;
  villainWin2: any;
  flashOverlay: any;
  flashDuration: number;
  summonPortraits: LList<any>;
  fpsIndicator: any;
  score: any;

  // Class_GameScreen passes itself (new(g.classes.Class_HUD, me)); the Lingo `on new me` ignores it.
  constructor(_game?: any) {
    g.assets.hud.precache();
    this.HUD_PORTRAITS = new LList();
    this.HUD_PORTRAITS.set(g.FIGHTER_ID_ROBIN, g.assets.hud.HUD_PORTRAIT_ROBIN);
    this.HUD_PORTRAITS.set(g.FIGHTER_ID_RAVEN, g.assets.hud.HUD_PORTRAIT_RAVEN);
    this.HUD_PORTRAITS.set(g.FIGHTER_ID_CYBORG, g.assets.hud.HUD_PORTRAIT_CYBORG);
    this.HUD_PORTRAITS.set(g.FIGHTER_ID_STARFIRE, g.assets.hud.HUD_PORTRAIT_STARFIRE);
    this.HUD_PORTRAITS.set(g.FIGHTER_ID_BEASTBOY, g.assets.hud.HUD_PORTRAIT_BEASTBOY);
    this.HUD_PORTRAITS.set(g.FIGHTER_ID_JINX, g.assets.hud.HUD_PORTRAIT_JINX);
    this.HUD_PORTRAITS.set(g.FIGHTER_ID_MAMMOTH, g.assets.hud.HUD_PORTRAIT_MAMMOTH);
    this.HUD_PORTRAITS.set(g.FIGHTER_ID_GIZMO, g.assets.hud.HUD_PORTRAIT_GIZMO);
    this.HUD_PORTRAITS.set(g.FIGHTER_ID_CINDERBLOCK, g.assets.hud.HUD_PORTRAIT_CINDERBLOCK);
    this.HUD_PORTRAITS.set(g.FIGHTER_ID_PLASMUS, g.assets.hud.HUD_PORTRAIT_PLASMUS);
    this.HUD_SUMMON_PORTRAITS = new LList();
    this.HUD_SUMMON_PORTRAITS.set(g.FIGHTER_ID_ROBIN, g.assets.hud.HUD_SUMMON_PORTRAIT_ROBIN);
    this.HUD_SUMMON_PORTRAITS.set(g.FIGHTER_ID_RAVEN, g.assets.hud.HUD_SUMMON_PORTRAIT_RAVEN);
    this.HUD_SUMMON_PORTRAITS.set(g.FIGHTER_ID_CYBORG, g.assets.hud.HUD_SUMMON_PORTRAIT_CYBORG);
    this.HUD_SUMMON_PORTRAITS.set(g.FIGHTER_ID_STARFIRE, g.assets.hud.HUD_SUMMON_PORTRAIT_STARFIRE);
    this.HUD_SUMMON_PORTRAITS.set(g.FIGHTER_ID_BEASTBOY, g.assets.hud.HUD_SUMMON_PORTRAIT_BEASTBOY);
    // As in the Lingo, the "grey" table holds the colour portraits (unused here; Class_HUDSummonPortrait has its own).
    this.HUD_SUMMON_PORTRAITS_GREY = new LList();
    this.HUD_SUMMON_PORTRAITS_GREY.set(g.FIGHTER_ID_ROBIN, g.assets.hud.HUD_SUMMON_PORTRAIT_ROBIN);
    this.HUD_SUMMON_PORTRAITS_GREY.set(g.FIGHTER_ID_RAVEN, g.assets.hud.HUD_SUMMON_PORTRAIT_RAVEN);
    this.HUD_SUMMON_PORTRAITS_GREY.set(g.FIGHTER_ID_CYBORG, g.assets.hud.HUD_SUMMON_PORTRAIT_CYBORG);
    this.HUD_SUMMON_PORTRAITS_GREY.set(g.FIGHTER_ID_STARFIRE, g.assets.hud.HUD_SUMMON_PORTRAIT_STARFIRE);
    this.HUD_SUMMON_PORTRAITS_GREY.set(g.FIGHTER_ID_BEASTBOY, g.assets.hud.HUD_SUMMON_PORTRAIT_BEASTBOY);
    this.HUD_NAMES = new LList();
    this.HUD_NAMES.set(g.FIGHTER_ID_ROBIN, g.assets.hud.HUD_NAME_ROBIN);
    this.HUD_NAMES.set(g.FIGHTER_ID_RAVEN, g.assets.hud.HUD_NAME_RAVEN);
    this.HUD_NAMES.set(g.FIGHTER_ID_CYBORG, g.assets.hud.HUD_NAME_CYBORG);
    this.HUD_NAMES.set(g.FIGHTER_ID_STARFIRE, g.assets.hud.HUD_NAME_STARFIRE);
    this.HUD_NAMES.set(g.FIGHTER_ID_BEASTBOY, g.assets.hud.HUD_NAME_BEASTBOY);
    this.HUD_NAMES.set(g.FIGHTER_ID_JINX, g.assets.hud.HUD_NAME_JINX);
    this.HUD_NAMES.set(g.FIGHTER_ID_MAMMOTH, g.assets.hud.HUD_NAME_MAMMOTH);
    this.HUD_NAMES.set(g.FIGHTER_ID_GIZMO, g.assets.hud.HUD_NAME_GIZMO);
    this.HUD_NAMES.set(g.FIGHTER_ID_CINDERBLOCK, g.assets.hud.HUD_NAME_CINDERBLOCK);
    this.HUD_NAMES.set(g.FIGHTER_ID_PLASMUS, g.assets.hud.HUD_NAME_PLASMUS);
    this.hudBG = new g.classes.Class_StaticOverlay(g.assets.hud.HUD_BG, point(0, 0), g.SPRITE_LOCZ_HUD_BG);
    this.titanHealthBar = new g.classes.Class_HUDHealthBar(g.game.titan, point(278, 21), 1);
    this.villainHealthBar = new g.classes.Class_HUDHealthBar(g.game.villain, point(322, 21), 0);
    this.titanPortrait = new g.classes.Class_StaticOverlay(this.HUD_PORTRAITS.get(g.titanID), point(0, 3), g.SPRITE_LOCZ_HUD_FG);
    this.titanPortrait.setInk(g.INK_MATTE);
    this.villainPortrait = new g.classes.Class_StaticOverlay(this.HUD_PORTRAITS.get(g.villainID), point(600, 3), g.SPRITE_LOCZ_HUD_FG);
    this.villainPortrait.setInk(g.INK_MATTE);
    this.villainPortrait.setFlipX(1);
    // Integer division: member widths are integers.
    this.titanName = new g.classes.Class_StaticOverlay(this.HUD_NAMES.get(g.titanID), point(10 + idiv(this.HUD_NAMES.get(g.titanID).width, 2), 55), g.SPRITE_LOCZ_HUD_FG);
    this.titanName.getSprite().ink = g.INK_MATTE;
    this.villainName = new g.classes.Class_StaticOverlay(this.HUD_NAMES.get(g.villainID), point(590 - idiv(this.HUD_NAMES.get(g.villainID).width, 2), 55), g.SPRITE_LOCZ_HUD_FG);
    this.villainName.getSprite().ink = g.INK_MATTE;
    this.clock = new g.classes.Class_HUDClock(point(300, 42));
    this.titanWin1 = new g.classes.Class_StaticOverlay(g.assets.hud.HUD_WIN_LEFT_OFF, point(269, 54), g.SPRITE_LOCZ_HUD_BG);
    this.titanWin2 = new g.classes.Class_StaticOverlay(g.assets.hud.HUD_WIN_LEFT_OFF, point(223, 54), g.SPRITE_LOCZ_HUD_BG);
    this.villainWin1 = new g.classes.Class_StaticOverlay(g.assets.hud.HUD_WIN_RIGHT_OFF, point(331, 54), g.SPRITE_LOCZ_HUD_BG);
    this.villainWin2 = new g.classes.Class_StaticOverlay(g.assets.hud.HUD_WIN_RIGHT_OFF, point(377, 54), g.SPRITE_LOCZ_HUD_BG);
    this.summonPortraits = g.util.newArray(g.FIGHTER_COUNT, undefined);
    let x = 0;
    for (let i = 1; i <= g.TITAN_FIGHTER_ORDER.count; i++) {
      // Lingo passes the order index i as the fighter ID; TITAN_FIGHTER_ORDER is 1..5, so they coincide.
      if (g.game.canSummon(g.game.titan, i)) {
        this.summonPortraits.set(g.TITAN_FIGHTER_ORDER.get(i), new g.classes.Class_HUDSummonPortrait(g.TITAN_FIGHTER_ORDER.get(i), point(90 + x, 10)));
        x = x + 34;
      }
    }
    this.flashOverlay = new g.classes.Class_StaticOverlay(g.assets.hud.HUD_SCREEN_FLASH, point(300, 200), g.SPRITE_LOCZ_SCREEN_FLASH);
    this.flashOverlay.visSprite.rect = rect(0, 0, 600, 400);
    this.flashOverlay.visSprite.ink = g.INK_COPY;
    this.flashOverlay.setVisible(0);
    this.flashDuration = 0;
    this.fpsIndicator = new g.classes.Class_StaticOverlay(member('FPS'), point(5, 380), 200);
    this.fpsIndicator.setVisible(0);
    this.score = new g.classes.Class_HUDScore(point(328, 9));
  }

  destroy(): undefined {
    // ORIGINAL BUG: flashOverlay is never destroyed (its pool sprite is only reclaimed by spriteMgr.destroy).
    this.score.destroy();
    this.fpsIndicator.destroy();
    this.titanWin1.destroy();
    this.titanWin2.destroy();
    this.villainWin1.destroy();
    this.villainWin2.destroy();
    this.clock.destroy();
    this.villainName.destroy();
    this.titanName.destroy();
    for (const o of this.summonPortraits) {
      if (!voidp(o)) o.destroy();
    }
    this.villainPortrait.destroy();
    this.titanPortrait.destroy();
    this.villainHealthBar.destroy();
    this.titanHealthBar.destroy();
    this.hudBG.destroy();
    return undefined;
  }

  reset(): void {
    this.titanHealthBar.reset();
    this.villainHealthBar.reset();
  }

  update(): void {
    if (this.fpsIndicator.isVisible()) {
      this.fpsIndicator.getSprite().member.text = string(integer(g.fps)) + ' ' + 'fps';
    }
    this.clock.update();
    this.titanHealthBar.update();
    this.villainHealthBar.update();
    if (this.flashOverlay.isVisible()) {
      if (this.flashDuration === 0) this.flashOverlay.setVisible(0);
      else this.flashDuration = this.flashDuration - 1;
    }
    for (const o of this.summonPortraits) {
      if (!voidp(o)) o.update();
    }
    this.score.update();
  }

  paint(): void {
    this.clock.paint();
    this.titanHealthBar.paint();
    this.villainHealthBar.paint();
    this.score.paint();
  }

  setTitanWins(i: number): void {
    if (i === 2) {
      this.titanWin1.setMember(g.assets.hud.HUD_WIN_LEFT_ON);
      this.titanWin2.setMember(g.assets.hud.HUD_WIN_LEFT_ON);
    } else if (i === 1) {
      this.titanWin1.setMember(g.assets.hud.HUD_WIN_LEFT_ON);
      this.titanWin2.setMember(g.assets.hud.HUD_WIN_LEFT_OFF);
    } else {
      this.titanWin1.setMember(g.assets.hud.HUD_WIN_LEFT_OFF);
      this.titanWin2.setMember(g.assets.hud.HUD_WIN_LEFT_OFF);
    }
  }

  setVillainWins(i: number): void {
    if (i === 2) {
      this.villainWin1.setMember(g.assets.hud.HUD_WIN_RIGHT_ON);
      this.villainWin2.setMember(g.assets.hud.HUD_WIN_RIGHT_ON);
    } else if (i === 1) {
      this.villainWin1.setMember(g.assets.hud.HUD_WIN_RIGHT_ON);
      this.villainWin2.setMember(g.assets.hud.HUD_WIN_RIGHT_OFF);
    } else {
      this.villainWin1.setMember(g.assets.hud.HUD_WIN_RIGHT_OFF);
      this.villainWin2.setMember(g.assets.hud.HUD_WIN_RIGHT_OFF);
    }
  }

  showFPS(b: any): void {
    this.fpsIndicator.setVisible(b);
  }

  isFPS(): boolean {
    return this.fpsIndicator.isVisible();
  }

  flashScreen(dur: number): void {
    this.flashDuration = dur;
    this.flashOverlay.setVisible(1);
  }

  useSummonPortrait(id: number): void {
    if (!voidp(this.summonPortraits.get(id))) this.summonPortraits.get(id).trigger();
  }

  resetSummonPortraits(): void {
    for (const o of this.summonPortraits) {
      if (!voidp(o)) o.reset();
    }
  }
}
