import { g, list, point, Point } from '../../../runtime';
import { Class_Projectile } from '../../actors/Class_Projectile';

export class Class_BeastboyWaveProjectile extends Class_Projectile {
  needInit: number;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_BEASTBOY_GORILLA_SMASH;
    this.stunDuration = 10;
    this.needInit = 1;
    const vis = list(g.MEMBER_0);
    const att = list(g.assets.BEASTBOY.BEASTBOY_WAVE_PROJECTILE_01A);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.attackMasks = att;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.alive) {
      if (this.needInit) {
        this.needInit = 0;
        this.setVel(20.0 * this.dir, 0.0);
      }
      if ((this.age - 1) % 12 === 0) {
        // empty in the original
      }
      if ((this.age - 1) % 4 === 0) {
        g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, this.pos.add(point(20.0 * this.owner.dir, 15.0)), point(0.0 * this.owner.dir, 0.0), -this.owner.dir));
      }
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
      g.main.audioMgr.playSound(g.assets.MAMMOTH.SFX_MAMMOTH_SHOCKWAVEPUNCHMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    // The hit effect's owner is the projectile itself (`me`), as in the Lingo.
    g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this, this.owner.opponent.getPos().add(point(0, -80)), point(0, 0), this.dir));
    g.main.audioMgr.playSound(g.assets.MAMMOTH.SFX_MAMMOTH_SHOCKWAVEPUNCHHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
