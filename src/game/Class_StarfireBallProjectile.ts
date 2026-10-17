import { g, Point, list, point } from '../runtime';
import { Class_Projectile } from './Class_Projectile';

export class Class_StarfireBallProjectile extends Class_Projectile {
  initState: number;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_STARFIRE_ENERGY_BALL;
    this.stunDuration = 20;
    this.initState = 1;
    const vis = list(g.assets.STARFIRE.FX_STARFIRE_BALL_01);
    const att = list(g.assets.STARFIRE.FX_STARFIRE_BALL_01A);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.attackMasks = att;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  // Never called. In the Lingo, animState/stateAge here are undeclared locals (VOID + 1 would be a script error).
  advanceState(): void {
    this.initState = 1;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.alive) {
      if (this.initState) {
        this.initState = 0;
        g.main.audioMgr.playSound(g.assets.STARFIRE.SFX_STARFIRE_STARBOLT_THROW, 100, g.SFX_EVENT_PRIORITY_LOW);
      }
      if (this.age > 1) this.animation.advance();
      this.setPos(this.pos.add(this.vel));
      this.visSprite.member = this.animation.getMember();
      this.updateBoundingBoxes();
      if (this.isOutOfPlay()) this.kill();
    }
  }

  triggerPayoff(): number {
    if (!this.alive) return 0;
    this.kill();
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.STARFIRE.SFX_STARFIRE_STARBOLT_MISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_StarfireExplodeEffect(this.owner, this.pos, point(0, 0), this.dir));
    g.main.audioMgr.playSound(g.assets.STARFIRE.SFX_STARFIRE_STARBOLT_HIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
