import { g, list, point, Point, Rect, objectp, idiv } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_SummonBeastboyEffect extends Class_Effect {
  STATE_WAIT: number;
  STATE_FLY: number;
  STATE_ATTACK: number;
  animState: number;
  initState: number;
  stateAge: number;
  delayFrames: number; // declared in the Lingo property list, never assigned
  bgEffect: any;
  shadow: any;
  trails: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.STATE_WAIT = 1;
    this.STATE_FLY = 2;
    this.STATE_ATTACK = 3;
    this.initState = 1;
    this.animState = 1;
    this.stateAge = 0;
    const S = g.assets.CHAR_SHARED;
    const vis = list(S.BEASTBOY_PTERODACTYL_01, S.BEASTBOY_PTERODACTYL_02, S.BEASTBOY_PTERODACTYL_03);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 2, 3, 2, 3, 2);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.visSprite.blend = 100;
    this.shadow = new g.classes.Class_Shadow(this, 100);
    this.trails = new g.classes.Class_ActorTrails(4, g.SPRITE_LOCZ_EFFECTS_BACKGROUND);
  }

  destroy(): undefined {
    super.destroy();
    if (objectp(this.shadow)) this.shadow.destroy();
    if (objectp(this.bgEffect)) this.bgEffect.destroy();
    if (objectp(this.trails)) this.trails.destroy();
    return undefined;
  }

  // Lingo `on advanceState` (handler without `me`, called locally): method here.
  advanceState(): void {
    this.initState = 1;
    this.animState = this.animState + 1;
    this.stateAge = 0;
  }

  update(): void {
    this.age = this.age + 1;
    this.stateAge = this.stateAge + 1;
    if (!this.alive) return;
    switch (this.animState) {
      case this.STATE_WAIT:
        if (this.initState) {
          this.initState = 0;
          this.bgEffect = new g.classes.Class_BgBarsTitanEffect(this.owner, point(0, 0), point(0, 0), this.dir);
          g.main.screen.addEffect(this.bgEffect);
          const targetRect: Rect = this.owner.opponent.getDefenseBox();
          let targetX: number;
          if (this.owner.dir > 0) targetX = targetRect.left + targetRect.width * 0.25;
          else targetX = targetRect.right - targetRect.width * 0.25;
          const targetY = targetRect.bottom - targetRect.height * 0.65;
          const targetPos = point(targetX, targetY).sub(point(20.0 * this.dir, -20.0));
          this.setPos(targetPos.sub(point(600.0 * this.dir, 0.0)));
        }
        if (this.stateAge === 10) this.advanceState();
        break;
      case this.STATE_FLY:
        if (this.initState) {
          this.initState = 0;
          this.setVel(30.0 * this.dir, -11.0);
        }
        this.accelerate(point(0.0, 1.0));
        this.trails.update(this);
        if (this.stateAge === 8) {
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_BEASTBOY_PTERODACTYL, 100, g.SFX_EVENT_PRIORITY_LOW);
        } else if (this.stateAge === 17) {
          this.animation.advance();
        } else if (this.stateAge === 20) {
          this.advanceState();
        }
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.setVel(0.0, 0.0);
        }
        this.trails.update(undefined);
        switch (this.stateAge) {
          case 1: {
            // Integer arithmetic in Lingo (HEALTH_MAX and SUMMON_DAMAGE_PERCENT are integers).
            const damage = this.owner.opponent.reactToCollision(idiv(this.owner.opponent.HEALTH_MAX * g.SUMMON_DAMAGE_PERCENT, 100));
            this.owner.awardPoints(damage);
            this.animation.advance();
            g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.pos.add(point(66.0 * this.dir, -93.0)), point(0, 0), this.dir));
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          }
          case 5:
            g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.pos.add(point(66.0 * this.dir, -93.0)), point(0, 0), this.dir));
            break;
          case 7:
            this.animation.advance();
            g.game.hud.flashScreen(2);
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          case 11:
            g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.pos.add(point(66.0 * this.dir, -93.0)), point(0, 0), this.dir));
            break;
          case 13:
            this.animation.advance();
            g.game.hud.flashScreen(2);
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          case 15:
            g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.pos.add(point(66.0 * this.dir, -93.0)), point(0, 0), this.dir));
            break;
          case 20:
            this.animation.advance();
            g.game.hud.flashScreen(2);
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          case 21:
            this.kill();
            break;
        }
        break;
    }
    // Still runs on the frame kill() was called (visSprite is then sprite(0), which ignores writes).
    this.setPos(this.pos.add(this.vel));
    this.visSprite.member = this.animation.getMember();
    if (objectp(this.shadow)) this.shadow.update();
  }

  paint(): void {
    super.paint();
    if (objectp(this.shadow)) this.shadow.paint();
    if (objectp(this.trails)) this.trails.paint();
  }
}
