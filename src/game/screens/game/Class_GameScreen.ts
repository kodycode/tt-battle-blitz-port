import { g, point, list, LList, label, marker, theFrame, random, integer, b2i } from '../../../runtime';
import { Class_Screen } from '../Class_Screen';

// The fight screen. Score layout (labels): SCREEN_GAME (round intro), SCREEN_GAME_PLAY, SCREEN_GAME_KO,
// SCREEN_GAME_TIMEUP, SCREEN_GAME_WIN, SCREEN_GAME_SCORE. setStage() queues a jump to the stage's label via
// g.goFrame (Class_Main.branch does the go() on exitFrame); timed stages end on the last frame before the next
// label (`the frame = marker(1) - 1`).
export class Class_GameScreen extends Class_Screen {
  GAMESTAGE_INTRO: number;
  GAMESTAGE_PLAY: number;
  GAMESTAGE_KO: number;
  GAMESTAGE_TIMEUP: number;
  GAMESTAGE_WIN: number;
  GAMESTAGE_SCORE: number;
  ROUNDSTATE_FIGHT_IN_PROGRESS: number;
  ROUNDSTATE_TITAN_WINS_BY_DAMAGE: number;
  ROUNDSTATE_VILLAIN_WINS_BY_DAMAGE: number;
  ROUNDSTATE_TITAN_WINS_BY_TIME: number;
  ROUNDSTATE_VILLAIN_WINS_BY_TIME: number;
  SCORECHAIN_MAX_HIT_INTERVAL: number;
  spriteMgr: any;
  titan: any;
  villain: any;
  player: any;
  enemy: any;
  playerAdapter: any;
  enemyAdapter: any;
  collisionGroup: any;
  projectileGroup: any;
  effectGroup: any;
  scene: any;
  hud: any;
  clock: any;
  controlsPopup: any;
  gameStage: number;
  initStage: number;
  roundState: number;
  roundNum: number;
  playerWins: number;
  enemyWins: number;
  matchScore: number;
  delayFrames: number;
  cheat_toggleFPS: any;
  cheat_toggleAI: any;
  cheat_reduceTitanHealth: any;
  cheat_reduceVillainHealth: any;
  cheat_invulnerability: any;
  paused: number;
  playerCanSummon: LList<any>;
  prevHitTimestamp: number;
  hitChainMultiplier: number;
  musicEventID: any;

  constructor() {
    super();
    g.game = this;
    this.GAMESTAGE_INTRO = 1;
    this.GAMESTAGE_PLAY = 2;
    this.GAMESTAGE_KO = 3;
    this.GAMESTAGE_TIMEUP = 4;
    this.GAMESTAGE_WIN = 5;
    this.GAMESTAGE_SCORE = 6;
    this.ROUNDSTATE_FIGHT_IN_PROGRESS = 0;
    this.ROUNDSTATE_TITAN_WINS_BY_DAMAGE = 1;
    this.ROUNDSTATE_VILLAIN_WINS_BY_DAMAGE = 2;
    this.ROUNDSTATE_TITAN_WINS_BY_TIME = 3;
    this.ROUNDSTATE_VILLAIN_WINS_BY_TIME = 4;
    this.SCORECHAIN_MAX_HIT_INTERVAL = 1000;
    this.cheat_toggleFPS = new g.classes.Class_KeyCombo(list(g.KEYCODE_S, g.KEYCODE_H, g.KEYCODE_O, g.KEYCODE_W, g.KEYCODE_F, g.KEYCODE_P, g.KEYCODE_S));
    this.cheat_toggleAI = new g.classes.Class_KeyCombo(list(g.KEYCODE_S, g.KEYCODE_T, g.KEYCODE_A, g.KEYCODE_N, g.KEYCODE_D, g.KEYCODE_S, g.KEYCODE_T, g.KEYCODE_I, g.KEYCODE_L, g.KEYCODE_L));
    this.cheat_reduceVillainHealth = new g.classes.Class_KeyCombo(list(g.KEYCODE_G, g.KEYCODE_O, g.KEYCODE_T, g.KEYCODE_I, g.KEYCODE_T, g.KEYCODE_A, g.KEYCODE_N, g.KEYCODE_S));
    this.cheat_reduceTitanHealth = new g.classes.Class_KeyCombo(list(g.KEYCODE_G, g.KEYCODE_O, g.KEYCODE_V, g.KEYCODE_I, g.KEYCODE_L, g.KEYCODE_L, g.KEYCODE_A, g.KEYCODE_I, g.KEYCODE_N, g.KEYCODE_S));
    this.cheat_invulnerability = new g.classes.Class_KeyCombo(list(g.KEYCODE_T, g.KEYCODE_H, g.KEYCODE_E, g.KEYCODE_R, g.KEYCODE_E, g.KEYCODE_C, g.KEYCODE_A, g.KEYCODE_N, g.KEYCODE_B, g.KEYCODE_E, g.KEYCODE_O, g.KEYCODE_N, g.KEYCODE_L, g.KEYCODE_Y, g.KEYCODE_O, g.KEYCODE_N, g.KEYCODE_E));
  }

