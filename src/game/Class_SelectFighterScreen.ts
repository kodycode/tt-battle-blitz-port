import { g, sprite, member, label, marker, theFrame, list, rect, idiv, integer, LList, Member, Sprite } from '../runtime';
import { Class_Screen } from './Class_Screen';
import type { Class_KeyCombo } from './Class_KeyCombo';
import type { KeyEvent } from './Class_KeyManager';

export class Class_SelectFighterScreen extends Class_Screen {
  SCREENSTAGE_INTRO: number;
  SCREENSTAGE_SELECT_ROBIN: number;
  SCREENSTAGE_SELECT_RAVEN: number;
  SCREENSTAGE_SELECT_CYBORG: number;
  SCREENSTAGE_SELECT_STARFIRE: number;
  SCREENSTAGE_SELECT_BEASTBOY: number;
  SCREENSTAGE_SELECT_JINX: number;
  SCREENSTAGE_SELECT_GIZMO: number;
  SCREENSTAGE_SELECT_MAMMOTH: number;
  SCREENSTAGE_SELECT_CINDERBLOCK: number;
  SCREENSTAGE_SELECT_PLASMUS: number;
  TAG_MEMBER_PLAYER: Member;
  TAG_MEMBER_OPPONENT: Member;
  TAG_MEMBER_LOCKED: Member;
  TAG_MEMBER_DEFEATED: Member;
  TAG_MEMBER_FUTURE_DATES: LList<Member>;
  FIGHTER_HILIGHT_MEMBERS: any;
  fighterNames: LList<string>;
  scoreNumberMembers: LList<Member>;
  screenStage: number;
  initStage: number;
  musicEventID: any;
  cheat_unlockAllFighters: Class_KeyCombo;
  cheat_availAllFighters: Class_KeyCombo;
  cheat_defeatAllFighters: Class_KeyCombo;

  constructor() {
    super();
    this.SCREENSTAGE_INTRO = 1;
    this.SCREENSTAGE_SELECT_ROBIN = 2;
    this.SCREENSTAGE_SELECT_RAVEN = 3;
    this.SCREENSTAGE_SELECT_CYBORG = 4;
    this.SCREENSTAGE_SELECT_STARFIRE = 5;
    this.SCREENSTAGE_SELECT_BEASTBOY = 6;
    this.SCREENSTAGE_SELECT_JINX = 7;
    this.SCREENSTAGE_SELECT_GIZMO = 8;
    this.SCREENSTAGE_SELECT_MAMMOTH = 9;
    this.SCREENSTAGE_SELECT_CINDERBLOCK = 10;
    this.SCREENSTAGE_SELECT_PLASMUS = 11;
    this.TAG_MEMBER_PLAYER = member('select_player');
    this.TAG_MEMBER_OPPONENT = member('select_opponent');
    this.TAG_MEMBER_LOCKED = member('select_locked');
    this.TAG_MEMBER_DEFEATED = member('select_defeated');
    this.TAG_MEMBER_FUTURE_DATES = new LList();
    this.TAG_MEMBER_FUTURE_DATES.set(g.FIGHTER_ID_ROBIN, member(0));
    this.TAG_MEMBER_FUTURE_DATES.set(g.FIGHTER_ID_RAVEN, member(0));
    this.TAG_MEMBER_FUTURE_DATES.set(g.FIGHTER_ID_CYBORG, member(0));
    this.TAG_MEMBER_FUTURE_DATES.set(g.FIGHTER_ID_STARFIRE, member(0));
    this.TAG_MEMBER_FUTURE_DATES.set(g.FIGHTER_ID_BEASTBOY, member(0));
    this.TAG_MEMBER_FUTURE_DATES.set(g.FIGHTER_ID_JINX, member(0));
    this.TAG_MEMBER_FUTURE_DATES.set(g.FIGHTER_ID_GIZMO, member(0));
    this.TAG_MEMBER_FUTURE_DATES.set(g.FIGHTER_ID_MAMMOTH, member(0));
    this.TAG_MEMBER_FUTURE_DATES.set(g.FIGHTER_ID_CINDERBLOCK, member(0));
    this.TAG_MEMBER_FUTURE_DATES.set(g.FIGHTER_ID_PLASMUS, member(0));
    this.fighterNames = new LList();
    this.fighterNames.set(g.FIGHTER_ID_ROBIN, 'robin');
    this.fighterNames.set(g.FIGHTER_ID_RAVEN, 'raven');
    this.fighterNames.set(g.FIGHTER_ID_CYBORG, 'cyborg');
    this.fighterNames.set(g.FIGHTER_ID_STARFIRE, 'starfire');
    this.fighterNames.set(g.FIGHTER_ID_BEASTBOY, 'beast');
    this.fighterNames.set(g.FIGHTER_ID_JINX, 'jinx');
    this.fighterNames.set(g.FIGHTER_ID_MAMMOTH, 'mammoth');
    this.fighterNames.set(g.FIGHTER_ID_GIZMO, 'gizmo');
    this.fighterNames.set(g.FIGHTER_ID_CINDERBLOCK, 'cinder');
    this.fighterNames.set(g.FIGHTER_ID_PLASMUS, 'plasmus');
    this.scoreNumberMembers = list(
      g.util.findMember('playerscore_0w'),
      g.util.findMember('playerscore_1w'),
      g.util.findMember('playerscore_2w'),
      g.util.findMember('playerscore_3w'),
      g.util.findMember('playerscore_4w'),
      g.util.findMember('playerscore_5w'),
      g.util.findMember('playerscore_6w'),
      g.util.findMember('playerscore_7w'),
      g.util.findMember('playerscore_8w'),
      g.util.findMember('playerscore_9w'),
    );
    this.cheat_unlockAllFighters = new g.classes.Class_KeyCombo(list(g.KEYCODE_O, g.KEYCODE_P, g.KEYCODE_E, g.KEYCODE_N, g.KEYCODE_A, g.KEYCODE_L, g.KEYCODE_L));
    this.cheat_availAllFighters = new g.classes.Class_KeyCombo(list(g.KEYCODE_E, g.KEYCODE_A, g.KEYCODE_T, g.KEYCODE_I, g.KEYCODE_T));
    this.cheat_defeatAllFighters = new g.classes.Class_KeyCombo(list(g.KEYCODE_S, g.KEYCODE_P, g.KEYCODE_E, g.KEYCODE_E, g.KEYCODE_D, g.KEYCODE_Y, g.KEYCODE_W, g.KEYCODE_I, g.KEYCODE_N));
  }

