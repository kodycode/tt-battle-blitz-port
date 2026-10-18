import { g, Point, list, point, objectp, idiv } from '../../../runtime';
import { Class_Effect } from '../../actors/Class_Effect';

export class Class_SummonRavenEffect extends Class_Effect {
  STATE_LAUNCH: number;
  STATE_ATTACK: number;
  STATE_WAIT: number;
  animState: number;
  initState: number;
  stateAge: number;
  projectile: any;
  destPos: Point;
  fallPosX: number;
  bgEffect: any;
  shadow: any;
  trails: any; // declared in the Lingo property list, never used

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const S = g.assets.CHAR_SHARED;
    const vis = list(S.RAVEN_SPECIAL_04, S.RAVEN_SPECIAL_05, S.RAVEN_SPECIAL_06, S.RAVEN_SPECIAL_03, S.RAVEN_SPECIAL_07);
    // 1-based indices into vis, as in Lingo.
    const order = list(3, 1, 2, 3, 4, 5);
    this.animation = new g.classes.Class_IndexedAnimation(vis, order);
    this.visSprite.blend = 100;
    this.STATE_LAUNCH = 1;
    this.STATE_ATTACK = 2;
    this.STATE_WAIT = 3;
    this.animState = 1;
    this.initState = 1;
    this.stateAge = 0;
    this.shadow = new g.classes.Class_Shadow(this, 100);
  }

  destroy(): undefined {
    super.destroy();
    if (objectp(this.shadow)) this.shadow.destroy();
    if (objectp(this.bgEffect)) this.bgEffect.destroy();
    return undefined;
  }

  // Lingo `on advanceState` (declared without `me`; called as me.advanceState()).
  advanceState(): void {
    this.initState = 1;
    this.animState = this.animState + 1;
    this.stateAge = 0;
  }

  update(): void {
    this.age = this.age + 1;
    this.stateAge = this.stateAge + 1;
    if (!this.alive) return;
    switch (this.animState) {
      case this.STATE_LAUNCH:
        if (this.initState) {
          this.initState = 0;
          this.bgEffect = new g.classes.Class_BgBarsTitanEffect(this.owner, point(0, 0), point(0, 0), this.dir);
          g.main.screen.addEffect(this.bgEffect);
          if (this.dir > 0) this.destPos = point(g.game.scene.getViewRect().left + 120, -125.0);
          else this.destPos = point(g.game.scene.getViewRect().right - 120, -125.0);
        }
        switch (this.stateAge) {
          case 1:
            this.setPos(this.destPos.add(point(-170.0 * this.dir, -131.0)));
            break;
          case 2:
            this.setPos(this.destPos.add(point(-100.0 * this.dir, -57.0)));
            break;
          case 3:
            this.setPos(this.destPos.add(point(-30.0 * this.dir, -20.0)));
            break;
          case 4:
            this.setPos(this.destPos.add(point(0.0, 0.0)));
            this.animation.advance();
            break;
          case 6:
            this.animation.advance();
            break;
          case 8:
            this.setPos(this.destPos.add(point(-10.0 * this.dir, -9.0)));
            this.animation.advance();
            break;
          case 9:
            this.setPos(this.destPos.add(point(0.0, 16.0)));
            this.animation.advance();
            break;
          case 10:
            this.setPos(this.destPos.add(point(0.0, 12.0)));
            break;
          case 11:
            this.setPos(this.destPos.add(point(0.0, 8.0)));
            break;
          case 12:
            this.setPos(this.destPos.add(point(0.0, 4.0)));
            break;
          case 13:
            this.setPos(this.destPos.add(point(0.0, 0.0)));
            break;
          case 23:
            this.advanceState();
            break;
        }
        break;
      case this.STATE_ATTACK:
        if (this.initState) {
          this.initState = 0;
          this.animation.advance();
          g.game.addEffect(new g.classes.Class_RavenSwirlEffect(this.owner, this.pos.add(point(0.0, -110.0)), point(0, 0), this.owner.dir));
          this.fallPosX = this.owner.opponent.getPosX() - 200.0 * this.owner.dir;
          this.projectile = new g.classes.Class_RavenFallingObjectsProjectile(this.owner, point(this.fallPosX, -450.0), point(20.0 * this.owner.dir, 45.0), this.owner.dir);
          g.game.addProjectile(this.projectile);
          this.projectile.attackDamage = 0;
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_RAVEN_VORTEX, 100, g.SFX_EVENT_PRIORITY_LOW);
          g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_RAVEN_FLINGOBJECT, 100, g.SFX_EVENT_PRIORITY_LOW);
        }
        if (this.projectile.explosionAt) {
          // Integer arithmetic in Lingo (HEALTH_MAX and SUMMON_DAMAGE_PERCENT are integers).
          const damage = this.owner.opponent.reactToCollision(idiv(this.owner.opponent.HEALTH_MAX * g.SUMMON_DAMAGE_PERCENT, 100));
          this.owner.awardPoints(damage);
          this.advanceState();
        }
        break;
      case this.STATE_WAIT:
        if (this.initState) this.initState = 0;
        if (this.stateAge >= 5) this.kill();
        break;
    }
    this.setPos(this.pos.add(this.vel));
    this.visSprite.member = this.animation.getMember();
    if (objectp(this.shadow)) this.shadow.update();
  }

  paint(): void {
    super.paint();
    if (objectp(this.shadow)) this.shadow.paint();
  }
}
