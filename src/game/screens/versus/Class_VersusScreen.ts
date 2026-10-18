import { g, sprite, member, castLib, label, marker, theFrame, rect, integer, runMode, voidp, LList, Member, CastLib, LImage } from '../../../runtime';
import { Class_Screen } from '../Class_Screen';

// TODO(runtime): `the moviePath` is not provided by the runtime.
const MOVIE_PATH = '';

// new(#bitmap, castLib): TODO(runtime): the runtime has no member creation. Stand-in: put a new bitmap member
// in the first free (or erased) slot of the cast, like Director does.
function newBitmapMember(cast: { number: number; name: string }): Member {
  if (cast instanceof CastLib) {
    let n = 1;
    while (cast.members.has(n) && cast.members.get(n)!.type !== 'empty') n++;
    const m = new Member(n, cast.number, '', 'bitmap');
    cast.add(m);
    return m;
  }
  return new Member(0, 0, '', 'bitmap');
}

export class Class_VersusScreen extends Class_Screen {
  SCREENSTAGE_INTRO: number;
  SCREENSTAGE_LOADING: number;
  SCREENSTAGE_OUTRO: number;
  screenStage: number;
  initStage: number;
  delayFrames: number;
  villainPreloader: any;
  titanPreloader: any;
  sharedPreloader: any;
  titanCastURL: string;
  villainCastURL: string;
  sharedCastURL: string;
  titanReady: number;
  villainReady: number;
  sharedReady: number;
  titanNameScratchMember: Member;
  villainNameScratchMember: Member;
  titanNameSourceImage: LImage;
  villainNameSourceImage: LImage;

