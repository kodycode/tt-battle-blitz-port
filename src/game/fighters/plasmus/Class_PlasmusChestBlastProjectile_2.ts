import { g, Point, list, point } from '../../../runtime';
import { Class_Projectile } from '../../actors/Class_Projectile';

export class Class_PlasmusChestBlastProjectile_2 extends Class_Projectile {
  needInit: number;
  shadow: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_PLASMUS_SLUDGE_THROW;
    this.stunDuration = 10;
    this.needInit = 1;
    const vis = list(g.assets.PLASMUS.PLASMUS_GLOBULE_02);
    const att = list(g.assets.PLASMUS.PLASMUS_GLOBULE_02A);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
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
    if (this.alive) {
      if (this.needInit) this.needInit = 0;
      this.accelerate(g.gravity.mul(0.25));
      this.setPos(this.pos.add(this.vel));
      if (this.getPosY() >= 0.0) {
        this.setPosY(0.0);
        this.setVel(0.0, 0.0);
        g.main.screen.addProjectile(new g.classes.Class_PlasmusSludgeSplatProjectile(this.owner, this.pos, point(0, 0), this.dir));
        g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_GLOBULEMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
        this.kill();
      }
      this.visSprite.member = this.animation.getMember();
      this.updateBoundingBoxes();
      this.shadow.update();
    }
  }

  paint(): void {
    super.paint();
    this.shadow.paint();
  }

  triggerPayoff(): number {
    if (!this.alive) return 0;
    this.kill();
    g.main.screen.addEffect(new g.classes.Class_PlasmusSplatEffect(this.owner, this.owner.opponent.pos.add(point(0.0, -100.0)), point(0, 0), this.dir));
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_GLOBULEMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.game.hud.flashScreen(1);
    g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_GLOBULEHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
