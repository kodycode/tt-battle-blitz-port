import { g, Point, Member, LList, list, point } from '../runtime';
import { Class_Projectile } from './Class_Projectile';

export class Class_RavenFallingObjectsProjectile extends Class_Projectile {
  leftObj: any;
  rightObj: any;
  leftObjOffset: Point;
  rightObjOffset: Point;
  leftObjVel: Point;
  rightObjVel: Point;
  shadow: any;
  needInit: number;
  explosionAt: number;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_RAVEN_EXPLOSIVE_DROP;
    this.stunDuration = 10;
    const S = g.assets.CHAR_SHARED;
    let vis: LList<Member>;
    let sideMem: Member;
    switch (g.villainID) {
      case g.FIGHTER_ID_JINX:
        vis = list(S.FX_RAVEN_OBJ_TIRE_01);
        sideMem = S.FX_RAVEN_OBJ_HOTDOGCART_01;
        break;
      case g.FIGHTER_ID_GIZMO:
        vis = list(S.FX_RAVEN_OBJ_COG_01);
        sideMem = S.FX_RAVEN_OBJ_CRATE_01;
        break;
      case g.FIGHTER_ID_MAMMOTH:
        vis = list(S.FX_RAVEN_OBJ_IBEAM_SM_01);
        sideMem = S.FX_RAVEN_OBJ_IBEAM_LG_01;
        break;
      case g.FIGHTER_ID_CINDERBLOCK:
        vis = list(S.FX_RAVEN_OBJ_CONCRETE_SM_01);
        sideMem = S.FX_RAVEN_OBJ_CONCRETE_LG_01;
        break;
      case g.FIGHTER_ID_PLASMUS:
        vis = list(S.FX_RAVEN_OBJ_ENGINE_01);
        sideMem = S.FX_RAVEN_OBJ_MACHINE_01;
        break;
      default:
        vis = list(S.FX_RAVEN_OBJ_IBEAM_SM_01);
        sideMem = S.FX_RAVEN_OBJ_IBEAM_LG_01;
    }
    this.attackMasks = list(g.assets.RAVEN.FX_RAVEN_FALLING_OBJECTS_01A);
    const centerObjOffset = point(-10.0 * this.dir, -60);
    this.leftObjOffset = point(-90.0 * this.dir, 35.0);
    this.rightObjOffset = point(110.0 * this.dir, 5.0);
    this.leftObjVel = this.vel.mul(1.3);
    this.rightObjVel = this.vel.mul(1.2);
    this.moveBy(centerObjOffset);
    this.leftObj = new g.classes.Class_StaticActor(sideMem, g.SPRITE_LOCZ_EFFECTS_FOREGROUND, this.pos.add(this.leftObjOffset), initVel, initDir);
    this.rightObj = new g.classes.Class_StaticActor(sideMem, g.SPRITE_LOCZ_EFFECTS_FOREGROUND, this.pos.add(this.rightObjOffset), initVel, initDir);
    this.leftObj.visSprite.ink = g.INK_BGTRANSPARENT;
    this.rightObj.visSprite.ink = g.INK_BGTRANSPARENT;
    this.animation = new g.classes.Class_PlayOnceAnimation(vis);
    this.shadow = new g.classes.Class_Shadow(this, 150);
    this.needInit = 1;
    this.armed = 0;
  }

  destroy(): undefined {
    super.destroy();
    this.leftObj.destroy();
    this.rightObj.destroy();
    this.shadow.destroy();
    return undefined;
  }

  update(): void {
    this.age = this.age + 1;
    if (this.alive) {
      if (this.needInit) {
        this.needInit = 0;
        this.explosionAt = 0;
      }
      this.setPos(this.pos.add(this.vel));
      if (this.getPosY() >= -90.0 && !this.explosionAt) {
        this.setPosY(0.0);
        this.setVel(0.0, 0.0);
        this.armed = 1;
        this.explosionAt = this.age;
        g.main.screen.addEffect(new g.classes.Class_GroundExplode2Effect(this.owner, this.pos.add(point(0.0, 10.0)), point(0, 0), this.owner.dir));
        g.main.screen.addEffect(new g.classes.Class_RavenColumnEffect(this.owner, this.pos, point(0, 0), this.owner.dir));
        g.main.audioMgr.playSound(g.assets.CHAR_SHARED.SFX_RAVEN_OBJECTS_HIT_GROUND, 100, g.SFX_EVENT_PRIORITY_LOW);
        g.game.hud.flashScreen(1);
        this.visSprite.visible = false;
        this.leftObj.visSprite.visible = false;
        this.rightObj.visSprite.visible = false;
      }
      this.visSprite.member = this.animation.getMember();
      this.updateBoundingBoxes();
      this.shadow.update();
      this.leftObj.moveBy(this.leftObjVel);
      this.rightObj.moveBy(this.rightObjVel);
      if (this.explosionAt) {
        if (this.age === this.explosionAt + 2) {
          g.main.screen.addEffect(new g.classes.Class_GroundExplode2Effect(this.owner, this.pos.add(point(-90.0 * this.owner.dir, 5.0)), point(0, 0), -this.owner.dir));
        } else if (this.age === this.explosionAt + 3) {
          g.main.screen.addEffect(new g.classes.Class_GroundExplode2Effect(this.owner, this.pos.add(point(90.0 * this.owner.dir, 0.0)), point(0, 0), this.owner.dir));
        } else if (this.age >= this.explosionAt + 11) {
          this.kill();
        }
      }
    }
  }

  paint(): void {
    super.paint();
    this.shadow.paint();
    this.leftObj.paint();
    this.rightObj.paint();
  }

  triggerPayoff(): number {
    if (!this.alive) return 0;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    }
    return 1;
  }
}
