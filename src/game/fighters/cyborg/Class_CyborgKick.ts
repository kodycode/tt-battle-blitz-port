import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_CyborgKick extends Class_Move {
  visAnim: any;
  visAltAnim: any;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_CYBORG_KICK;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(1);
    const A = g.assets.CYBORG;
    const vis = list(A.CYBORG_KNEE_01, A.CYBORG_KNEE_02, A.CYBORG_CROUCH_01);
    const visAlt = list(A.CYBORG_KNEE_ALT_01, A.CYBORG_KNEE_ALT_02, A.CYBORG_CROUCH_ALT_01);
    const att = list(g.MEMBER_0, A.CYBORG_KNEE_02A, g.MEMBER_0);
    const def = list(A.CYBORG_KNEE_01D, A.CYBORG_KNEE_02D, A.CYBORG_CROUCH_01D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3);
    this.visAnim = new g.classes.Class_IndexedAnimation(vis, order);
    this.visAltAnim = new g.classes.Class_IndexedAnimation(visAlt, order);
    this.animation = this.visAnim;
    this.attackMasks = att;
    this.defenseMasks = def;
  }

  reset(arg?: any): void {
    super.reset();
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
    this.dirChanged();
  }

  dirChanged(): void {
    if (this.owner.dir > 0) this.animation = this.visAnim;
    else this.animation = this.visAltAnim;
    this.animation.reset();
  }

  update(): void {
    super.update();
    if (this.age === 6) g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_WOOSH, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    } else {
      g.main.screen.addEffect(new g.classes.Class_HitHorizBurstEffect(this.owner, this.owner.pos.add(point(84.0 * this.owner.dir, -114.0)), point(0, 0), this.owner.dir));
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 1;
    }
  }
}