  destroy(): undefined {
    if (this.loaded) this.unload();
    super.destroy();
    g.game = undefined;
    return undefined;
  }

  load(): void {
    this.loaded = 1;
    g.assets.CHAR_SHARED.precache();
    g.assets.GAME_MESSAGES.precache();
    this.spriteMgr = new g.classes.Class_SpriteManager(g.SPRITE_POOL_CHANNEL_MIN, g.SPRITE_POOL_CHANNEL_MAX);
    this.collisionGroup = new g.classes.Class_ObjectGroup();
    this.projectileGroup = new g.classes.Class_ObjectGroup();
    this.effectGroup = new g.classes.Class_ObjectGroup();
    const playerInitHealth = g.PLAYER_HEALTH_DEFAULT;
    let enemyInitHealth: number;
    if (g.playMode === g.PLAYMODE_AS_TITANS) {
      enemyInitHealth = g.VILLAIN_HEALTH_DEFAULTS.get(g.difficulty).get(g.villainID);
    } else {
      enemyInitHealth = g.TITAN_HEALTH_DEFAULTS.get(g.difficulty).get(g.titanID);
    }
    this.playerCanSummon = g.util.newArray(g.FIGHTER_COUNT, 0);
    if (g.playMode === g.PLAYMODE_AS_TITANS) {
      for (let i = 1; i <= g.TITAN_FIGHTER_ORDER.count; i++) {
        this.playerCanSummon.set(g.TITAN_FIGHTER_ORDER.get(i), b2i(g.TITAN_FIGHTER_ORDER.get(i) !== g.titanID));
      }
    }
    switch (g.playerID) {
      case g.FIGHTER_ID_ROBIN:
        g.assets.ROBIN.precache();
        this.player = new g.classes.Class_Robin(playerInitHealth);
        this.playerAdapter = new g.classes.Class_RobinKeyAdapter(this.player);
        break;
      case g.FIGHTER_ID_RAVEN:
        g.assets.RAVEN.precache();
        this.player = new g.classes.Class_Raven(playerInitHealth);
        this.playerAdapter = new g.classes.Class_RavenKeyAdapter(this.player);
        break;
      case g.FIGHTER_ID_CYBORG:
        g.assets.CYBORG.precache();
        this.player = new g.classes.Class_Cyborg(playerInitHealth);
        this.playerAdapter = new g.classes.Class_CyborgKeyAdapter(this.player);
        break;
      case g.FIGHTER_ID_STARFIRE:
        g.assets.STARFIRE.precache();
        this.player = new g.classes.Class_Starfire(playerInitHealth);
        this.playerAdapter = new g.classes.Class_StarfireKeyAdapter(this.player);
        break;
      case g.FIGHTER_ID_BEASTBOY:
        g.assets.BEASTBOY.precache();
        this.player = new g.classes.Class_Beastboy(playerInitHealth);
        this.playerAdapter = new g.classes.Class_BeastboyKeyAdapter(this.player);
        break;
      case g.FIGHTER_ID_JINX:
        g.assets.JINX.precache();
        this.player = new g.classes.Class_Jinx(playerInitHealth);
        this.playerAdapter = new g.classes.Class_JinxKeyAdapter(this.player);
        break;
      case g.FIGHTER_ID_MAMMOTH:
        g.assets.MAMMOTH.precache();
        this.player = new g.classes.Class_Mammoth(playerInitHealth);
        this.playerAdapter = new g.classes.Class_MammothKeyAdapter(this.player);
        break;
      case g.FIGHTER_ID_GIZMO:
        g.assets.GIZMO.precache();
        this.player = new g.classes.Class_Gizmo(playerInitHealth);
        this.playerAdapter = new g.classes.Class_GizmoKeyAdapter(this.player);
        break;
      case g.FIGHTER_ID_CINDERBLOCK:
        g.assets.CINDERBLOCK.precache();
        this.player = new g.classes.Class_Cinderblock(playerInitHealth);
        this.playerAdapter = new g.classes.Class_CinderblockKeyAdapter(this.player);
        break;
      case g.FIGHTER_ID_PLASMUS:
        g.assets.PLASMUS.precache();
        this.player = new g.classes.Class_Plasmus(playerInitHealth);
        this.playerAdapter = new g.classes.Class_PlasmusKeyAdapter(this.player);
        break;
    }
    g.main.keyMgr.addListener(this.playerAdapter);
    switch (g.enemyID) {
      case g.FIGHTER_ID_ROBIN:
        g.assets.ROBIN.precache();
        this.enemy = new g.classes.Class_Robin(enemyInitHealth);
        this.enemyAdapter = new g.classes.Class_RobinAI(this.enemy);
        break;
      case g.FIGHTER_ID_RAVEN:
        g.assets.RAVEN.precache();
        this.enemy = new g.classes.Class_Raven(enemyInitHealth);
        this.enemyAdapter = new g.classes.Class_RavenAI(this.enemy);
        break;
      case g.FIGHTER_ID_CYBORG:
        g.assets.CYBORG.precache();
        this.enemy = new g.classes.Class_Cyborg(enemyInitHealth);
        this.enemyAdapter = new g.classes.Class_CyborgAI(this.enemy);
        break;
      case g.FIGHTER_ID_STARFIRE:
        // ORIGINAL BUG: precaches Beastboy's assets for an enemy Starfire (precache is a no-op in the port).
        g.assets.BEASTBOY.precache();
        this.enemy = new g.classes.Class_Starfire(enemyInitHealth);
        this.enemyAdapter = new g.classes.Class_StarfireAI(this.enemy);
        break;
      case g.FIGHTER_ID_BEASTBOY:
        g.assets.BEASTBOY.precache();
        this.enemy = new g.classes.Class_Beastboy(enemyInitHealth);
        this.enemyAdapter = new g.classes.Class_BeastboyAI(this.enemy);
        break;
      case g.FIGHTER_ID_JINX:
        g.assets.JINX.precache();
        this.enemy = new g.classes.Class_Jinx(enemyInitHealth);
        this.enemyAdapter = new g.classes.Class_JinxAI(this.enemy);
        break;
      case g.FIGHTER_ID_MAMMOTH:
        g.assets.MAMMOTH.precache();
        this.enemy = new g.classes.Class_Mammoth(enemyInitHealth);
        this.enemyAdapter = new g.classes.Class_MammothAI(this.enemy);
        break;
      case g.FIGHTER_ID_GIZMO:
        g.assets.GIZMO.precache();
        this.enemy = new g.classes.Class_Gizmo(enemyInitHealth);
        this.enemyAdapter = new g.classes.Class_GizmoAI(this.enemy);
        break;
      case g.FIGHTER_ID_CINDERBLOCK:
        g.assets.CINDERBLOCK.precache();
        this.enemy = new g.classes.Class_Cinderblock(enemyInitHealth);
        this.enemyAdapter = new g.classes.Class_CinderblockAI(this.enemy);
        break;
      case g.FIGHTER_ID_PLASMUS:
        g.assets.PLASMUS.precache();
        this.enemy = new g.classes.Class_Plasmus(enemyInitHealth);
        this.enemyAdapter = new g.classes.Class_PlasmusAI(this.enemy);
        break;
    }
    this.player.setOpponent(this.enemy);
    this.enemy.setOpponent(this.player);
    this.collisionGroup.addToGroup(this.player);
    this.collisionGroup.addToGroup(this.enemy);
    if (g.playMode === g.PLAYMODE_AS_TITANS) {
      this.titan = this.player;
      this.villain = this.enemy;
    } else {
      this.titan = this.enemy;
      this.villain = this.player;
    }
    this.scene = new g.classes.Class_Scene(this);
    this.hud = new g.classes.Class_HUD(this);
    g.main.keyMgr.addListener(this);
    this.clock = new g.classes.Class_GameTimer(g.ROUND_DURATION);
    this.controlsPopup = new g.classes.Class_ControlsPopUp();
    this.gameStage = 1;
    this.initStage = 1;
    g.gameSpeed = 1.0;
    this.roundNum = 0;
    this.playerWins = 0;
    this.enemyWins = 0;
    this.matchScore = 0;
    this.prevHitTimestamp = 0;
    this.hitChainMultiplier = 1;
    this.delayFrames = 0;
    this.paused = 0;
  }

