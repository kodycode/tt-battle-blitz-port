import { g, Point, list, point } from '../runtime';
import { Class_Projectile } from './Class_Projectile';

export class Class_StarfireBoltProjectile extends Class_Projectile {
  initState: number;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = 0;
    this.stunDuration = 20;
    this.initState = 1;
    const vis = list(g.assets.CHAR_SHARED.FX_STARFIRE_BOLT_06);
    const att = list(g.assets.CHAR_SHARED.FX_STARFIRE_BOLT_06A);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.attackMasks = att;
    this.armed = 0;
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
      if (this.initState) this.initState = 0;
      this.setPos(this.pos.add(this.vel));
      this.visSprite.member = this.animation.getMember();
      this.updateBoundingBoxes();
      if (this.getPosY() >= 0.0) this.kill();
    }
  }

  // Unlike most projectiles, this does not kill itself on payoff.
  triggerPayoff(): number {
    if (!this.alive) return 0;
    g.main.screen.addEffect(new g.classes.Class_StarfireExplodeEffect(this.owner, this.pos, point(0, 0), this.dir));
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) return 0;
    return 1;
  }
}
