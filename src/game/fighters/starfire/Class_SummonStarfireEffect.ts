import { g, Point, list, point, abs, idiv, objectp } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_SummonStarfireEffect extends Class_Effect {
  STATE_WAIT: number;
  STATE_CONJURE: number;
  STATE_ATTACK: number;
  animState: number;
  initState: number;
  stateAge: number;
  bgEffect: any;
  shadow: any;
  trails: any;
  boltLaunchVel: Point;
  boltRightLaunchOffset: Point;
  boltLeftLaunchOffset: Point;
  boltRightConjureOffset: Point;
  boltLeftConjureOffset: Point;
  groundHitPos: Point;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.STATE_WAIT = 1;
    this.STATE_CONJURE = 2;
    this.STATE_ATTACK = 3;
    this.initState = 1;
    this.animState = 1;
    this.stateAge = 0;
    const S = g.assets.CHAR_SHARED;
    const vis = list(S.STARFIRE_FLOAT_UP_01, S.STARFIRE_ATTACK_01, S.STARFIRE_ATTACK_02, S.STARFIRE_ATTACK_03, S.STARFIRE_ATTACK_04);
    const order = list(1, 2, 3, 3, 4, 5, 2, 3, 4, 5, 2, 1);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.visSprite.blend = 100;
    this.shadow = new g.classes.Class_Shadow(this, 130);
    this.trails = new g.classes.Class_ActorTrails(4, g.SPRITE_LOCZ_EFFECTS_BACKGROUND);
  }

  destroy(): undefined {
    super.destroy();
    if (objectp(this.shadow)) this.shadow.destroy();
    if (objectp(this.bgEffect)) this.bgEffect.destroy();
    if (objectp(this.trails)) this.trails.destroy();
    return undefined;
  }

  advanceState(): void {
    this.initState = 1;
    this.animState = this.animState + 1;
    this.stateAge = 0;
  }

  update(): void {
    this.age = this.age + 1;
    this.stateAge = this.stateAge + 1;
    if (!this.alive) return;
    // `effect` is a plain local in the Lingo (assigned, never read back).
    let effect: any;
    switch (this.animState) {
      case this.STATE_WAIT:
        if (this.initState) {
          this.initState = 0;
          this.bgEffect = new g.classes.Class_BgBarsTitanEffect(this.owner, point(0, 0), point(0, 0), this.dir);
          g.main.screen.addEffect(this.bgEffect);
          this.boltLaunchVel = point(20.0 * this.dir, 25.0);
          this.boltRightLaunchOffset = point(53.0 * this.dir, -88.0);
          this.boltLeftLaunchOffset = point(66.0 * this.dir, -96.0);
          this.boltRightConjureOffset = point(-50.0 * this.dir, -150.0);
          this.boltLeftConjureOffset = point(0.0, -180.0);
          const targetX = this.owner.opponent.getPosX();
          const targetY = this.owner.opponent.getPosY();
          const targetPos = point(targetX, 0.0);
          const launchHeight = -130;
          const boltStartY = launchHeight + this.boltRightLaunchOffset.locV;
          // Float division (boltStartY and the velocity are floats).
          const boltStartX = targetX - this.boltLaunchVel.locH * abs(boltStartY / this.boltLaunchVel.locV);
          const attackPos = point(boltStartX, boltStartY).sub(this.boltRightLaunchOffset);
          const startPos = attackPos.add(point(-275.0 * this.dir, 146.0));
          this.setPos(startPos);
        }
        this.trails.update(this);
        switch (this.stateAge) {
          case 1:
            this.moveBy(this.dir * 50.0, -1.0);
            break;
          case 2:
            this.moveBy(this.dir * 45.0, -3.0);
            break;
          case 3:
            this.moveBy(this.dir * 40.0, -5.0);
            break;
          case 4:
            this.moveBy(this.dir * 35.0, -7.0);
            break;
          case 5:
            this.moveBy(this.dir * 30.0, -9.0);
            break;
          case 6:
            this.moveBy(this.dir * 25.0, -12.0);
            break;
          case 7:
            this.moveBy(this.dir * 20.0, -16.0);
            break;
          case 8:
            this.moveBy(this.dir * 15.0, -23.0);
            break;
          case 9:
            this.moveBy(this.dir * 10.0, -30.0);
            break;
          case 10:
            this.moveBy(this.dir * 5.0, -40.0);
            this.advanceState();
            break;
        }
        break;
      case this.STATE_CONJURE:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          this.boltLaunchVel = point(20.0 * this.dir, 25.0);
          this.boltRightLaunchOffset = point(53.0 * this.dir, -88.0);
          this.boltLeftLaunchOffset = point(66.0 * this.dir, -96.0);
          this.boltRightConjureOffset = point(-50.0 * this.dir, -150.0);
          this.boltLeftConjureOffset = point(0.0, -180.0);
          const p = this.pos.add(this.boltRightLaunchOffset);
          // Float arithmetic: (locH * -p.locV) / locV, left to right as in Lingo.
          this.groundHitPos = point(p.locH + (this.boltLaunchVel.locH * -p.locV) / this.boltLaunchVel.locV, 0.0);
          effect = new g.classes.Class_StarfireBoltGlowEffect(this.owner, this.pos.add(this.boltRightConjureOffset), point(0, 0), this.dir);
          g.main.screen.addEffect(effect);
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_STARFIRE_MAKINGSTARBOLT, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        this.trails.update(undefined);
        if (this.stateAge === 4) this.advanceState();
        break;
      case this.STATE_ATTACK:
        if (this.initState) this.initState = 0;
        this.trails.update(undefined);
        switch (this.stateAge) {
          case 1:
            this.animation.advance();
            effect = new g.classes.Class_StarfireBoltRightHandEffect(this.owner, this.pos.add(this.boltRightConjureOffset), point(0.0, 0.0), this.dir);
            g.main.screen.addEffect(effect);
            break;
          case 3:
            this.animation.advance();
            g.main.screen.addProjectile(new g.classes.Class_StarfireBoltProjectile(this.owner, this.pos.add(this.boltRightLaunchOffset), this.boltLaunchVel, this.dir));
            g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_STARFIRE_BOLT_BARRAGE, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          case 6:
            this.animation.advance();
            effect = new g.classes.Class_StarfireBoltLeftHandEffect(this.owner, this.pos.add(this.boltLeftConjureOffset), point(0.0, 0.0), this.dir);
            g.main.screen.addEffect(effect);
            break;
          case 9:
            this.animation.advance();
            g.main.screen.addProjectile(new g.classes.Class_StarfireBoltProjectile(this.owner, this.pos.add(this.boltLeftLaunchOffset), this.boltLaunchVel, this.dir));
            break;
          case 10: {
            // Integer arithmetic in Lingo: HEALTH_MAX and SUMMON_DAMAGE_PERCENT are integers.
            const damage = this.owner.opponent.reactToCollision(idiv(this.owner.opponent.HEALTH_MAX * g.SUMMON_DAMAGE_PERCENT, 100));
            this.owner.awardPoints(damage);
            g.main.screen.addEffect(new g.classes.Class_StarfireExplodeEffect(this.owner, this.groundHitPos.add(point(0.0, -20.0)), point(0, 0), this.dir));
            g.main.screen.addEffect(new g.classes.Class_StarfireColumnEffect(this.owner, this.groundHitPos, point(0, 0), this.dir));
            g.game.hud.flashScreen(1);
            break;
          }
          case 12:
            this.animation.advance();
            effect = new g.classes.Class_StarfireBoltRightHandEffect(this.owner, this.pos.add(this.boltRightConjureOffset), point(0.0, 0.0), this.dir);
            g.main.screen.addEffect(effect);
            break;
          case 15:
            this.animation.advance();
            g.main.screen.addProjectile(new g.classes.Class_StarfireBoltProjectile(this.owner, this.pos.add(this.boltRightLaunchOffset), this.boltLaunchVel, this.dir));
            g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_STARFIRE_BOLT_BARRAGE, 100, g.SFX_EVENT_PRIORITY_LOW);
            break;
          case 16:
            g.main.screen.addEffect(new g.classes.Class_StarfireExplodeEffect(this.owner, this.groundHitPos.add(point(60.0 * this.dir, -30.0)), point(0, 0), this.dir));
            g.game.hud.flashScreen(1);
            break;
          case 18:
            this.animation.advance();
            effect = new g.classes.Class_StarfireBoltLeftHandEffect(this.owner, this.pos.add(this.boltLeftConjureOffset), point(0.0, 0.0), this.dir);
            g.main.screen.addEffect(effect);
            break;
          case 21:
            this.animation.advance();
            g.main.screen.addProjectile(new g.classes.Class_StarfireBoltProjectile(this.owner, this.pos.add(this.boltLeftLaunchOffset), this.boltLaunchVel, this.dir));
            break;
          case 22:
            g.main.screen.addEffect(new g.classes.Class_StarfireExplodeEffect(this.owner, this.groundHitPos.add(point(-50.0 * this.dir, -5.0)), point(0, 0), this.dir));
            g.game.hud.flashScreen(1);
            break;
          case 24:
            this.animation.advance();
            break;
          case 27:
            g.main.screen.addEffect(new g.classes.Class_StarfireExplodeEffect(this.owner, this.groundHitPos.add(point(10.0 * this.dir, -25.0)), point(0, 0), this.dir));
            g.game.hud.flashScreen(1);
            break;
          case 40:
            this.kill();
            break;
        }
        break;
    }
    this.setPos(this.pos.add(this.vel));
    this.visSprite.member = this.animation.getMember();
    if (objectp(this.shadow)) this.shadow.update();
  }

  paint(): void {
    super.paint();
    if (objectp(this.shadow)) this.shadow.paint();
    if (objectp(this.trails)) this.trails.paint();
  }
}
