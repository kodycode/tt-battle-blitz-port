import { g, list, point, Point } from '../runtime';
import { Class_Projectile } from './Class_Projectile';

export class Class_JinxBallProjectile extends Class_Projectile {
  initState: number;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_JINX_ENERGY_BALL;
    this.stunDuration = 20;
    this.initState = 1;
    this.visSprite.blend = 85;
    const A = g.assets.JINX;
    const vis = list(A.FX_JINX_ENERGYBALL_12, A.FX_JINX_ENERGYBALL_13);
    const att = list(A.FX_JINX_ENERGYBALL_12A, A.FX_JINX_ENERGYBALL_12A);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.attackMasks = att;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  // Never called. ORIGINAL BUG: animState and stateAge are not properties of this script, so they are
  // locals here (animState is read before it is assigned).
  advanceState(): void {
    this.initState = 1;
    let animState: any = undefined;
    animState = animState + 1;
    const stateAge = 0;
    void animState;
    void stateAge;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.alive) {
      if (this.initState) this.initState = 0;
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
      g.main.audioMgr.playSound(g.assets.JINX.SFX_JINX_ENERGY_BALL_MISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    } else {
      g.main.screen.addEffect(new g.classes.Class_JinxBallExplodeEffect(this.owner, this.pos, point(0, 0), this.dir));
      g.main.audioMgr.playSound(g.assets.JINX.SFX_JINX_ENERGY_BALL_HIT, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 1;
    }
  }
}