  unload(): void {
    this.loaded = 0;
    g.main.keyMgr.removeListener(this);
    g.main.keyMgr.removeListener(this.playerAdapter);
    this.controlsPopup = this.controlsPopup.destroy();
    this.clock = this.clock.destroy();
    this.hud = this.hud.destroy();
    this.playerAdapter = this.playerAdapter.destroy();
    this.enemyAdapter = this.enemyAdapter.destroy();
    this.enemy = this.enemy.destroy();
    this.player = this.player.destroy();
    this.titan = undefined;
    this.villain = undefined;
    this.effectGroup = this.effectGroup.destroy();
    this.projectileGroup = this.projectileGroup.destroy();
    this.collisionGroup = this.collisionGroup.destroy();
    this.scene = this.scene.destroy();
    this.spriteMgr = this.spriteMgr.destroy();
    g.main.audioMgr.fadeOutSound(this.musicEventID, 0, 0.75);
  }

  checkFighterOverlap(): void {
    const fighter1 = this.player;
    const fighter2 = this.enemy;
    const fighterX1: number = fighter1.getPosX();
    const fighterX2: number = fighter2.getPosX();
    const fighterDefBox1 = fighter1.getDefenseBox();
    const fighterDefBox2 = fighter2.getDefenseBox();
    if (!fighterDefBox1.intersect(fighterDefBox2).isZero()) {
      let dX: number;
      if (!fighter1.isDoingMove() && !fighter2.isDoingMove()) {
        if (fighterX2 - fighterX1 > 0.0) {
          dX = (fighterDefBox1.right - fighterDefBox2.left) / 2.0;
        } else {
          dX = -(fighterDefBox2.right - fighterDefBox1.left) / 2.0;
        }
        fighter1.setPosX(fighterX1 - dX);
        fighter2.setPosX(fighterX2 + dX);
      } else {
        let corrFactor1: number;
        if (fighter1.moveRef.isImmobile()) {
          corrFactor1 = 0.0;
        } else if (fighter2.moveRef.isImmobile()) {
          corrFactor1 = 1.0;
        } else {
          corrFactor1 = 0.5;
        }
        const corrFactor2 = 1.0 - corrFactor1;
        const diffX = fighterX2 - fighterX1;
        if (diffX > 0.0) {
          dX = (fighterDefBox1.right - fighterDefBox2.left) / 2.0;
        } else if (diffX < 0.0) {
          dX = -(fighterDefBox2.right - fighterDefBox1.left) / 2.0;
        } else if (fighter1.getDir() > fighter2.getDir()) {
          dX = (fighterDefBox1.right - fighterDefBox2.left) / 2.0;
        } else {
          dX = -(fighterDefBox2.right - fighterDefBox1.left) / 2.0;
        }
        fighter1.setPosX(fighterX1 - dX * corrFactor1);
        // ORIGINAL BUG: fighter2 is corrected by corrFactor1, not corrFactor2 (computed above but unused).
        fighter2.setPosX(fighterX2 + dX * corrFactor1);
      }
      fighter1.updateBoundingBoxes();
      fighter2.updateBoundingBoxes();
    }
  }

