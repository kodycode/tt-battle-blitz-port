import { g, point, rect, LList, list, voidp, objectp, integer, float, idiv, random, bitOr, bitAnd, bitNot, bitXor, lingoMe } from '../runtime';
import { Class_CollidableActor } from './Class_CollidableActor';

export class Class_Fighter extends Class_CollidableActor {
  FIGHTERSTATE_ALIVE: number;
  FIGHTERSTATE_FROZEN: number;
  FIGHTERSTATE_ON_GROUND: number;
  FIGHTERSTATE_DOING_MOVE: number;
  FIGHTERSTATE_PUPPET: number;
  FIGHTERSTATE_SHAKING: number;
  FIGHTERSTATE_HOVERING: number;
  FIGHTERSTATE_ENRAGED: number;
  FIGHTERSTATE_SHOWTRAILS: number;
  SHADOW_WIDTH: number;
  WALK_SPEED: number;
  HEALTH_MAX: number;
  HEALTH_ENRAGED_THRESHOLD: number;
  opponent: any;
  state: number;
  moves: LList<any>;
  moveRef: any;
  currMove: number;
  prevMove: number;
  nextMove: number;
  nextMoveArg: any;
  moveCount: number;
  health: number;
  naturalDefense: number;
  shadow: any;
  trails: any;

  constructor(initHealth: number) {
    super(point(0, 0), point(0, 0), 1);
    this.FIGHTERSTATE_ALIVE = 1;
    this.FIGHTERSTATE_FROZEN = 2;
    this.FIGHTERSTATE_ON_GROUND = 4;
    this.FIGHTERSTATE_DOING_MOVE = 8;
    this.FIGHTERSTATE_PUPPET = 16;
    this.FIGHTERSTATE_SHAKING = 32;
    this.FIGHTERSTATE_HOVERING = 64;
    this.FIGHTERSTATE_ENRAGED = 128;
    this.FIGHTERSTATE_SHOWTRAILS = 256;
    this.WALK_SPEED = 15.0;
    this.HEALTH_MAX = initHealth;
    this.HEALTH_ENRAGED_THRESHOLD = integer(this.HEALTH_MAX * 0.2);
    this.state = 0;
    this.setState(this.FIGHTERSTATE_ALIVE);
    this.setState(this.FIGHTERSTATE_ON_GROUND);
    this.moves = g.util.newArray(g.MOVE_COUNT_MAX, undefined);
    this.currMove = 0;
    this.prevMove = 0;
    this.nextMove = 0;
    this.nextMoveArg = 0;
    this.moveRef = undefined;
    this.moveCount = 0;
    this.health = this.HEALTH_MAX;
    this.naturalDefense = 0;
    this.visSprite = g.game.spriteMgr.grabSprite();
    this.visSprite.locZ = g.SPRITE_LOCZ_TITAN_FIGHTER;
    this.visSprite.ink = g.INK_BGTRANSPARENT;
    this.shadow = new g.classes.Class_Shadow(this, 100);
    this.trails = new g.classes.Class_ActorTrails(4, g.SPRITE_LOCZ_TITAN_FIGHTER_BG);
  }

  destroy(): undefined {
    super.destroy();
    if (objectp(this.trails)) this.trails.destroy();
    if (objectp(this.shadow)) this.shadow.destroy();
    for (const o of this.moves) {
      if (objectp(o)) o.destroy();
    }
    g.game.spriteMgr.releaseSprite(this.visSprite);
    return undefined;
  }

  setOpponent(obj: any): void {
    this.opponent = obj;
  }

  isBlocking(): boolean {
    return this.currMove === g.MOVE_BLOCK;
  }

  setDoingMove(b: any): void {
    if (b) this.setState(this.FIGHTERSTATE_DOING_MOVE);
    else this.clearState(this.FIGHTERSTATE_DOING_MOVE);
  }
  isDoingMove(): boolean {
    return this.hasState(this.FIGHTERSTATE_DOING_MOVE);
  }
  setOnGround(b: any): void {
    if (b) this.setState(this.FIGHTERSTATE_ON_GROUND);
    else this.clearState(this.FIGHTERSTATE_ON_GROUND);
  }
  isOnGround(): boolean {
    return this.hasState(this.FIGHTERSTATE_ON_GROUND);
  }
  setAlive(b: any): void {
    if (b) this.setState(this.FIGHTERSTATE_ALIVE);
    else this.clearState(this.FIGHTERSTATE_ALIVE);
  }
  isAlive(): boolean {
    return this.hasState(this.FIGHTERSTATE_ALIVE);
  }
  setFrozen(b: any): void {
    if (b) this.setState(this.FIGHTERSTATE_FROZEN);
    else this.clearState(this.FIGHTERSTATE_FROZEN);
  }
  isFrozen(): boolean {
    return this.hasState(this.FIGHTERSTATE_FROZEN);
  }
  isPuppet(): boolean {
    return this.hasState(this.FIGHTERSTATE_PUPPET);
  }
  setPuppet(b: any): void {
    if (b) this.setState(this.FIGHTERSTATE_PUPPET);
    else this.clearState(this.FIGHTERSTATE_PUPPET);
  }
  isShaking(): boolean {
    return this.hasState(this.FIGHTERSTATE_SHAKING);
  }
  setShaking(b: any): void {
    if (b) this.setState(this.FIGHTERSTATE_SHAKING);
    else this.clearState(this.FIGHTERSTATE_SHAKING);
  }
  isHovering(): boolean {
    return this.hasState(this.FIGHTERSTATE_HOVERING);
  }
  setHovering(b: any): void {
    if (b) this.setState(this.FIGHTERSTATE_HOVERING);
    else this.clearState(this.FIGHTERSTATE_HOVERING);
  }
  isEnraged(): boolean {
    return this.hasState(this.FIGHTERSTATE_ENRAGED);
  }
  setEnraged(b: any): void {
    if (b) this.setState(this.FIGHTERSTATE_ENRAGED);
    else this.clearState(this.FIGHTERSTATE_ENRAGED);
  }
  isShowingTrails(): boolean {
    return this.hasState(this.FIGHTERSTATE_SHOWTRAILS);
  }
  setShowingTrails(b: any): void {
    if (b) this.setState(this.FIGHTERSTATE_SHOWTRAILS);
    else this.clearState(this.FIGHTERSTATE_SHOWTRAILS);
  }

