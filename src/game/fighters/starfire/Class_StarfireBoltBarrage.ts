import { g, Point, list, point, voidp } from '../../../runtime';
import { Class_Move } from '../Class_Move';

export class Class_StarfireBoltBarrage extends Class_Move {
  STATE_LAUNCH: number;
  STATE_BOB: number;
  STATE_CONJURE: number;
  STATE_ATTACK: number;
  STATE_FINISH: number;
  moveState: number;
  initState: number;
  stateAge: number;
  projectile: any;
  effect: any;
  launchHeight: number;
  boltLaunchVel: Point;
  boltRightLaunchOffset: Point;
  boltLeftLaunchOffset: Point;
  boltRightConjureOffset: Point;
  boltLeftConjureOffset: Point;
  groundHitPos: Point;

  constructor(owner: any) {
    super(owner);
    this.setAttack(1);
    this.setInterruptible(0);
    this.setVulnerable(1);
    const S = g.assets.CHAR_SHARED;
    const A = g.assets.STARFIRE;
    const vis = list(S.STARFIRE_FLOAT_UP_01, S.STARFIRE_ATTACK_01, S.STARFIRE_ATTACK_02, S.STARFIRE_ATTACK_03, S.STARFIRE_ATTACK_04, A.STARFIRE_FALL_02);
    const att = list(g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0, g.MEMBER_0);
    const def = list(A.STARFIRE_FLOAT_UP_01D, A.STARFIRE_ATTACK_01D, A.STARFIRE_ATTACK_02D, A.STARFIRE_ATTACK_03D, A.STARFIRE_ATTACK_04D, A.STARFIRE_FALL_02D);
    const order = list(1, 2, 3, 3, 4, 5, 2, 3, 4, 5, 2, 6);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.attackMasks = att;
    this.defenseMasks = def;
    this.STATE_LAUNCH = 1;
    this.STATE_BOB = 2;
    this.STATE_CONJURE = 3;
    this.STATE_ATTACK = 4;
    this.STATE_FINISH = 5;
    this.moveState = 1;
    this.initState = 1;
    this.stateAge = 0;
    this.launchHeight = -180.0;
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
    this.effect = undefined;
    this.owner.setOnGround(1);
    this.owner.setShaking(0);
    this.owner.setHovering(0);
    this.owner.setShowingTrails(0);
    this.owner.setVel(0.0, 0.0);
  }

