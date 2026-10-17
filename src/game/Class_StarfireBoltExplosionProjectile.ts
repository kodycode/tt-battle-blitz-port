import { g, Point, list, point } from '../runtime';
import { Class_Projectile } from './Class_Projectile';

export class Class_StarfireBoltExplosionProjectile extends Class_Projectile {
  initState: number;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_STARFIRE_BOLT_BARRAGE;
    this.stunDuration = 20;
    this.initState = 1;
    const vis = list(g.MEMBER_0);
    const att = list(g.assets.STARFIRE.FX_STARFIRE_BOLT_EXPLODE_01A);
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

  // Spawned at y = 0, so the `getPosY() >= 0.0` check kills it on its first update (as in the Lingo).
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

  triggerPayoff(): number {
    if (!this.alive) return 0;
    g.main.screen.addEffect(new g.classes.Class_StarfireExplodeEffect(this.owner, this.pos, point(0, 0), this.dir));
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) return 0;
    return 1;
  }
}
