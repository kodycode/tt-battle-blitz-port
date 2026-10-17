import { g, Point, Rect, Member, Sprite, LList, point, rect, list, abs, idiv, stageRect } from '../runtime';

export class Class_Scene {
  game: any;
  bgMember: Member;
  bgSprite: Sprite;
  stageRect: Rect;
  sceneOrigin: Point;
  sceneRect: Rect;
  sceneBoundsMinX: number;
  sceneBoundsMaxX: number;
  viewCenterMinX: number;
  viewCenterMaxX: number;
  viewCenterMinY: number;
  viewCenterMaxY: number;
  viewOriginRect: Rect;
  viewRect: Rect;
  viewCenter: Point;
  viewUpperLeft: Point;
  platforms: LList<LList<Point>>;
  ambientAudioID: any;

  constructor(obj: any) {
    this.game = obj;
    this.platforms = new LList();
    this.platforms.append(list(point(-1200.0, 0.0), point(1200.0, 0.0)));
    let sceneLeftBufferX: any;
    let sceneRightBufferX: any;
    switch (g.villainID) {
      case g.FIGHTER_ID_JINX:
        this.bgMember = g.assets.JINX.JINX_BACKGROUND;
        sceneLeftBufferX = 175;
        sceneRightBufferX = 300;
        this.platforms.append(list(point(-1200.0, -236.0), point(-955.0, -236.0)));
        this.platforms.append(list(point(712.0, -160.0), point(1200.0, -160.0)));
        this.platforms.append(list(point(712.0, -305.0), point(1200.0, -305.0)));
        this.ambientAudioID = g.main.audioMgr.playSound(g.assets.JINX.SFX_JINX_BG_CROWDNOISE3, 100, g.SFX_EVENT_PRIORITY_UNINTERRUPTIBLE);
        break;
      case g.FIGHTER_ID_MAMMOTH:
        this.bgMember = g.assets.MAMMOTH.MAMMOTH_BACKGROUND;
        sceneLeftBufferX = 210;
        sceneRightBufferX = 340;
        this.platforms.append(list(point(-1200.0, -206.0), point(-840.0, -206.0)));
        this.platforms.append(list(point(576.0, -140.0), point(748.0, -140.0)));
        this.ambientAudioID = g.main.audioMgr.playSound(g.assets.MAMMOTH.SFX_MAMMOTH_AMBIENT, 100, g.SFX_EVENT_PRIORITY_UNINTERRUPTIBLE);
        break;
      case g.FIGHTER_ID_GIZMO:
        this.bgMember = g.assets.GIZMO.GIZMO_BACKGROUND;
        sceneLeftBufferX = 210;
        sceneRightBufferX = 300;
        this.platforms.append(list(point(-1200.0, -205.0), point(-830.0, -205.0)));
        this.platforms.append(list(point(715.0, -215.0), point(1200.0, -215.0)));
        this.ambientAudioID = g.main.audioMgr.playSound(g.assets.GIZMO.SFX_GIZMO_AMBIENTBACKGROUNDLOOP, 100, g.SFX_EVENT_PRIORITY_UNINTERRUPTIBLE);
        break;
      case g.FIGHTER_ID_CINDERBLOCK:
        this.bgMember = g.assets.CINDERBLOCK.CINDERBLOCK_BACKGROUND;
        sceneLeftBufferX = 200;
        sceneRightBufferX = 300;
        this.platforms.append(list(point(-1200.0, -180.0), point(-930.0, -180.0)));
        this.platforms.append(list(point(740.0, -180.0), point(1200.0, -180.0)));
        this.ambientAudioID = g.main.audioMgr.playSound(g.assets.CINDERBLOCK.SFX_CINDERBLOCK_BG_SIRENS, 60, g.SFX_EVENT_PRIORITY_UNINTERRUPTIBLE);
        break;
      case g.FIGHTER_ID_PLASMUS:
        this.bgMember = g.assets.PLASMUS.PLASMUS_BACKGROUND;
        sceneLeftBufferX = 200;
        sceneRightBufferX = 160;
        this.platforms.append(list(point(-1200.0, -238.0), point(-835.0, -238.0)));
        this.platforms.append(list(point(-875.0, -87.0), point(-835.0, -87.0)));
        this.platforms.append(list(point(948.0, -148.0), point(985.0, -148.0)));
        this.platforms.append(list(point(1005.0, -238.0), point(1200.0, -238.0)));
        this.platforms.append(list(point(892.0, -283.0), point(932.0, -283.0)));
        this.ambientAudioID = g.main.audioMgr.playSound(g.assets.PLASMUS.SFX_PLASMUS_AMBIENTLOOPSCARIER, 100, g.SFX_EVENT_PRIORITY_UNINTERRUPTIBLE);
        break;
    }
    this.bgMember.regPoint = point(1200, 520);
    this.bgSprite = g.game.spriteMgr.grabSprite();
    this.bgSprite.member = this.bgMember;
    this.bgSprite.locZ = g.SPRITE_LOCZ_BACKGROUND;
    this.sceneOrigin = point(0, 0);
    this.sceneRect = this.bgMember.rect.sub(rect(this.bgMember.regPoint, this.bgMember.regPoint));
    this.sceneBoundsMinX = this.sceneRect.left + sceneLeftBufferX;
    this.sceneBoundsMaxX = this.sceneRect.right - sceneRightBufferX;
    this.stageRect = stageRect();
    // Integer division: the stage rect is integer.
    const halfViewWidth = idiv(this.stageRect.width, 2);
    const halfViewHeight = idiv(this.stageRect.height, 2);
    this.viewCenterMinX = this.sceneRect.left + halfViewWidth;
    this.viewCenterMaxX = this.sceneRect.right - halfViewWidth;
    this.viewCenterMinY = this.sceneRect.top + halfViewHeight;
    this.viewCenterMaxY = this.sceneRect.bottom - halfViewHeight;
    this.viewOriginRect = rect(-halfViewWidth, -halfViewHeight, halfViewWidth, halfViewHeight);
    this.viewRect = this.viewOriginRect;
    this.viewCenter = this.sceneOrigin;
    this.viewUpperLeft = point(this.viewRect.left, this.viewRect.top);
  }