  destroy(): undefined {
    if (this.loaded) {
      this.unload();
    }
    super.destroy();
    return undefined;
  }

  load(): void {
    this.loaded = 1;
    g.main.keyMgr.addListener(this);
    if (g.main.prevScreenID === g.SCREEN_CONTROLS) {
      // keep the current screenStage when coming back from the controls screen
    } else {
      this.screenStage = this.SCREENSTAGE_INTRO;
    }
    if (g.main.audioMgr.isPlaying(g.assets.AUDIO.MUSIC_WHOLE_SONG)) {
      this.musicEventID = g.main.audioMgr.getEventID(g.assets.AUDIO.MUSIC_WHOLE_SONG);
    } else {
      this.musicEventID = g.main.audioMgr.playSound(g.assets.AUDIO.MUSIC_WHOLE_SONG, 70, g.SFX_EVENT_PRIORITY_UNINTERRUPTIBLE);
    }
    this.updatePlayerScore();
    this.initStage = 1;
  }

  unload(): void {
    this.loaded = 0;
    g.main.keyMgr.removeListener(this);
    sprite(35).visible = true;
    sprite(36).visible = true;
    sprite(37).visible = true;
    sprite(38).visible = true;
    sprite(39).visible = true;
  }

  updatePlayerPortrait(spr: Sprite, id: number): void {
    if (g.unlockedPlayers.get(id) && g.availablePlayers.get(id)) {
      if (g.playerID === id) {
        spr.member = member('loop_selection_' + this.fighterNames.get(id) + '_click');
      } else {
        spr.member = member('selection_' + this.fighterNames.get(id) + '.active');
      }
    } else {
    }
  }