  constructor() {
    super();
    this.SCREENSTAGE_INTRO = 1;
    this.SCREENSTAGE_LOADING = 2;
    this.SCREENSTAGE_OUTRO = 3;
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
    this.screenStage = this.SCREENSTAGE_INTRO;
    this.initStage = 1;
    if (g.villainID !== g.FIGHTER_ID_JINX) {
      sprite(8).visible = false;
    }
    if (g.villainID !== g.FIGHTER_ID_GIZMO) {
      sprite(11).visible = false;
    }
    if (g.villainID !== g.FIGHTER_ID_MAMMOTH) {
      sprite(14).visible = false;
    }
    if (g.villainID !== g.FIGHTER_ID_CINDERBLOCK) {
      sprite(17).visible = false;
    }
    if (g.villainID !== g.FIGHTER_ID_PLASMUS) {
      sprite(20).visible = false;
    }
    if (g.titanID !== g.FIGHTER_ID_ROBIN) {
      sprite(23).visible = false;
    }
    if (g.titanID !== g.FIGHTER_ID_RAVEN) {
      sprite(26).visible = false;
    }
    if (g.titanID !== g.FIGHTER_ID_CYBORG) {
      sprite(29).visible = false;
    }
    if (g.titanID !== g.FIGHTER_ID_STARFIRE) {
      sprite(32).visible = false;
    }
    if (g.titanID !== g.FIGHTER_ID_BEASTBOY) {
      sprite(35).visible = false;
    }
    const id = g.main.audioMgr.getEventID(g.assets.AUDIO.MUSIC_WHOLE_SONG);
    if (id) {
      g.main.audioMgr.fadeOutSound(id, 0, 0.75);
    }
    if (runMode.toLowerCase() === 'plugin') {
      this.titanCastURL = MOVIE_PATH + g.CASTLIB_NAMES.get(g.titanID) + '.cct';
      this.villainCastURL = MOVIE_PATH + g.CASTLIB_NAMES.get(g.villainID) + '.cct';
      this.sharedCastURL = MOVIE_PATH + 'char_shared.cct';
    } else {
      this.titanCastURL = MOVIE_PATH + g.CASTLIB_NAMES.get(g.titanID) + '.cst';
      this.villainCastURL = MOVIE_PATH + g.CASTLIB_NAMES.get(g.villainID) + '.cst';
      this.sharedCastURL = MOVIE_PATH + 'char_shared.cst';
    }
    if (g.linkedFighterCasts.get(g.titanID)) {
      this.titanReady = 1;
      sprite(46).visible = false;
    } else {
      this.titanReady = 0;
      this.titanPreloader = new g.classes.Class_NetPreloader(this.titanCastURL);
    }
    if (g.linkedFighterCasts.get(g.villainID)) {
      this.villainReady = 1;
      sprite(47).visible = false;
    } else {
      this.villainReady = 0;
      this.villainPreloader = new g.classes.Class_NetPreloader(this.villainCastURL);
    }
    if (g.linkedSharedCast) {
      this.sharedReady = 1;
    } else {
      this.sharedReady = 0;
      this.sharedPreloader = new g.classes.Class_NetPreloader(this.sharedCastURL);
    }
    const colorMems = new LList<Member>();
    colorMems.set(g.FIGHTER_ID_ROBIN, member('robin_vs.name'));
    colorMems.set(g.FIGHTER_ID_RAVEN, member('raven_vs.name'));
    colorMems.set(g.FIGHTER_ID_CYBORG, member('cyborg_vs.name'));
    colorMems.set(g.FIGHTER_ID_STARFIRE, member('starfire_vs.name'));
    colorMems.set(g.FIGHTER_ID_BEASTBOY, member('beastboy_vs.name'));
    colorMems.set(g.FIGHTER_ID_JINX, member('jinx_vs.name'));
    colorMems.set(g.FIGHTER_ID_GIZMO, member('gizmo_vs.name'));
    colorMems.set(g.FIGHTER_ID_MAMMOTH, member('mammoth_vs.name'));
    colorMems.set(g.FIGHTER_ID_CINDERBLOCK, member('cinderblock_vs.name'));
    colorMems.set(g.FIGHTER_ID_PLASMUS, member('plasmus_vs.name'));
    const greyMems = new LList<Member>();
    greyMems.set(g.FIGHTER_ID_ROBIN, member('robin_vs.name_gray'));
    greyMems.set(g.FIGHTER_ID_RAVEN, member('raven_vs.name_gray'));
    greyMems.set(g.FIGHTER_ID_CYBORG, member('cyborg_vs.name_gray'));
    greyMems.set(g.FIGHTER_ID_STARFIRE, member('starfire_vs.name_gray'));
    greyMems.set(g.FIGHTER_ID_BEASTBOY, member('beastboy_vs.name_gray'));
    greyMems.set(g.FIGHTER_ID_JINX, member('jinx_vs.name_gray'));
    greyMems.set(g.FIGHTER_ID_GIZMO, member('gizmo_vs.name_gray'));
    greyMems.set(g.FIGHTER_ID_MAMMOTH, member('mammoth_vs.name_gray'));
    greyMems.set(g.FIGHTER_ID_CINDERBLOCK, member('cinderblock_vs.name_gray'));
    greyMems.set(g.FIGHTER_ID_PLASMUS, member('plasmus_vs.name_gray'));
    const useCast = castLib('scratch');
    const titanScratchMemName = '_scratch_titan_name';
    this.titanNameScratchMember = member(titanScratchMemName, useCast.number);
    if (this.titanNameScratchMember.number < 1) {
      this.titanNameScratchMember = newBitmapMember(useCast);
      this.titanNameScratchMember.name = '_scratch_titan_name';
    }
    this.titanNameScratchMember.image = greyMems.get(g.titanID).image.duplicate();
    // member.regPoint returns a copy in Lingo.
    this.titanNameScratchMember.regPoint = greyMems.get(g.titanID).regPoint.duplicate();
    this.titanNameSourceImage = colorMems.get(g.titanID).image;
    sprite(44).member = this.titanNameScratchMember;
    const villainScratchMemName = '_scratch_villain_name';
    this.villainNameScratchMember = member(villainScratchMemName, useCast.number);
    if (this.villainNameScratchMember.number < 1) {
      this.villainNameScratchMember = newBitmapMember(useCast);
      this.villainNameScratchMember.name = '_scratch_villain_name';
    }
    this.villainNameScratchMember.image = greyMems.get(g.villainID).image.duplicate();
    this.villainNameScratchMember.regPoint = greyMems.get(g.villainID).regPoint.duplicate();
    this.villainNameSourceImage = colorMems.get(g.villainID).image;
    sprite(45).member = this.villainNameScratchMember;
    if (this.titanReady) {
      this.updateTitanBar(1.0);
    }
    if (this.villainReady) {
      this.updateVillainBar(1.0);
    }
  }

  unload(): void {
    this.loaded = 0;
    if (!voidp(this.titanPreloader)) {
      this.titanPreloader.destroy();
    }
    if (!voidp(this.villainPreloader)) {
      this.villainPreloader.destroy();
    }
    sprite(8).visible = true;
    sprite(11).visible = true;
    sprite(14).visible = true;
    sprite(17).visible = true;
    sprite(20).visible = true;
    sprite(23).visible = true;
    sprite(26).visible = true;
    sprite(29).visible = true;
    sprite(32).visible = true;
    sprite(35).visible = true;
    sprite(46).visible = true;
    sprite(47).visible = true;
    if (!voidp(this.titanNameScratchMember)) {
      this.titanNameScratchMember.erase();
    }
    if (!voidp(this.villainNameScratchMember)) {
      this.villainNameScratchMember.erase();
    }
  }

