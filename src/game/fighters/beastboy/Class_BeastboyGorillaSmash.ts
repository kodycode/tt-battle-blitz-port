import { g, list, point } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_BeastboyGorillaSmash extends Class_Move {
  projectile: any;

  constructor(obj: any) {
    super(obj);
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(1);
    this.setImmobile(0);
    this.setMelee(1);
    const A = g.assets.BEASTBOY;
    const vis = list(A.BEASTBOY_STAND_TRANSFORM_01, A.BEASTBOY_STAND_01, A.BEASTBOY_CROUCH_01, A.BEASTBOY_CROUCH_TRANSFORM_01, A.BEASTBOY_APE_TRANSFORM_01, A.BEASTBOY_APE_01, A.BEASTBOY_APE_02, A.BEASTBOY_APE_03, A.BEASTBOY_APE_TRANSFORM_03);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.BEASTBOY_STAND_01D, A.BEASTBOY_STAND_01D, A.BEASTBOY_CROUCH_01D, A.BEASTBOY_CROUCH_01D, A.BEASTBOY_APE_01D, A.BEASTBOY_APE_01D, A.BEASTBOY_APE_02D, A.BEASTBOY_APE_03D, A.BEASTBOY_APE_03D);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 2, 3, 4, 3, 4, 5, 6, 5, 6, 6, 6, 6, 6, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 8, 9, 4, 3, 4, 3);
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
    this.projectile = undefined;
  }

  update(): void {
    super.update();
    switch (this.age) {
      case 1:
        g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_TRANSFORM, 100, g.SFX_EVENT_PRIORITY_LOW);
        g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_GORILLA, 100, g.SFX_EVENT_PRIORITY_LOW);
        break;
      case 10:
        g.main.screen.addEffect(new g.classes.Class_WhiteBurstReverseEffect(this.owner, this.owner.pos.add(point(-15.0 * this.owner.dir, -205.0)), point(0.0, 0.0), this.owner.dir));
        break;
      case 13:
        this.owner.setShowingTrails(1);
        break;
      case 16:
        this.owner.setShowingTrails(0);
        this.projectile = new g.classes.Class_BeastboyWaveProjectile(this.owner, this.owner.pos.add(point(50 * this.owner.dir, 0)), point(0, 0), this.owner.dir);
        g.main.screen.addProjectile(this.projectile);
        g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(this.owner, this.owner.pos.add(point(20.0 * this.owner.dir, 15.0)), point(0.0 * this.owner.dir, 0.0), this.owner.dir));
        break;
      case 25:
        g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_TRANSFORMBACK, 100, g.SFX_EVENT_PRIORITY_LOW);
        break;
    }
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    g.main.screen.addEffect(new g.classes.Class_HitHorizBurstEffect(this.owner, this.owner.pos.add(point(74.0 * this.owner.dir, -52.0)), point(0, 0), this.owner.dir));
    g.main.audioMgr.playSound(g.assets.BEASTBOY.SFX_BEASTBOY_GORILLAHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
    return 1;
  }
}