  updateEnemyPortrait(spr: Sprite, id: number): void {
    if (g.defeatedEnemies.get(g.playerID).get(id)) {
      if (g.enemyID === id) {
        spr.member = member('loop_selection_' + this.fighterNames.get(id) + '_defeated_click');
      } else {
        spr.member = member('selection_' + this.fighterNames.get(id) + '.defeat');
      }
    } else {
      if (g.unlockedEnemies.get(g.playerID).get(id) && g.availableEnemies.get(id)) {
        if (g.enemyID === id) {
          spr.member = member('loop_selection_' + this.fighterNames.get(id) + '_click');
        } else {
          spr.member = member('selection_' + this.fighterNames.get(id) + '.active');
        }
      } else {
        spr.member = member('selection_' + this.fighterNames.get(id) + '.inactive');
      }
    }
  }

  updatePlayerTag(spr: Sprite, id: number): void {
    if (g.availablePlayers.get(id)) {
      if (g.unlockedPlayers.get(id)) {
        if (id === g.playerID) {
          spr.member = this.TAG_MEMBER_PLAYER;
        } else {
          spr.member = member(0);
        }
      } else {
        spr.member = this.TAG_MEMBER_LOCKED;
      }
    } else {
      spr.member = this.TAG_MEMBER_FUTURE_DATES.get(id);
    }
  }

  updateEnemyTag(spr: Sprite, id: number): void {
    if (g.availableEnemies.get(id)) {
      if (g.unlockedEnemies.get(g.playerID).get(id)) {
        if (id === g.enemyID) {
          spr.member = this.TAG_MEMBER_OPPONENT;
        } else {
          if (g.defeatedEnemies.get(g.playerID).get(id)) {
            spr.member = this.TAG_MEMBER_DEFEATED;
          } else {
            spr.member = member(0);
          }
        }
      } else {
        spr.member = this.TAG_MEMBER_LOCKED;
      }
    } else {
      spr.member = this.TAG_MEMBER_FUTURE_DATES.get(id);
    }
  }

  updatePlayerScore(): void {
    let totalScore = 0;
    let ENEMY_ORDER: LList<number>;
    if (g.playMode === g.PLAYMODE_AS_TITANS) {
      ENEMY_ORDER = g.VILLAIN_FIGHTER_ORDER;
    } else {
      ENEMY_ORDER = g.TITAN_FIGHTER_ORDER;
    }
    for (const fighterID of ENEMY_ORDER) {
      totalScore = totalScore + g.playerScores.get(g.playerID).get(fighterID);
    }
    const digitRect = rect(0, 0, 11, 26);
    const baseRect = digitRect.offset(160, 1);
    const destImg = g.util.findMember('playerscore_dynamic').image;
    for (let i = 1; i <= 9; i++) {
      // Lingo: totalScore mod integer(power(10, i)) / integer(power(10, i - 1)) (left to right, integer division).
      const digit = idiv(totalScore % integer(Math.pow(10, i)), integer(Math.pow(10, i - 1)));
      const srcImg = this.scoreNumberMembers.get(digit + 1).image;
      destImg.copyPixels(srcImg, baseRect.offset(-(digitRect.width + 1) * (i - 1), 0), digitRect);
    }
  }

