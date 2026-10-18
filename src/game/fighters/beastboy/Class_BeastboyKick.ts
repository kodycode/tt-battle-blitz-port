import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_BeastboyKick extends Class_Move {
  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_BEASTBOY_KICK;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(1);
    const A = g.assets.BEASTBOY;
    const vis = list(A.BEASTBOY_KICK_01, A.BEASTBOY_KICK_02, A.BEASTBOY_KICK_03);
    const att = list(g.MEMBER_0, g.MEMBER_0, A.BEASTBOY_KICK_03A);
    const def = list(A.BEASTBOY_KICK_01D, A.BEASTBOY_KICK_02D, A.BEASTBOY_KICK_03D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 1, 1);
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
    if (this.age === 1) g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_WOOSH, 100, g.SFX_EVENT_PRIORITY_LOW);
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_BLOCK, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_HitHorizBurstEffect(this.owner, this.owner.pos.add(point(74.0 * this.owner.dir, -52.0)), point(0, 0), this.owner.dir));
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_KICK_LANDING, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