  updateTitanBar(ratio: number): void {
    const destImg = this.titanNameScratchMember.image;
    const fillWidth = integer(destImg.width * ratio);
    const copyRect = rect(0, 0, fillWidth, this.titanNameSourceImage.height);
    destImg.copyPixels(this.titanNameSourceImage, copyRect, copyRect);
  }

  updateVillainBar(ratio: number): void {
    const destImg = this.villainNameScratchMember.image;
    const fillWidth = integer(destImg.width * ratio);
    const copyRect = rect(this.villainNameSourceImage.width - fillWidth, 0, this.villainNameSourceImage.width, this.villainNameSourceImage.height);
    destImg.copyPixels(this.villainNameSourceImage, copyRect, copyRect);
  }

  linkCasts(): void {
    // castLib(n).fileName = url relinked the external fighter/shared casts to the streamed files.
    // TODO(runtime): castLib fileName relinking is not supported by the runtime (every cast is always
    // loaded), so it is emulated by Class_Utility.linkExternalCast (member lookups in an unlinked external
    // cast fail, as with the empty placeholder casts the original starts with):
    //   castLib(g.CASTLIB_NUMS[g.titanID]).fileName = titanCastURL
    //   castLib(g.CASTLIB_NUMS[g.villainID]).fileName = villainCastURL
    //   castLib("char_shared").fileName = sharedCastURL
    g.util.linkExternalCast(g.CASTLIB_NAMES.get(g.titanID));
    g.util.linkExternalCast(g.CASTLIB_NAMES.get(g.villainID));
    g.util.linkExternalCast('char_shared');
    g.assets.FIGHTERS.get(g.titanID).locateMembers();
    g.assets.FIGHTERS.get(g.villainID).locateMembers();
    g.assets.CHAR_SHARED.locateMembers();
    g.linkedFighterCasts.set(g.titanID, 1);
    g.linkedFighterCasts.set(g.villainID, 1);
    g.linkedSharedCast = 1;
  }

  setStage(i: number): void {
    switch (i) {
      case this.SCREENSTAGE_INTRO:
        g.goFrame = label('SCREEN_VERSUS');
        break;
      case this.SCREENSTAGE_LOADING:
        g.goFrame = label('SCREEN_VERSUS_LOADING');
        break;
      case this.SCREENSTAGE_OUTRO:
        g.goFrame = label('SCREEN_VERSUS_OUTRO');
        break;
    }
    this.screenStage = i;
    this.initStage = 1;
  }

  advanceStage(): void {
    this.setStage(this.screenStage + 1);
  }

  update(): void {
    switch (this.screenStage) {
      case this.SCREENSTAGE_INTRO:
        if (this.initStage) {
          this.initStage = 0;
        }
        if (theFrame() === marker(1) - 1) {
          this.advanceStage();
        }
        break;
      case this.SCREENSTAGE_LOADING:
        if (this.initStage) {
          this.initStage = 0;
          this.delayFrames = 100;
        }
        if (theFrame() === marker(1) - 1) {
          this.delayFrames = this.delayFrames - 1;
          if (!this.titanReady) {
            if (this.titanPreloader.update()) {
              this.updateTitanBar(1.0);
              this.titanPreloader = this.titanPreloader.destroy();
              this.titanReady = 1;
              sprite(46).visible = false;
            } else {
              const titanRatio = this.titanPreloader.getRatioLoaded();
              this.updateTitanBar(titanRatio);
            }
          }
          if (!this.villainReady) {
            if (this.villainPreloader.update()) {
              this.updateVillainBar(1.0);
              this.villainPreloader = this.villainPreloader.destroy();
              this.villainReady = 1;
              sprite(47).visible = false;
            } else {
              const villainRatio = this.villainPreloader.getRatioLoaded();
              this.updateVillainBar(villainRatio);
            }
          }
          if (!this.sharedReady) {
            if (this.sharedPreloader.update()) {
              this.sharedPreloader = this.sharedPreloader.destroy();
              this.sharedReady = 1;
            }
          }
          if (this.titanReady && this.villainReady && this.sharedReady) {
            if (this.delayFrames <= 0) {
              this.advanceStage();
            }
          }
        }
        break;
      case this.SCREENSTAGE_OUTRO:
        if (this.initStage) {
          this.initStage = 0;
          this.delayFrames = 30;
          const id = g.main.audioMgr.getEventID(g.assets.AUDIO.MUSIC_LOOP2);
          if (id) {
            g.main.audioMgr.fadeOutSound(id, 0, 0.75);
          }
        }
        if (theFrame() === marker(1) - 1) {
          this.delayFrames = this.delayFrames - 1;
          if (this.delayFrames === 0) {
            this.linkCasts();
            g.goFrame = label('SCREEN_GAME');
          }
        }
        break;
    }
  }
}