  updateCollisions(): void {
    const count = this.collisionGroup.getCount();
    for (let i = 1; i <= count; i++) {
      for (let j = 1; j <= count; j++) {
        if (i !== j) {
          const sourceObj = this.collisionGroup.getIndex(i);
          const targetObj = this.collisionGroup.getIndex(j);
          if (sourceObj.collidesWith(targetObj)) sourceObj.registerCollision(targetObj);
        }
      }
    }
    for (const o of this.collisionGroup.getList()) o.processCollisions();
  }

  updateProjectiles(): void {
    const killList = new LList<any>();
    // The loop bound is re-read every iteration, as in the Lingo bytecode.
    for (let i = 1; i <= this.projectileGroup.getCount(); i++) {
      const o = this.projectileGroup.getIndex(i);
      if (o.isAlive()) {
        if (!o.isFrozen()) o.update();
        continue;
      }
      killList.append(o);
    }
    for (const o of killList) this.killProjectile(o);
  }

  updateEffects(): void {
    const killList = new LList<any>();
    // The loop bound is re-read every iteration, as in the Lingo bytecode.
    for (let i = 1; i <= this.effectGroup.getCount(); i++) {
      const o = this.effectGroup.getIndex(i);
      if (o.isAlive()) {
        if (!o.isFrozen()) o.update();
        continue;
      }
      killList.append(o);
    }
    for (const o of killList) this.killEffect(o);
  }

