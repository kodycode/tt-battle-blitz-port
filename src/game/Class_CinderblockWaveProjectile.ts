import { g, Point, list, point } from '../runtime';
import { Class_Projectile } from './Class_Projectile';

export class Class_CinderblockWaveProjectile extends Class_Projectile {
  needInit: number;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_CINDERBLOCK_STOMP;
    this.stunDuration = 10;
    this.needInit = 1;
    const vis = list(g.MEMBER_0);
    const att = list(g.assets.CINDERBLOCK.CINDERBLOCK_WAVE_PROJECTILE_01A);
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
        g.main.audioMgr.playSound(g.assets.CINDERBLOCK.SFX_CINDERBLOCK_GROUNDSTOMP, 100, g.SFX_EVENT_PRIORITY_LOW);
      }
      if ((this.age - 1) % 4 === 0) {
        g.main.screen.addEffect(new g.classes.Class_GroundWaveEffect(this, this.pos, point(0, 0), this.dir));
      }
      this.setPos(this.pos.add(this.vel));
      this.visSprite.member = this.animation.getMember();
      this.updateBoundingBoxes();
      if (this.isOutOfPlay()) this.kill();
    }
  }

  // Returns VOID (undefined) when already dead, as in Lingo (`exit`).
  triggerPayoff(): any {
    if (!this.alive) return undefined;
    this.kill();
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.CINDERBLOCK.SFX_CINDERBLOCK_SHOCKWAVEMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this, this.owner.opponent.getPos().add(point(0, -80)), point(0, 0), this.dir));
    g.main.audioMgr.playSound(g.assets.CINDERBLOCK.SFX_CINDERBLOCK_SHOCKWAVEHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
