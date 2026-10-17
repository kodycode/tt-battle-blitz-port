import { g, Point, LList, Member } from '../runtime';

export class Class_HUDSummonPortrait {
  time: any; // declared in the Lingo property list, never used
  HUD_SUMMON_PORTRAITS: LList<Member>;
  HUD_SUMMON_PORTRAITS_GREY: LList<Member>;
  STATE_AVAILABLE: number;
  STATE_FLASHING: number;
  STATE_EXPIRED: number;
  overlay: any;
  state: number;
  initState: number;
  stateAge: number;
  fighterID: number;

  constructor(id: number, initPos: Point) {
    this.HUD_SUMMON_PORTRAITS = new LList();
    this.HUD_SUMMON_PORTRAITS.set(g.FIGHTER_ID_ROBIN, g.assets.hud.HUD_SUMMON_PORTRAIT_ROBIN);
    this.HUD_SUMMON_PORTRAITS.set(g.FIGHTER_ID_RAVEN, g.assets.hud.HUD_SUMMON_PORTRAIT_RAVEN);
    this.HUD_SUMMON_PORTRAITS.set(g.FIGHTER_ID_CYBORG, g.assets.hud.HUD_SUMMON_PORTRAIT_CYBORG);
    this.HUD_SUMMON_PORTRAITS.set(g.FIGHTER_ID_STARFIRE, g.assets.hud.HUD_SUMMON_PORTRAIT_STARFIRE);
    this.HUD_SUMMON_PORTRAITS.set(g.FIGHTER_ID_BEASTBOY, g.assets.hud.HUD_SUMMON_PORTRAIT_BEASTBOY);
    this.HUD_SUMMON_PORTRAITS_GREY = new LList();
    this.HUD_SUMMON_PORTRAITS_GREY.set(g.FIGHTER_ID_ROBIN, g.assets.hud.HUD_SUMMON_PORTRAIT_ROBIN_GREY);
    this.HUD_SUMMON_PORTRAITS_GREY.set(g.FIGHTER_ID_RAVEN, g.assets.hud.HUD_SUMMON_PORTRAIT_RAVEN_GREY);
    this.HUD_SUMMON_PORTRAITS_GREY.set(g.FIGHTER_ID_CYBORG, g.assets.hud.HUD_SUMMON_PORTRAIT_CYBORG_GREY);
    this.HUD_SUMMON_PORTRAITS_GREY.set(g.FIGHTER_ID_STARFIRE, g.assets.hud.HUD_SUMMON_PORTRAIT_STARFIRE_GREY);
    this.HUD_SUMMON_PORTRAITS_GREY.set(g.FIGHTER_ID_BEASTBOY, g.assets.hud.HUD_SUMMON_PORTRAIT_BEASTBOY_GREY);
    this.STATE_AVAILABLE = 1;
    this.STATE_FLASHING = 2;
    this.STATE_EXPIRED = 3;
    this.fighterID = id;
    this.state = this.STATE_AVAILABLE;
    this.stateAge = 0;
    this.initState = 1;
    this.overlay = new g.classes.Class_Overlay(initPos, g.SPRITE_LOCZ_HUD_FG);
  }

  destroy(): undefined {
    this.overlay.destroy();
    return undefined;
  }

  reset(): void {
    this.setState(this.STATE_AVAILABLE);
  }

  setState(i: number): void {
    this.state = i;
    this.initState = 1;
    this.stateAge = 0;
  }

  update(): void {
    this.stateAge = this.stateAge + 1;
    switch (this.state) {
      case this.STATE_AVAILABLE:
        if (this.initState) {
          this.initState = 0;
          this.overlay.setMember(this.HUD_SUMMON_PORTRAITS.get(this.fighterID));
        }
        break;
      case this.STATE_FLASHING:
        if (this.initState) {
          this.initState = 0;
        }
        if (this.stateAge % 6 === 1) {
          this.overlay.setMember(g.assets.hud.HUD_SUMMON_PORTRAIT_FLASH);
        } else if (this.stateAge % 6 === 4) {
          this.overlay.setMember(this.HUD_SUMMON_PORTRAITS.get(this.fighterID));
        }
        if (this.stateAge >= 60) this.setState(this.STATE_EXPIRED);
        break;
      case this.STATE_EXPIRED:
        if (this.initState) {
          this.initState = 0;
          this.overlay.setMember(this.HUD_SUMMON_PORTRAITS_GREY.get(this.fighterID));
        }
        break;
    }
  }

  paint(): void {}

  trigger(): void {
    this.setState(this.STATE_FLASHING);
  }
}
