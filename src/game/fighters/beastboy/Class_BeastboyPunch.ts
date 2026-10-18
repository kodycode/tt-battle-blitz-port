import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_BeastboyPunch extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_BEASTBOY_PUNCH;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    // No setMelee call in the Lingo: the punch is not flagged melee.
    const A = g.assets.BEASTBOY;
    const vis = list(A.BEASTBOY_PUNCH_01, A.BEASTBOY_PUNCH_02, A.BEASTBOY_PUNCH_03);
    const att = list(g.MEMBER_0, A.BEASTBOY_PUNCH_02A, g.MEMBER_0);
    const def = list(A.BEASTBOY_PUNCH_01D, A.BEASTBOY_PUNCH_02D, A.BEASTBOY_PUNCH_03D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 1, 2, 2, 2, 2, 2, 3, 3, 3);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
  }

  reset(_arg?: any): void {
    super.reset();
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  update(): void {
    super.update();
    if (this.age === 1) g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_WOOSH, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_HitStarBurstEffect(this.owner, this.owner.pos.add(point(77.0 * this.owner.dir, -98.0)), point(0, 0), this.owner.dir));
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_PUNCH_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