  resetTrails(): void {
    this.trails.reset();
  }

  getHealth(): number {
    return this.health;
  }
  getMove(): any {
    return this.moveRef;
  }
  getMoveID(): number {
    return this.currMove;
  }
  getPrevMoveID(): number {
    return this.prevMove;
  }
  getMoveNumber(): number {
    return this.moveCount;
  }

  setMove(newMove: number, arg?: any): void {
    const me = lingoMe(this, Class_Fighter, 'setMove');
    if (this.currMove === newMove) return;
    this.prevMove = this.currMove;
    this.currMove = newMove;
    if (!voidp(this.moveRef)) this.moveRef.stop();
    this.moveRef = this.moves.get(this.currMove);
    this.moveRef.reset(arg);
    if (this.moveRef.isInitOwnerDir()) me.updateFacingDir();
    if (this.moveRef.isInterruptible()) me.setDoingMove(0);
    else me.setDoingMove(1);
    this.contactTable.reset();
    this.animation = this.moveRef.animation;
    this.moveCount = this.moveCount + 1;
  }

  queueMove(newMove: number, arg?: any): void {
    if (newMove === this.currMove) return;
    if (this.nextMove) {
      if (g.MOVE_PRIORITIES.get(newMove) <= g.MOVE_PRIORITIES.get(this.nextMove)) return;
    }
    this.nextMove = newMove;
    this.nextMoveArg = arg;
  }

  queueDefaultMove(): void {
    const me = lingoMe(this, Class_Fighter, 'queueDefaultMove');
    if (me.isOnGround()) me.queueMove(g.MOVE_STAND, 0);
    else me.queueMove(g.MOVE_FALL, 0);
  }

  updateFacingDir(): void {
    const oldDir = this.dir;
    if (this.getPosX() <= this.opponent.getPosX()) this.dir = 1;
    else this.dir = -1;
    if (oldDir !== this.dir) this.moveRef.dirChanged();
  }

  updateAttackBoundingBox(): void {
    let r = this.moveRef.getAttackRect();
    if (this.dir < 0) r = rect(-r.right, r.top, -r.left, r.bottom);
    // Director's rect.offset(h, v) coerces h and v to integers (round half away from zero) before adding:
    // checked against the original's fighter locs during overlap pushes (fighter_jinx 682, fighter_gizmo 678).
    this.attBox = r.offset(integer(this.getPosX()), integer(this.getPosY()));
  }

  updateDefenseBoundingBox(): void {
    let r = this.moveRef.getDefenseRect();
    if (this.dir < 0) r = rect(-r.right, r.top, -r.left, r.bottom);
    // integer() args: see updateAttackBoundingBox.
    this.defBox = r.offset(integer(this.getPosX()), integer(this.getPosY()));
  }

  updateSprites(): void {
    this.visSprite.member = this.moveRef.getVisibleMember();
    this.visSprite.flipH = bitXor(this.dir === -1, this.moveRef.getFlipX()) !== 0;
  }

  reset(): void {
    const me = lingoMe(this, Class_Fighter, 'reset');
    this.state = 0;
    me.setState(this.FIGHTERSTATE_ALIVE);
    me.setState(this.FIGHTERSTATE_ON_GROUND);
    this.currMove = 0;
    this.prevMove = 0;
    this.nextMove = 0;
    this.nextMoveArg = 0;
    this.moveRef = undefined;
    this.health = this.HEALTH_MAX;
    me.setMove(g.MOVE_STAND);
  }