  setPause(b: number): void {
    this.paused = b;
  }

  setStage(i: number): void {
    switch (i) {
      case this.GAMESTAGE_INTRO:
        g.goFrame = label('SCREEN_GAME');
        break;
      case this.GAMESTAGE_PLAY:
        g.goFrame = label('SCREEN_GAME_PLAY');
        break;
      case this.GAMESTAGE_KO:
        g.goFrame = label('SCREEN_GAME_KO');
        break;
      case this.GAMESTAGE_TIMEUP:
        g.goFrame = label('SCREEN_GAME_TIMEUP');
        break;
      case this.GAMESTAGE_WIN:
        g.goFrame = label('SCREEN_GAME_WIN');
        break;
      case this.GAMESTAGE_SCORE:
        g.goFrame = label('SCREEN_GAME_SCORE');
        break;
    }
    this.gameStage = i;
    this.initStage = 1;
  }

  advanceStage(): void {
    this.setStage(this.gameStage + 1);
  }

  update(): void {
    // Lingo compares the popup's visible flag (whatever was passed to setVisible) with paused as 1/0 values.
    if (b2i(this.controlsPopup.isVisible()) !== b2i(this.paused)) this.controlsPopup.setVisible(this.paused);
    switch (this.gameStage) {
      case this.GAMESTAGE_INTRO:
        if (this.initStage) {
          this.initStage = 0;
          this.titan.setPos(-150, 0);
          this.villain.setPos(150, 0);
          this.clock.reset();
          this.player.reset();
          this.enemy.reset();
          this.hud.reset();
          this.playerAdapter.reset();
          this.enemyAdapter.reset();
          this.roundNum = this.roundNum + 1;
          this.roundState = this.ROUNDSTATE_FIGHT_IN_PROGRESS;
          this.paused = 0;
          this.controlsPopup.setVisible(this.paused);
          this.playerAdapter.setEnabled(0);
          this.enemyAdapter.setEnabled(0);
        }
        this.player.update();
        this.enemy.update();
        this.scene.update();
        this.hud.update();
        if (theFrame() === marker(1) - 1) this.advanceStage();
        break;
      case this.GAMESTAGE_PLAY:
        if (this.initStage) {
          this.initStage = 0;
          this.playerAdapter.setEnabled(1);
          this.enemyAdapter.setEnabled(1);
          if (this.roundNum === 1) {
            switch (random(4)) {
              case 1:
                this.musicEventID = g.main.audioMgr.playSound(g.assets.AUDIO.MUSIC_LOOP2, 50, g.SFX_EVENT_PRIORITY_UNINTERRUPTIBLE);
                break;
              case 2:
                this.musicEventID = g.main.audioMgr.playSound(g.assets.AUDIO.MUSIC_LOOP3, 50, g.SFX_EVENT_PRIORITY_UNINTERRUPTIBLE);
                break;
              case 3:
                this.musicEventID = g.main.audioMgr.playSound(g.assets.AUDIO.MUSIC_LOOP4, 50, g.SFX_EVENT_PRIORITY_UNINTERRUPTIBLE);
                break;
              case 4:
                this.musicEventID = g.main.audioMgr.playSound(g.assets.AUDIO.MUSIC_LOOP5, 50, g.SFX_EVENT_PRIORITY_UNINTERRUPTIBLE);
                break;
            }
          }
        }
        if (!this.paused) {
          const prevTime = this.clock.getTime();
          this.clock.update();
          const currTime = this.clock.getTime();
          this.playerAdapter.update();
          this.enemyAdapter.update();
          this.player.update();
          this.enemy.update();
          this.updateProjectiles();
          this.checkFighterOverlap();
          this.updateCollisions();
          this.updateEffects();
          this.scene.update();
          this.hud.update();
          if (this.enemy.getHealth() === 0) {
            this.playerWins = this.playerWins + 1;
            if (g.playMode === g.PLAYMODE_AS_TITANS) {
              this.hud.setTitanWins(this.playerWins);
              this.roundState = this.ROUNDSTATE_TITAN_WINS_BY_DAMAGE;
            } else {
              this.hud.setVillainWins(this.playerWins);
              this.roundState = this.ROUNDSTATE_VILLAIN_WINS_BY_DAMAGE;
            }
            if (this.playerWins === 2) this.setStage(this.GAMESTAGE_KO);
            else this.setStage(this.GAMESTAGE_WIN);
          } else if (this.player.getHealth() === 0) {
            this.enemyWins = this.enemyWins + 1;
            if (g.playMode === g.PLAYMODE_AS_TITANS) {
              this.hud.setVillainWins(this.enemyWins);
              this.roundState = this.ROUNDSTATE_VILLAIN_WINS_BY_DAMAGE;
            } else {
              this.hud.setTitanWins(this.enemyWins);
              this.roundState = this.ROUNDSTATE_TITAN_WINS_BY_DAMAGE;
            }
            if (this.enemyWins === 2) this.setStage(this.GAMESTAGE_KO);
            else this.setStage(this.GAMESTAGE_WIN);
          } else if (currTime <= 10) {
            if (prevTime !== currTime) {
              g.main.audioMgr.playSound(g.assets.AUDIO.SFX_TIME_WARNING, 75, g.SFX_EVENT_PRIORITY_LOW);
            }
            if (currTime === 0) {
              if (this.player.getHealthScalar() > this.enemy.getHealthScalar()) {
                this.playerWins = this.playerWins + 1;
                if (g.playMode === g.PLAYMODE_AS_TITANS) {
                  this.hud.setTitanWins(this.playerWins);
                  this.roundState = this.ROUNDSTATE_TITAN_WINS_BY_TIME;
                } else {
                  this.hud.setVillainWins(this.playerWins);
                  this.roundState = this.ROUNDSTATE_VILLAIN_WINS_BY_TIME;
                }
                this.setStage(this.GAMESTAGE_TIMEUP);
              } else {
                this.enemyWins = this.enemyWins + 1;
                if (g.playMode === g.PLAYMODE_AS_TITANS) {
                  this.hud.setVillainWins(this.enemyWins);
                  this.roundState = this.ROUNDSTATE_VILLAIN_WINS_BY_TIME;
                } else {
                  this.hud.setTitanWins(this.enemyWins);
                  this.roundState = this.ROUNDSTATE_TITAN_WINS_BY_TIME;
                }
                this.setStage(this.GAMESTAGE_TIMEUP);
              }
            }
          }
        }
        break;
      case this.GAMESTAGE_KO:
        if (this.initStage) {
          this.initStage = 0;
          g.gameSpeed = 0.4;
          g.main.audioMgr.stopSound(g.assets.AUDIO.MUSIC_LOOP2);
          g.main.audioMgr.stopSound(g.assets.AUDIO.MUSIC_LOOP3);
          g.main.audioMgr.stopSound(g.assets.AUDIO.MUSIC_LOOP4);
          g.main.audioMgr.stopSound(g.assets.AUDIO.MUSIC_LOOP5);
          if (this.roundState === this.ROUNDSTATE_TITAN_WINS_BY_DAMAGE || this.roundState === this.ROUNDSTATE_TITAN_WINS_BY_TIME) {
            this.musicEventID = g.main.audioMgr.playSound(g.assets.AUDIO.MUSIC_TEEN_LOOP, 70, g.SFX_EVENT_PRIORITY_LOW);
          } else {
            this.musicEventID = g.main.audioMgr.playSound(g.assets.AUDIO.MUSIC_KEYBOARD_LOOP, 50, g.SFX_EVENT_PRIORITY_LOW);
          }
          this.playerAdapter.setEnabled(0);
          this.enemyAdapter.setEnabled(0);
        }
        this.player.update();
        this.enemy.update();
        this.updateProjectiles();
        this.checkFighterOverlap();
        this.updateEffects();
        this.scene.update();
        this.hud.update();
        if (theFrame() === marker(1) - 1) {
          if (!this.player.isAlive() || !this.enemy.isAlive()) this.setStage(this.GAMESTAGE_WIN);
        }
        break;
      case this.GAMESTAGE_TIMEUP:
        if (this.initStage) {
          this.initStage = 0;
          this.playerAdapter.setEnabled(0);
          this.enemyAdapter.setEnabled(0);
        }
        this.player.update();
        this.enemy.update();
        this.updateProjectiles();
        this.checkFighterOverlap();
        this.updateEffects();
        this.scene.update();
        this.hud.update();
        if (theFrame() === marker(1) - 1) this.setStage(this.GAMESTAGE_WIN);
        break;
      case this.GAMESTAGE_WIN:
        if (this.initStage) {
          this.initStage = 0;
        }
        this.player.update();
        this.enemy.update();
        this.updateProjectiles();
        this.checkFighterOverlap();
        this.updateEffects();
        this.scene.update();
        this.hud.update();
        if (theFrame() === marker(1) - 1) {
          const b =
            (this.roundState === this.ROUNDSTATE_TITAN_WINS_BY_DAMAGE && !this.villain.isAlive()) ||
            (this.roundState === this.ROUNDSTATE_VILLAIN_WINS_BY_DAMAGE && !this.titan.isAlive()) ||
            this.roundState === this.ROUNDSTATE_TITAN_WINS_BY_TIME ||
            this.roundState === this.ROUNDSTATE_VILLAIN_WINS_BY_TIME;
          if (b) {
            if (this.playerWins === 2 || this.enemyWins === 2) this.setStage(this.GAMESTAGE_SCORE);
            else this.setStage(this.GAMESTAGE_INTRO);
          }
        }
        break;
      case this.GAMESTAGE_SCORE:
        if (this.initStage) {
          this.initStage = 0;
          this.delayFrames = 30;
        }
        this.player.update();
        this.enemy.update();
        this.updateProjectiles();
        this.checkFighterOverlap();
        this.updateEffects();
        this.scene.update();
        this.hud.update();
        this.delayFrames = this.delayFrames - 1;
        if (this.delayFrames === 0) {
          if (this.playerWins === 2) {
            g.defeatedEnemies.get(g.playerID).set(g.enemyID, 1);
            if (this.matchScore > g.playerScores.get(g.playerID).get(g.enemyID)) {
              g.playerScores.get(g.playerID).set(g.enemyID, this.matchScore);
            }
            let playerFighterOrder: LList<any>;
            let enemyFighterOrder: LList<any>;
            let playerOrderIndex: number;
            let enemyOrderIndex: number;
            if (g.playMode === g.PLAYMODE_AS_TITANS) {
              playerFighterOrder = g.TITAN_FIGHTER_ORDER;
              enemyFighterOrder = g.VILLAIN_FIGHTER_ORDER;
              playerOrderIndex = playerFighterOrder.getPos(g.titanID);
              enemyOrderIndex = enemyFighterOrder.getPos(g.villainID);
            } else {
              playerFighterOrder = g.VILLAIN_FIGHTER_ORDER;
              enemyFighterOrder = g.TITAN_FIGHTER_ORDER;
            }
            playerOrderIndex = playerFighterOrder.getPos(g.playerID);
            enemyOrderIndex = enemyFighterOrder.getPos(g.enemyID);
            if (enemyOrderIndex < enemyFighterOrder.count) {
              const nextEnemyID = enemyFighterOrder.get(enemyOrderIndex + 1);
              if (g.availableEnemies.get(nextEnemyID)) {
                g.unlockedEnemies.get(g.playerID).set(nextEnemyID, 1);
                g.enemyID = nextEnemyID;
                if (g.playMode === g.PLAYMODE_AS_TITANS) g.villainID = nextEnemyID;
                else g.titanID = nextEnemyID;
              }
            } else if (!g.victories.get(g.playerID)) {
              g.victories.set(g.playerID, 1);
              g.goFrame = label('Win');
            }
          }
          if (!g.goFrame) g.goFrame = label('SCREEN_SELECTFIGHTER');
        }
        break;
    }
  }

