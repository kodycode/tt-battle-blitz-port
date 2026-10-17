import { g, list, point, idiv, objectp, Point } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_SummonCyborgEffect extends Class_Effect {
  STATE_WAIT: number;
  STATE_FLY: number;
  STATE_ATTACK: number;
  animState: number;
  initState: number;
  stateAge: number;
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
    const vis = list(S.CYBORG_JUMP_PUNCH_01, S.CYBORG_JUMP_PUNCH_02);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.visSprite.blend = 100;
    this.shadow = new g.classes.Class_Shadow(this, 130);
    this.trails = new g.classes.Class_ActorTrails(4, g.SPRITE_LOCZ_EFFECTS_BACKGROUND);
  }

  destroy(): undefined {
    super.destroy();
    if (objectp(this.shadow)) this.shadow.destroy();
    if (objectp(this.bgEffect)) this.bgEffect.destroy();
    if (objectp(this.trails)) this.trails.destroy();
    return undefined;
  }

  // Lingo `on advanceState` (handler without `me`, called locally): a method here.
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
          const targetRect = this.owner.opponent.getDefenseBox();
          let targetX: number;
          if (this.owner.dir > 0) targetX = targetRect.left + targetRect.width * 0.25;
          else targetX = targetRect.right - targetRect.width * 0.25;
          const targetY = targetRect.bottom - targetRect.height * 0.65;
          const targetPos = point(targetX, targetY).add(point(-80.0 * this.dir, 50.0));
          this.setPos(targetPos.sub(point(600.0 * 0.6849 * this.dir, 600.0)));
        }
        if (this.stateAge === 10) this.advanceState();
        break;
      case this.STATE_FLY:
        if (this.initState) {
          this.initState = 0;
          g.main.screen.addEffect(new g.classes.Class_CyborgDiagLinesEffect(this.owner, point(this.getPosX() - this.owner.dir * this.getPosY() * 0.6849, 0.0), point(0, 0), this.owner.dir));
          this.setVel(this.owner.dir * 30.0 * 0.6849, 30.0);
        }
        this.trails.update(this);
        if (this.stateAge === 20) this.advanceState();
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.setVel(0.0, 0.0);
        }
        this.trails.update(undefined);
        switch (this.stateAge) {
          case 1: {
            // Integer arithmetic in Lingo (HEALTH_MAX and SUMMON_DAMAGE_PERCENT are integers).
            const damage = this.owner.opponent.reactToCollision(idiv(this.owner.opponent.HEALTH_MAX * g.SUMMON_DAMAGE_PERCENT, 100));
            this.owner.awardPoints(damage);
            g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.pos.add(point(100.0 * this.dir, -40.0)), point(0, 0), this.dir));
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          }
          case 5:
            g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.pos.add(point(100.0 * this.dir, -40.0)), point(0, 0), this.dir));
            break;
          case 7:
            g.game.hud.flashScreen(2);
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          case 11:
            g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.pos.add(point(100.0 * this.dir, -40.0)), point(0, 0), this.dir));
            break;
          case 13:
            g.game.hud.flashScreen(2);
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          case 15:
            g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.pos.add(point(100.0 * this.dir, -40.0)), point(0, 0), this.dir));
            break;
          case 20:
            g.game.hud.flashScreen(2);
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          case 21:
            this.kill();
            break;
        }
        break;
    }
    // Runs after kill() too (the sprite is then sprite(0), so the member write is ignored).
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