  update(): void {
    const me = lingoMe(this, Class_Fighter, 'update');
    if (me.isAlive()) {
      if (this.health < this.HEALTH_ENRAGED_THRESHOLD) me.setEnraged(1);
      if (!me.isFrozen()) {
        if (me.isShowingTrails()) this.trails.update(this);
        else this.trails.update(undefined);
        if (me.isOnGround()) {
          if (!me.groundCheck()) me.queueMove(g.MOVE_FALL, 0);
        }
        if (!me.isDoingMove()) me.updateFacingDir();
        if (this.nextMove) {
          if (!me.isPuppet()) {
            me.setMove(this.nextMove, this.nextMoveArg);
            this.nextMove = 0;
            this.nextMoveArg = 0;
          }
        }
        if (this.currMove) {
          this.moveRef.update();
          me.updateSprites();
          const newPos = g.main.screen.scene.constrainToBounds(this.pos.add(this.vel.mul(g.gameSpeed)));
          me.setPos(newPos);
          me.updateBoundingBoxes();
          if (this.moveRef.isDone()) me.queueDefaultMove();
        }
      }
    }
    this.shadow.update();
  }

  paint(): void {
    const me = lingoMe(this, Class_Fighter, 'paint');
    let p = g.screen.scene.scenePosToStagePos(this.pos);
    if (me.isShaking()) p = p.add(point(random(7) - 4, random(7) - 4));
    if (me.isHovering()) {
      const HOVER_PERIOD = 20;
      const HOVER_VERT_OFFSETS = list(0, 3, 5, 6, 6, 5, 3, 0, -3, -5, -6, -6, -5, -3);
      const i = idiv(HOVER_PERIOD * (this.moveRef.age % HOVER_PERIOD), idiv(HOVER_PERIOD * HOVER_PERIOD, HOVER_VERT_OFFSETS.count)) + 1;
      p = p.add(point(0, HOVER_VERT_OFFSETS.get(i)));
    }
    this.visSprite.loc = p;
    this.shadow.paint();
    this.trails.paint();
  }

  setState(attrib: number): void {
    this.state = bitOr(this.state, attrib);
  }
  clearState(attrib: number): void {
    this.state = bitAnd(this.state, bitNot(attrib));
  }
  resetState(_attrib?: number): void {
    this.state = 0;
  }
  hasState(attrib: number): boolean {
    return bitAnd(this.state, attrib) !== 0;
  }

  processCollisions(): void {
    const me = lingoMe(this, Class_Fighter, 'processCollisions');
    for (let i = 1; i <= this.collisions.count; i++) {
      const target = this.collisions.get(i);
      if (target === this.opponent) {
        if (!this.contactTable.hasObject(target)) {
          if (target.moveRef.isVulnerable()) {
            const damage = target.reactToCollision(this.moveRef.attackDamage, this.moveRef.stunDuration);
            const notBlocked = this.moveRef.opponentHit();
            if (notBlocked) me.awardPoints(damage);
            else me.awardPoints(0);
          }
        }
      }
      this.contactTable.addObject(target);
    }
    me.resetCollisions();
  }

  reactToCollision(damage: number, stunDuration?: number): number {
    const me = lingoMe(this, Class_Fighter, 'reactToCollision');
    if (voidp(stunDuration)) stunDuration = g.STUN_DURATION_DEFAULT;
    // Integer arithmetic in Lingo (all operands are integers).
    const actualDamage = idiv(damage * (100 - this.naturalDefense) * (100 - this.moveRef.defenseRating), 10000);
    this.health = this.health - actualDamage;
    if (this.health <= 0) {
      this.health = 0;
      me.queueDefeat(stunDuration);
    } else if (actualDamage >= g.DAMAGE_KNOCK_DOWN_THRESHOLD) {
      me.queueKnockDown(stunDuration);
    } else if (this.currMove === g.MOVE_BLOCK) {
      // blocked: no reaction
    } else if (me.hasState(this.FIGHTERSTATE_ON_GROUND)) {
      me.queueStun(stunDuration);
    } else {
      me.queueKnockDown(stunDuration);
    }
    return actualDamage;
  }

  queueStun(dur: any): void {
    this.queueMove(g.MOVE_STUN, dur);
  }
  queueKnockDown(dur: any): void {
    this.queueMove(g.MOVE_KNOCK_DOWN, dur);
  }
  queueDefeat(dur: any): void {
    this.queueMove(g.MOVE_DEFEAT, dur);
  }

  getHealthScalar(): number {
    return float(this.health) / float(this.HEALTH_MAX);
  }

  fallCheck(): number {
    const modifiedCoords = list(0, 0);
    if (g.game.scene.intersectsGround(this.getPos(), this.getPos().add(this.getVel()), modifiedCoords)) {
      this.setPosX(modifiedCoords.get(1));
      this.setPosY(modifiedCoords.get(2));
      this.setVelY(0.0);
      return 1;
    }
    return 0;
  }

  groundCheck(pos?: any): number {
    if (voidp(pos)) return g.game.scene.onGround(this.getPos());
    return g.game.scene.onGround(pos);
  }

  awardPoints(points: number): void {
    g.game.awardPoints(this, points);
  }
}