  paint(): void {
    this.player.paint();
    this.enemy.paint();
    for (const o of this.projectileGroup.getList()) o.paint();
    for (const o of this.effectGroup.getList()) o.paint();
    this.scene.paint();
    this.hud.paint();
  }

  addProjectile(o: any): void {
    this.projectileGroup.addToGroup(o);
    this.collisionGroup.addToGroup(o);
  }

  removeProjectile(o: any): void {
    this.projectileGroup.removeFromGroup(o);
    this.collisionGroup.removeFromGroup(o);
  }

  freezeProjectiles(owner: any, b: any): void {
    for (const o of this.projectileGroup.getList()) {
      if (o.owner === owner) o.setFrozen(b);
    }
  }

  killProjectile(o: any): void {
    this.projectileGroup.removeFromGroup(o);
    this.collisionGroup.removeFromGroup(o);
    o.destroy();
  }

  addEffect(o: any): void {
    this.effectGroup.addToGroup(o);
  }

  removeEffect(o: any): void {
    this.effectGroup.removeFromGroup(o);
  }

  killEffect(o: any): void {
    this.effectGroup.removeFromGroup(o);
    o.destroy();
  }

  freezeEffects(owner: any, b: any): void {
    for (const o of this.effectGroup.getList()) {
      if (o.owner === owner) o.setFrozen(b);
    }
  }