  destroy(): undefined {
    g.game.spriteMgr.releaseSprite(this.bgSprite);
    if (this.ambientAudioID) g.main.audioMgr.fadeOutSound(this.ambientAudioID, 0, 0.75);
    return undefined;
  }

  onGround(pos: Point): number {
    for (const plat of this.platforms) {
      if (pos.locV === plat.get(1).locV) {
        if (pos.locH >= plat.get(1).locH && pos.locH <= plat.get(2).locH) return 1;
      }
    }
    return 0;
  }

  intersectsGround(origPos: Point, newPos: Point, retList: LList<number>): number {
    for (const plat of this.platforms) {
      if (g.util.getLineIntersection(origPos.locH, origPos.locV, newPos.locH, newPos.locV, plat.get(1).locH, plat.get(1).locV, plat.get(2).locH, plat.get(2).locV, retList)) {
        return 1;
      }
    }
    return 0;
  }

  update(): void {
    const playerPos = this.game.player.getPos().sub(point(0, 100));
    const enemyPos = this.game.enemy.getPos().sub(point(0, 100));
    const deltaX = playerPos.locH - enemyPos.locH;
    let weight = 1.0 - (abs(deltaX) - 300) / 600.0;
    if (weight < 0.0) weight = 0.0;
    else if (weight > 1.0) weight = 1.0;
    this.viewCenter = playerPos.add(enemyPos.mul(weight)).div(1.0 + weight);
    if (this.viewCenter.locH < this.viewCenterMinX) this.viewCenter.locH = this.viewCenterMinX;
    else if (this.viewCenter.locH > this.viewCenterMaxX) this.viewCenter.locH = this.viewCenterMaxX;
    if (this.viewCenter.locV < this.viewCenterMinY) this.viewCenter.locV = this.viewCenterMinY;
    else if (this.viewCenter.locV > this.viewCenterMaxY) this.viewCenter.locV = this.viewCenterMaxY;
    this.viewRect = this.viewOriginRect.add(rect(this.viewCenter, this.viewCenter));
    this.viewUpperLeft = point(this.viewRect.left, this.viewRect.top);
  }

  paint(): void {
    this.bgSprite.loc = this.scenePosToStagePos(this.sceneOrigin);
  }

  scenePosToStagePos(p: Point): Point {
    return p.sub(this.viewUpperLeft);
  }

  constrainToBounds(p: Point): Point {
    if (p.locH < this.sceneBoundsMinX) p.locH = this.sceneBoundsMinX;
    else if (p.locH > this.sceneBoundsMaxX) p.locH = this.sceneBoundsMaxX;
    return p;
  }

  getViewRect(): Rect {
    return this.viewRect;
  }

  getBoundsMaxX(): number {
    return this.sceneBoundsMaxX;
  }

  getBoundsMinX(): number {
    return this.sceneBoundsMinX;
  }
}