  updateSprites(): void {
    if (g.playMode === g.PLAYMODE_AS_TITANS) {
      this.updatePlayerPortrait(sprite(23), g.FIGHTER_ID_ROBIN);
      this.updatePlayerPortrait(sprite(24), g.FIGHTER_ID_RAVEN);
      this.updatePlayerPortrait(sprite(25), g.FIGHTER_ID_CYBORG);
      this.updatePlayerPortrait(sprite(26), g.FIGHTER_ID_STARFIRE);
      this.updatePlayerPortrait(sprite(27), g.FIGHTER_ID_BEASTBOY);
      this.updateEnemyPortrait(sprite(28), g.FIGHTER_ID_JINX);
      this.updateEnemyPortrait(sprite(29), g.FIGHTER_ID_GIZMO);
      this.updateEnemyPortrait(sprite(30), g.FIGHTER_ID_MAMMOTH);
      this.updateEnemyPortrait(sprite(31), g.FIGHTER_ID_CINDERBLOCK);
      this.updateEnemyPortrait(sprite(32), g.FIGHTER_ID_PLASMUS);
      this.updatePlayerTag(sprite(61), g.FIGHTER_ID_ROBIN);
      this.updatePlayerTag(sprite(62), g.FIGHTER_ID_RAVEN);
      this.updatePlayerTag(sprite(63), g.FIGHTER_ID_CYBORG);
      this.updatePlayerTag(sprite(64), g.FIGHTER_ID_STARFIRE);
      this.updatePlayerTag(sprite(65), g.FIGHTER_ID_BEASTBOY);
      this.updateEnemyTag(sprite(66), g.FIGHTER_ID_JINX);
      this.updateEnemyTag(sprite(67), g.FIGHTER_ID_GIZMO);
      this.updateEnemyTag(sprite(68), g.FIGHTER_ID_MAMMOTH);
      this.updateEnemyTag(sprite(69), g.FIGHTER_ID_CINDERBLOCK);
      this.updateEnemyTag(sprite(70), g.FIGHTER_ID_PLASMUS);
      sprite(35).visible = g.enemyID === g.FIGHTER_ID_JINX;
      sprite(36).visible = g.enemyID === g.FIGHTER_ID_GIZMO;
      sprite(37).visible = g.enemyID === g.FIGHTER_ID_MAMMOTH;
      sprite(38).visible = g.enemyID === g.FIGHTER_ID_CINDERBLOCK;
      sprite(39).visible = g.enemyID === g.FIGHTER_ID_PLASMUS;
    } else {
      this.updateEnemyPortrait(sprite(23), g.FIGHTER_ID_ROBIN);
      this.updateEnemyPortrait(sprite(24), g.FIGHTER_ID_RAVEN);
      this.updateEnemyPortrait(sprite(25), g.FIGHTER_ID_CYBORG);
      this.updateEnemyPortrait(sprite(26), g.FIGHTER_ID_STARFIRE);
      this.updateEnemyPortrait(sprite(27), g.FIGHTER_ID_BEASTBOY);
      this.updatePlayerPortrait(sprite(28), g.FIGHTER_ID_JINX);
      this.updatePlayerPortrait(sprite(29), g.FIGHTER_ID_GIZMO);
      this.updatePlayerPortrait(sprite(30), g.FIGHTER_ID_MAMMOTH);
      this.updatePlayerPortrait(sprite(31), g.FIGHTER_ID_CINDERBLOCK);
      this.updatePlayerPortrait(sprite(32), g.FIGHTER_ID_PLASMUS);
      this.updateEnemyTag(sprite(61), g.FIGHTER_ID_ROBIN);
      this.updateEnemyTag(sprite(62), g.FIGHTER_ID_RAVEN);
      this.updateEnemyTag(sprite(63), g.FIGHTER_ID_CYBORG);
      this.updateEnemyTag(sprite(64), g.FIGHTER_ID_STARFIRE);
      this.updateEnemyTag(sprite(65), g.FIGHTER_ID_BEASTBOY);
      this.updatePlayerTag(sprite(66), g.FIGHTER_ID_JINX);
      this.updatePlayerTag(sprite(67), g.FIGHTER_ID_GIZMO);
      this.updatePlayerTag(sprite(68), g.FIGHTER_ID_MAMMOTH);
      this.updatePlayerTag(sprite(69), g.FIGHTER_ID_CINDERBLOCK);
      this.updatePlayerTag(sprite(70), g.FIGHTER_ID_PLASMUS);
      sprite(35).visible = g.enemyID === g.FIGHTER_ID_ROBIN;
      sprite(36).visible = g.enemyID === g.FIGHTER_ID_RAVEN;
      sprite(37).visible = g.enemyID === g.FIGHTER_ID_CYBORG;
      sprite(38).visible = g.enemyID === g.FIGHTER_ID_STARFIRE;
      sprite(39).visible = g.enemyID === g.FIGHTER_ID_BEASTBOY;
    }
    sprite(19).member = member('name_and_moves_' + this.fighterNames.get(g.enemyID), 'select_screen');
  }

