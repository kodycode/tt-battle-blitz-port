import { g, list, point, random } from '../runtime';
import { Class_Move } from './Class_Move';

export class Class_PlasmusChestBlast extends Class_Move {
  STATE_LAUNCH: number;
  STATE_WAIT: number;
  STATE_FINISH: number; // declared but never assigned in the Lingo
  moveState: number;
  initState: number;
  stateAge: number;
  projectile: any;

  constructor(owner: any) {
    super(owner);
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(1);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.PLASMUS;
    const vis = list(A.PLASMUS_CHEST_BLAST_01, A.PLASMUS_CHEST_BLAST_02, A.PLASMUS_CHEST_BLAST_03, A.PLASMUS_CHEST_BLAST_04, A.PLASMUS_CHEST_BLAST_05);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.PLASMUS_CHEST_BLAST_01D, A.PLASMUS_CHEST_BLAST_02D, A.PLASMUS_CHEST_BLAST_03D, A.PLASMUS_CHEST_BLAST_04D, A.PLASMUS_CHEST_BLAST_05D);
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_WAIT = 2;
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
  }

  destroy(): undefined {
    super.destroy();
    return undefined;
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
    this.projectile = undefined;
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  advanceState(): void {
    this.initState = 1;
    this.moveState = this.moveState + 1;
    this.stateAge = 0;
  }

  update(): void {
    this.age = this.age + 1;
    this.stateAge = this.stateAge + 1;
    if (this.moveDone) return;
    switch (this.moveState) {
      case this.STATE_LAUNCH:
        if (this.initState) this.initState = 0;
        if (this.stateAge === 4) this.animation.advance();
        else if (this.stateAge === 16) this.animation.advance();
        else if (this.stateAge === 18) this.advanceState();
        break;
      case this.STATE_WAIT: {
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          const o = this.owner;
          this.projectile = new g.classes.Class_PlasmusChestBlastProjectile_1(o, o.pos.add(point(200 * o.dir, -265)), point(26.0 * o.dir, -10.0), o.dir);
          g.main.screen.addProjectile(this.projectile);
          this.projectile = new g.classes.Class_PlasmusChestBlastProjectile_2(o, o.pos.add(point(200 * o.dir, -190)), point(30.0 * o.dir, -5.0), o.dir);
          g.main.screen.addProjectile(this.projectile);
          this.projectile = new g.classes.Class_PlasmusChestBlastProjectile_3(o, o.pos.add(point(220 * o.dir, -85)), point(26.0 * o.dir, 5.0), o.dir);
          g.main.screen.addProjectile(this.projectile);
          g.game.hud.flashScreen(1);
          if (random(2) === 1) g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_ROAR_BIG, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge === 20) {
          this.animation.advance();
        } else if (this.stateAge >= 26) {
          this.projectile = undefined;
          this.moveDone = 1;
        }
        break;
      }
    }
  }
}
