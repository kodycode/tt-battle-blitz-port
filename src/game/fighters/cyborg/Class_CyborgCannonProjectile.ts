import { g, list, point, voidp, LList, Member, Point } from '../../../runtime';
import { Class_Projectile } from '../../actors/Class_Projectile';

export class Class_CyborgCannonProjectile extends Class_Projectile {
  blastEffect: any;
  streams: LList<any>;
  streamCap: any;
  capvis: LList<Member>;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    this.attackDamage = g.DAMAGE_CYBORG_SONIC_CANNON;
    this.stunDuration = 8;
    this.visSprite.blend = 85;
    const A = g.assets.CYBORG;
    const s1 = A.FX_CYBORG_CANNON_STREAM_01;
    const vis = list(
      s1, A.FX_CYBORG_CANNON_STREAM_02, s1, A.FX_CYBORG_CANNON_STREAM_03, s1, A.FX_CYBORG_CANNON_STREAM_04,
      s1, A.FX_CYBORG_CANNON_STREAM_05, s1, A.FX_CYBORG_CANNON_STREAM_06, s1, A.FX_CYBORG_CANNON_STREAM_07,
    );
    const a = A.FX_CYBORG_CANNON_STREAM_01A;
    const att = list(a, a, a, a, a, a, a, a, a, a, a, a);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.attackMasks = att;
    this.capvis = list(A.FX_CYBORG_CANNON_CAP_01, A.FX_CYBORG_CANNON_CAP_02);
    this.blastEffect = new g.classes.Class_CyborgCannonBurstLoopEffect(owner, initPos, initVel, initDir);
    this.blastEffect.getSprite().blend = 100;
    g.main.screen.addEffect(this.blastEffect);
    g.main.audioMgr.playSound(A.SFX_CYBORG_CANNONBLASTSUSTAINED_LOOP, 60, g.SFX_EVENT_PRIORITY_LOW);
    this.streams = new LList();
    for (let i = 0; i <= 3; i++) {
      const o = new g.classes.Class_StaticActor(vis.get(1), g.SPRITE_LOCZ_PROJECTILES, initPos.add(point(i * 114.0 * initDir, 0.0)), initVel, initDir);
      o.getSprite().ink = g.INK_BGTRANSPARENT;
      this.streams.append(o);
    }
    this.streamCap = new g.classes.Class_StaticActor(this.capvis.get(1), g.SPRITE_LOCZ_PROJECTILES, initPos.add(point(4 * 114.0 * initDir, 0.0)), initVel, initDir);
    this.streamCap.getSprite().ink = g.INK_BGTRANSPARENT;
  }

  kill(): void {
    super.kill();
    if (!voidp(this.blastEffect)) {
      g.game.killEffect(this.blastEffect);
      this.blastEffect = undefined;
      g.main.audioMgr.stopSound(g.assets.CYBORG.SFX_CYBORG_CANNONBLASTSUSTAINED_LOOP);
    }
    for (const o of this.streams) o.destroy();
    this.streamCap.destroy();
  }

  update(): void {
    super.update();
    for (const o of this.streams) o.getSprite().member = this.animation.getMember();
    this.streamCap.getSprite().member = this.capvis.get((this.age % 2) + 1);
  }

  paint(): void {
    super.paint();
    for (const o of this.streams) o.paint();
    this.streamCap.paint();
  }

  // Returns VOID (undefined) when already dead, like the Lingo `exit`. Does not kill the projectile.
  triggerPayoff(): any {
    if (!this.alive) return undefined;
    if (this.owner.opponent.isBlocking() || !this.owner.opponent.getMove().isVulnerable()) {
      g.main.audioMgr.playSound(g.assets.CYBORG.SFX_CYBORG_CANNONMISS, 100, g.SFX_EVENT_PRIORITY_LOW);
      g.main.audioMgr.playSound(g.assets.AUDIO.sfx_blocked_attack, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 0;
    } else {
      g.main.screen.addEffect(new g.classes.Class_CyborgExplodeEffect(this.owner, point(this.owner.opponent.getPosX(), this.getPosY()), point(0, 0), this.dir));
      g.main.audioMgr.playSound(g.assets.CYBORG.SFX_CYBORG_CANNONHIT, 100, g.SFX_EVENT_PRIORITY_LOW);
      return 1;
    }
  }
}