  setPlayMode(mode: number): void {
    if (mode !== g.playMode) {
      switch (mode) {
        case g.PLAYMODE_AS_TITANS:
          g.playMode = mode;
          this.setPlayer(g.TITAN_FIGHTER_ORDER.get(1));
          this.jumpToCharacerStage();
          sprite(15).member = member('loop_player_opp_text_switch_to_titans', 'select_screen');
          break;
        case g.PLAYMODE_AS_VILLAINS:
          g.playMode = mode;
          this.setPlayer(g.VILLAIN_FIGHTER_ORDER.get(1));
          this.jumpToCharacerStage();
          sprite(15).member = member('loop_player_opp_text_switch_to_villains', 'select_screen');
          break;
      }
    }
  }

  setPlayer(id: number): void {
    if (g.availablePlayers.get(id) && g.unlockedPlayers.get(id)) {
      sprite(10).member = member('bg_head_' + g.main.screen.fighterNames.get(g.enemyID), 'select_screen');
      g.playerID = id;
      let ENEMY_ORDER: LList<number>;
      if (g.playMode === g.PLAYMODE_AS_TITANS) {
        g.titanID = id;
        ENEMY_ORDER = g.VILLAIN_FIGHTER_ORDER;
      } else {
        g.villainID = id;
        ENEMY_ORDER = g.TITAN_FIGHTER_ORDER;
      }
      for (let i = ENEMY_ORDER.count; i >= 1; i--) {
        if (g.unlockedEnemies.get(g.playerID).get(ENEMY_ORDER.get(i))) {
          this.setOpponent(ENEMY_ORDER.get(i));
          break;
        }
      }
      this.updatePlayerScore();
      this.jumpToCharacerStage();
    }
  }

  setOpponent(id: number): void {
    if (g.availableEnemies.get(id) && g.unlockedEnemies.get(g.playerID).get(id)) {
      g.enemyID = id;
      if (g.playMode === g.PLAYMODE_AS_TITANS) {
        g.villainID = id;
      } else {
        g.titanID = id;
      }
      const mem = member('loop_logo_anim', 'select_screen');
      if (sprite(11).member === mem) {
        sprite(11).tellGo(1); // tell sprite(11) to go(1): restart the film loop
      } else {
        sprite(11).member = member('loop_logo_anim', 'select_screen');
      }
      sprite(10).member = member('bg_head_' + g.main.screen.fighterNames.get(g.enemyID), 'select_screen');
      sprite(12).member = member('loop_figure_' + this.fighterNames.get(g.enemyID), 'select_screen');
      this.updateSprites();
    }
  }

  setStage(i: number): void {
    switch (i) {
      case this.SCREENSTAGE_INTRO:
        g.goFrame = label('SCREEN_SELECTFIGHTER');
        break;
      case this.SCREENSTAGE_SELECT_ROBIN:
        g.goFrame = label('SCREEN_SELECTFIGHTER_ROBIN');
        break;
      case this.SCREENSTAGE_SELECT_RAVEN:
        g.goFrame = label('SCREEN_SELECTFIGHTER_RAVEN');
        break;
      case this.SCREENSTAGE_SELECT_CYBORG:
        g.goFrame = label('SCREEN_SELECTFIGHTER_CYBORG');
        break;
      case this.SCREENSTAGE_SELECT_STARFIRE:
        g.goFrame = label('SCREEN_SELECTFIGHTER_STARFIRE');
        break;
      case this.SCREENSTAGE_SELECT_BEASTBOY:
        g.goFrame = label('SCREEN_SELECTFIGHTER_BEASTBOY');
        break;
      case this.SCREENSTAGE_SELECT_JINX:
        g.goFrame = label('SCREEN_SELECTFIGHTER_JINX');
        break;
      case this.SCREENSTAGE_SELECT_GIZMO:
        g.goFrame = label('SCREEN_SELECTFIGHTER_GIZMO');
        break;
      case this.SCREENSTAGE_SELECT_MAMMOTH:
        g.goFrame = label('SCREEN_SELECTFIGHTER_MAMMOTH');
        break;
      case this.SCREENSTAGE_SELECT_CINDERBLOCK:
        g.goFrame = label('SCREEN_SELECTFIGHTER_CINDERBLOCK');
        break;
      case this.SCREENSTAGE_SELECT_PLASMUS:
        g.goFrame = label('SCREEN_SELECTFIGHTER_PLASMUS');
        break;
    }
    this.screenStage = i;
    this.initStage = 1;
  }