  stop(): void {
    super.stop();
    if (!voidp(this.effect)) {
      g.game.killEffect(this.effect);
      this.effect = undefined;
    }
    if (!voidp(this.projectile)) {
      g.game.killProjectile(this.projectile);
      this.projectile = undefined;
    }
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
    const o = this.owner;
    switch (this.moveState) {
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
          o.setOnGround(0);
        }
        o.moveBy(0.0, -30.0);
        if (o.getPosY() <= this.launchHeight) {
          o.setPosY(this.launchHeight);
          this.advanceState();
        }
        break;
      case this.STATE_BOB:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          o.setHovering(1);
        }
        if (this.stateAge >= 10) this.advanceState();
        break;
      case this.STATE_CONJURE:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          o.setHovering(0);
          this.setImmobile(1);
          this.boltLaunchVel = point(20.0 * o.dir, 25.0);
          this.boltRightLaunchOffset = point(53.0 * o.dir, -88.0);
          this.boltLeftLaunchOffset = point(66.0 * o.dir, -96.0);
          this.boltRightConjureOffset = point(-50.0 * o.dir, -150.0);
          this.boltLeftConjureOffset = point(0.0, -180.0);
          const p = o.pos.add(this.boltRightLaunchOffset);
          // Float arithmetic: (locH * -p.locV) / locV, left to right as in Lingo.
          this.groundHitPos = point(p.locH + (this.boltLaunchVel.locH * -p.locV) / this.boltLaunchVel.locV, 0.0);
          this.effect = new g.classes.Class_StarfireBoltGlowEffect(o, o.pos.add(this.boltRightConjureOffset), point(0, 0), o.dir);
          g.main.screen.addEffect(this.effect);
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_STARFIRE_MAKINGSTARBOLT, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.stateAge === 4) this.advanceState();
        break;
      case this.STATE_ATTACK:
        if (this.initState) this.initState = 0;
        switch (this.stateAge) {
          case 1:
            this.animation.advance();
            this.effect = new g.classes.Class_StarfireBoltRightHandEffect(o, o.pos.add(this.boltRightConjureOffset), point(0.0, 0.0), o.dir);
            g.main.screen.addEffect(this.effect);
            break;
          case 3:
            this.animation.advance();
            g.main.screen.addProjectile(new g.classes.Class_StarfireBoltProjectile(o, o.pos.add(this.boltRightLaunchOffset), this.boltLaunchVel, o.dir));
            g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_STARFIRE_BOLT_BARRAGE, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          case 6:
            this.animation.advance();
            this.effect = new g.classes.Class_StarfireBoltLeftHandEffect(o, o.pos.add(this.boltLeftConjureOffset), point(0.0, 0.0), o.dir);
            g.main.screen.addEffect(this.effect);
            break;
          case 9:
            this.animation.advance();
            g.main.screen.addProjectile(new g.classes.Class_StarfireBoltProjectile(o, o.pos.add(this.boltLeftLaunchOffset), this.boltLaunchVel, o.dir));
            break;
          case 10:
            g.main.screen.addEffect(new g.classes.Class_StarfireExplodeEffect(o, this.groundHitPos.add(point(0.0, -20.0)), point(0, 0), o.dir));
            g.main.screen.addEffect(new g.classes.Class_StarfireColumnEffect(o, this.groundHitPos, point(0, 0), o.dir));
            this.projectile = new g.classes.Class_StarfireBoltExplosionProjectile(o, this.groundHitPos, point(0.0, 0.0), o.dir);
            g.main.screen.addProjectile(this.projectile);
            break;
          case 12:
            this.animation.advance();
            this.effect = new g.classes.Class_StarfireBoltRightHandEffect(o, o.pos.add(this.boltRightConjureOffset), point(0.0, 0.0), o.dir);
            g.main.screen.addEffect(this.effect);
            break;
          case 15:
            this.animation.advance();
            g.main.screen.addProjectile(new g.classes.Class_StarfireBoltProjectile(o, o.pos.add(this.boltRightLaunchOffset), this.boltLaunchVel, o.dir));
            g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_STARFIRE_BOLT_BARRAGE, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          case 16:
            g.main.screen.addEffect(new g.classes.Class_StarfireExplodeEffect(o, this.groundHitPos.add(point(60.0 * o.dir, -30.0)), point(0, 0), o.dir));
            break;
          case 18:
            this.animation.advance();
            this.effect = new g.classes.Class_StarfireBoltLeftHandEffect(o, o.pos.add(this.boltLeftConjureOffset), point(0.0, 0.0), o.dir);
            g.main.screen.addEffect(this.effect);
            break;
          case 21:
            this.animation.advance();
            g.main.screen.addProjectile(new g.classes.Class_StarfireBoltProjectile(o, o.pos.add(this.boltLeftLaunchOffset), this.boltLaunchVel, o.dir));
            break;
          case 22:
            g.main.screen.addEffect(new g.classes.Class_StarfireExplodeEffect(o, this.groundHitPos.add(point(-50.0 * o.dir, -5.0)), point(0, 0), o.dir));
            break;
          case 27:
            g.main.screen.addEffect(new g.classes.Class_StarfireExplodeEffect(o, this.groundHitPos.add(point(10.0 * o.dir, -25.0)), point(0, 0), o.dir));
            break;
          case 29:
            g.game.killProjectile(this.projectile);
            this.projectile = undefined;
            this.advanceState();
            break;
        }
        break;
      case this.STATE_FINISH:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          o.setHovering(0);
          this.setImmobile(0);
        }
        o.accelerate(g.gravity.mul(0.5));
        if (o.fallCheck()) {
          o.setOnGround(1);
          o.setVel(0.0, 0.0);
          this.moveDone = 1;
        }
        break;
    }
  }
}