  getTime(): number {
    return this.clock.getTime();
  }

  getScore(): number {
    return this.matchScore;
  }

  addScore(points: number): void {
    this.matchScore = this.matchScore + points;
  }

  awardPoints(fighterObj: any, points: number): void {
    if (fighterObj === this.enemy) {
      this.hitChainMultiplier = 1;
      return;
    } else if (points === 0) {
      this.hitChainMultiplier = 1;
    } else {
      this.addScore(integer(points * 10 * this.hitChainMultiplier * g.difficulty));
      if (this.hitChainMultiplier < 10) this.hitChainMultiplier = this.hitChainMultiplier + 1;
    }
    this.prevHitTimestamp = g.frameTimestamp;
  }

  canSummon(_summoner: any, fighterID: number): any {
    return this.playerCanSummon.get(fighterID);
  }

  summonTitan(summoner: any, fighterID: number): any {
    let cls: any;
    switch (fighterID) {
      case g.FIGHTER_ID_ROBIN:
        cls = g.classes.Class_SummonRobinEffect;
        break;
      case g.FIGHTER_ID_RAVEN:
        cls = g.classes.Class_SummonRavenEffect;
        break;
      case g.FIGHTER_ID_CYBORG:
        cls = g.classes.Class_SummonCyborgEffect;
        break;
      case g.FIGHTER_ID_STARFIRE:
        cls = g.classes.Class_SummonStarfireEffect;
        break;
      case g.FIGHTER_ID_BEASTBOY:
        cls = g.classes.Class_SummonBeastboyEffect;
        break;
      default:
        return undefined;
    }
    const effect = new cls(summoner, summoner.pos, point(0, 0), summoner.dir);
    this.addEffect(effect);
    this.hud.useSummonPortrait(fighterID);
    this.playerCanSummon.set(fighterID, 0);
    g.main.audioMgr.playSound(g.assets.AUDIO.SFX_SUMMON_TITAN, 100, g.SFX_EVENT_PRIORITY_LOW);
    return effect;
  }