  advanceStage(): void {
    this.setStage(this.screenStage + 1);
  }

  jumpToCharacerStage(): void {
    switch (g.playerID) {
      case g.FIGHTER_ID_ROBIN:
        this.setStage(this.SCREENSTAGE_SELECT_ROBIN);
        break;
      case g.FIGHTER_ID_RAVEN:
        this.setStage(this.SCREENSTAGE_SELECT_RAVEN);
        break;
      case g.FIGHTER_ID_CYBORG:
        this.setStage(this.SCREENSTAGE_SELECT_CYBORG);
        break;
      case g.FIGHTER_ID_STARFIRE:
        this.setStage(this.SCREENSTAGE_SELECT_STARFIRE);
        break;
      case g.FIGHTER_ID_BEASTBOY:
        this.setStage(this.SCREENSTAGE_SELECT_BEASTBOY);
        break;
      case g.FIGHTER_ID_JINX:
        this.setStage(this.SCREENSTAGE_SELECT_JINX);
        break;
      case g.FIGHTER_ID_GIZMO:
        this.setStage(this.SCREENSTAGE_SELECT_GIZMO);
        break;
      case g.FIGHTER_ID_MAMMOTH:
        this.setStage(this.SCREENSTAGE_SELECT_MAMMOTH);
        break;
      case g.FIGHTER_ID_CINDERBLOCK:
        this.setStage(this.SCREENSTAGE_SELECT_CINDERBLOCK);
        break;
      case g.FIGHTER_ID_PLASMUS:
        this.setStage(this.SCREENSTAGE_SELECT_PLASMUS);
        break;
    }
  }

  update(): void {
    switch (this.screenStage) {
      case this.SCREENSTAGE_INTRO:
        if (this.initStage) {
          this.initStage = 0;
        }
        if (theFrame() === marker(1) - 1) {
          this.jumpToCharacerStage();
        }
        break;
      case this.SCREENSTAGE_SELECT_ROBIN:
      case this.SCREENSTAGE_SELECT_RAVEN:
      case this.SCREENSTAGE_SELECT_CYBORG:
      case this.SCREENSTAGE_SELECT_STARFIRE:
      case this.SCREENSTAGE_SELECT_BEASTBOY:
      case this.SCREENSTAGE_SELECT_JINX:
      case this.SCREENSTAGE_SELECT_GIZMO:
      case this.SCREENSTAGE_SELECT_MAMMOTH:
      case this.SCREENSTAGE_SELECT_CINDERBLOCK:
      case this.SCREENSTAGE_SELECT_PLASMUS:
        if (this.initStage) {
          this.initStage = 0;
          this.updateSprites();
          sprite(10).member = member('bg_head_' + g.main.screen.fighterNames.get(g.enemyID), 'select_screen');
          sprite(12).member = member('loop_figure_' + this.fighterNames.get(g.enemyID), 'select_screen');
        }
        break;
    }
  }

  keyDown(event: KeyEvent): void {
    let playSound = 0;
    if (this.cheat_unlockAllFighters.checkKey(event.keyCode)) {
      for (let i = 1; i <= g.FIGHTER_COUNT; i++) {
        g.unlockedPlayers.set(i, 1);
        g.unlockedEnemies.get(g.playerID).set(i, 1);
        this.updateSprites();
      }
      playSound = 1;
    }
    if (this.cheat_defeatAllFighters.checkKey(event.keyCode)) {
      let ENEMY_ORDER: LList<number>;
      if (g.playMode === g.PLAYMODE_AS_TITANS) {
        ENEMY_ORDER = g.VILLAIN_FIGHTER_ORDER;
      } else {
        ENEMY_ORDER = g.TITAN_FIGHTER_ORDER;
      }
      for (let i = 1; i <= ENEMY_ORDER.count; i++) {
        g.defeatedEnemies.get(g.playerID).set(ENEMY_ORDER.get(i), 1);
        this.updateSprites();
      }
      playSound = 1;
    }
    if (playSound) {
      g.main.audioMgr.playSound(g.assets.AUDIO.SFX_INTERFACE_MOUSEDOWNFIGHT, 100, g.SFX_EVENT_PRIORITY_LOW);
    }
  }

  keyUp(_event: KeyEvent): void {}
}
