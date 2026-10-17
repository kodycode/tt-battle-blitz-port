import { g, Point, list, point } from '../runtime';
import { Class_Projectile } from './Class_Projectile';

export class Class_RobinDiscProjectile extends Class_Projectile {
  needInit: number;
  shadow: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_ROBIN_DISC_THROW;
    this.stunDuration = 10;
    this.needInit = 1;
    const A = g.assets.ROBIN;
    const vis = list(A.ROBIN_DISC_01, A.ROBIN_DISC_02, A.ROBIN_DISC_03, A.ROBIN_DISC_04);
    const att = list(A.ROBIN_DISC_04A, A.ROBIN_DISC_04A, A.ROBIN_DISC_04A, A.ROBIN_DISC_04A);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.shadow = new g.classes.Class_Shadow(this, 50);
  }

  destroy(): undefined {
    super.destroy();
    this.shadow.destroy();
    return undefined;
  }

  update(): void {
    this.age = this.age + 1;
    if (!this.alive) return;
    if (this.needInit) {
      this.needInit = 0;
      this.setVel(25.0 * this.dir, 0.0);
      g.main.audioMgr.playSound(g.assets.ROBIN.SFX_ROBIN_DISK_FLYING, 100, g.SFX_EVENT_PRIORITY_LOW);
    }
    this.setPos(this.pos.add(this.vel));
    if (this.isOutOfPlay()) this.kill();
    if (this.age > 1) this.animation.advance();
    this.visSprite.member = this.animation.getMember();
    this.updateBoundingBoxes();
    this.shadow.update();
  }

  paint(): void {
    super.paint();
    this.shadow.paint();
  }

  triggerPayoff(): number {
    if (!this.alive) return 0;
    this.kill();
    g.main.audioMgr.stopSound(g.assets.ROBIN.SFX_ROBIN_DISK_FLYING);
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.ROBIN.SFX_ROBIN_DISK_BLOCKED, 50, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    } else {
      g.main.screen.addEffect(new g.classes.Class_RobinDiscExplodeEffect(this.owner, this.pos, point(0, 0), this.dir));
      g.main.audioMgr.playSound(g.assets.ROBIN.SFX_ROBIN_DISK_EXPLODE, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 1;
    }
  }
}