  keyDown(event: any): void {
    switch (event.keyCode) {
      case g.KEYCODE_ESC:
        g.goFrame = label('SCREEN_SELECTFIGHTER');
        break;
      case g.KEYCODE_P:
        if (this.gameStage === this.GAMESTAGE_PLAY) {
          this.setPause(b2i(!this.paused));
          if (!this.paused) {
            g.main.audioMgr.playSound(g.assets.AUDIO.SFX_CHARACTERSWITCH3, 100, g.SFX_EVENT_PRIORITY_LOW);
          }
        }
        break;
    }
    let playSound = 0;
    if (this.cheat_toggleFPS.checkKey(event.keyCode)) {
      this.hud.showFPS(b2i(!this.hud.isFPS()));
      playSound = 1;
    }
    if (this.cheat_toggleAI.checkKey(event.keyCode)) {
      g.game.enemyAdapter.setEnabled(b2i(!g.game.enemyAdapter.isEnabled()));
      playSound = 1;
    }
    if (this.cheat_reduceVillainHealth.checkKey(event.keyCode)) {
      this.villain.health = 100;
      playSound = 1;
    }
    if (this.cheat_reduceTitanHealth.checkKey(event.keyCode)) {
      this.titan.health = 100;
      playSound = 1;
    }
    if (this.cheat_invulnerability.checkKey(event.keyCode)) {
      if (this.player.naturalDefense) this.player.naturalDefense = 0;
      else this.player.naturalDefense = 100;
      playSound = 1;
    }
    if (playSound) {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEDOWNFIGHT, 100, g.SFX_EVENT_PRIORITY_LOW);
    }
  }

  keyUp(_event: any): void {}
}
