import { g, Point, list } from '../runtime';
import { Class_Effect } from './Class_Effect';

export class Class_StarfireBoltGlowEffect extends Class_Effect {
  glowOver: any;

  constructor(owner: any, initPos: Point, initVel: Point, initDir: number) {
    super(owner, initPos, initVel, initDir);
    const vis = list(g.assets.CHAR_SHARED.FX_STARFIRE_BOLT_02);
    this.animation = new g.classes.Class_LoopedAnimation(vis);
    this.glowOver = new g.classes.Class_StaticActor(g.assets.CHAR_SHARED.fx_starfire_summon_glow_bg_01, g.SPRITE_LOCZ_EFFECTS_BACKGROUND, initPos, initVel, initDir);
  }

  destroy(): undefined {
    super.destroy();
    this.glowOver.destroy();
    return undefined;
  }

  update(): void {
    super.update();
    if (this.age < 6) {
      const glowSprite = this.glowOver.getSprite();
      glowSprite.rect = glowSprite.rect.inflate(-15, -15);
      let iBlend = glowSprite.blend - 20;
      if (iBlend < 0) iBlend = 0;
      glowSprite.blend = iBlend;
    } else {
      // Note: age stops advancing once dead, so this keeps calling kill() while the effect is still updated.
      this.kill();
    }
  }

  paint(): void {
    super.paint();
    this.glowOver.paint();
  }
}
