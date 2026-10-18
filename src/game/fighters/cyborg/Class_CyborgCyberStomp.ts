import { g, list, point, voidp } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_CyborgCyberStomp extends Class_Move {
  STATE_CROUCH: number;
  STATE_ASCENT: number;
  STATE_APEX: number;
  STATE_DESCENT: number;
  STATE_LAND: number;
  moveState: number;
  initState: number;
  stateAge: number;
  attackX: number;
  visAnim: any;
  visAltAnim: any;

  constructor(obj: any) {
    super(obj);
    this.attackDamage = g.DAMAGE_CYBORG_CYBER_STOMP;
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    this.setInitOwnerDir(0);
    this.setUsesProjectile(0);
    this.setImmobile(0);
    this.setMelee(0);
    const A = g.assets.CYBORG;
    const vis = list(A.CYBORG_CROUCH_01, A.CYBORG_JUMP_01, A.CYBORG_JUMP_02);
    const visAlt = list(A.CYBORG_CROUCH_ALT_01, A.CYBORG_JUMP_ALT_01, A.CYBORG_JUMP_ALT_02);
    const att = list(g.MEMBER_0, g.MEMBER_0, A.CYBORG_JUMP_02D);
    const def = list(A.CYBORG_CROUCH_01D, A.CYBORG_JUMP_01D, g.MEMBER_0);
    // 1-based indices into vis, as in Lingo.
    const order = list(1, 2, 3, 1);
    this.visAnim = new g.classes.Class_IndexedAnimation(vis, order);
    this.visAltAnim = new g.classes.Class_IndexedAnimation(visAlt, order);
    this.animation = this.visAnim;
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_CROUCH = 1;
    this.STATE_ASCENT = 2;
    this.STATE_APEX = 3;
    this.STATE_DESCENT = 4;
    this.STATE_LAND = 5;
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
  }

  stop(): void {
    super.stop();
    this.owner.setShowingTrails(0);
  }

  reset(arg?: any): void {
    super.reset();
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
    // jumpDir is not a property of this script: in the original it is a dead local.
    let jumpDir: number;
    if (voidp(arg)) jumpDir = 0;
    else if (arg < 0) jumpDir = -1;
    else if (arg > 0) jumpDir = 1;
    else jumpDir = 0;
    void jumpDir;
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
    this.attackX = 0.0;
    this.dirChanged();
  }

  dirChanged(): void {
    if (this.owner.dir > 0) this.animation = this.visAnim;
    else this.animation = this.visAltAnim;
    this.animation.reset();
  }

  setState(i: number): void {
    this.initState = 1;
    this.moveState = i;
    this.stateAge = 0;
  }

  advanceState(): void {
    this.setState(this.moveState + 1);
  }

  update(): void {
    this.age = this.age + 1;
    this.stateAge = this.stateAge + 1;
    if (this.moveDone) return;
    const o = this.owner;
    switch (this.moveState) {
      case this.STATE_CROUCH:
        if (this.initState) {
          this.initState = 0;
          g.main.audioMgr.playSound(g.assets.AUDIO.SFX_JUMP_1, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge === 4) this.advanceState();
        break;
      case this.STATE_ASCENT:
        if (this.initState) {
          this.initState = 0;
          o.setVel(0.0, -85.0);
          this.animation.advance();
          o.setOnGround(0);
          o.setShowingTrails(1);
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(o, o.pos.sub(point(30.0 * o.dir, 0.0)), point(-10.0 * o.dir, 0.0), o.dir));
          g.main.screen.addEffect(new g.classes.Class_DustJumpEffect(o, o.pos.sub(point(-30.0 * o.dir, 0.0)), point(10.0 * o.dir, 0.0), -o.dir));
          this.attackX = o.opponent.getPosX();
        }
        if (o.getPosY() + o.getVelY() <= -600.0) this.advanceState();
        break;
      case this.STATE_APEX:
        if (this.initState) {
          this.initState = 0;
          o.setVel((o.opponent.getPosX() - o.getPosX()) * 0.125, 0.0);
        }
        if (this.stateAge === 8) this.advanceState();
        break;
      case this.STATE_DESCENT:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          o.setPosX(this.attackX);
          o.setVel(0.0, 85.0);
        }
        if (o.fallCheck()) {
          o.setVel(0.0, 0.0);
          this.advanceState();
        }
        break;
      case this.STATE_LAND:
        if (this.initState) {
          this.animation.advance();
          this.initState = 0;
          o.setOnGround(1);
          o.setShowingTrails(0);
          g.main.screen.addEffect(new g.classes.Class_CyborgFlareEffect(o, o.pos.sub(point(30.0 * o.dir, 0.0)), point(-10.0 * o.dir, 0.0), o.dir));
          g.main.screen.addEffect(new g.classes.Class_CyborgFlareEffect(o, o.pos.sub(point(-30.0 * o.dir, 0.0)), point(10.0 * o.dir, 0.0), -o.dir));
          g.main.audioMgr.playSound(g.assets.CYBORG.SFX_CYBORG_CYBERSTOMP_HIT, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge === 4) this.moveDone = 1;
        break;
    }
  }

  opponentHit(): number {
    this.hitOpponent = 1;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.CYBORG.SFX_CYBORG_FLYINGPUNCHMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    } else {
      g.main.screen.addEffect(new g.classes.Class_CyborgExplodeEffect(this.owner, this.owner.opponent.pos.add(point(0.0, -100.0)), point(0, 0), this.owner.dir));
      g.main.audioMgr.playSound(g.assets.CYBORG.SFX_CYBORG_FLYINGPUNCH, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 1;
    }
  }
}
