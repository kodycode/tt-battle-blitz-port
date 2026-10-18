import { g, sprite, list, LList, Behavior } from '../../runtime';

export class Behavior_SetLocZ extends Behavior {
  // getPropertyDescriptionList parameter (set by the score player), e.g. 'SPRITE_LOCZ_HUD_BG'.
  locZLayer: string;

  beginSprite(): void {
    sprite(this.spriteNum).locZ = g.getaProp(this.locZLayer);
  }

  endSprite(): void {
    sprite(this.spriteNum).locZ = this.spriteNum;
  }

  prepareFrame(): void {}

  exitFrame(): void {}

  getLocZDefs(): LList<string> {
    return list(
      'SPRITE_LOCZ_BACKGROUND',
      'SPRITE_LOCZ_BACKGROUND_EFFECT',
      'SPRITE_LOCZ_SHADOWS',
      'SPRITE_LOCZ_EFFECTS_BACKGROUND',
      'SPRITE_LOCZ_VILLAIN_FIGHTER',
      'SPRITE_LOCZ_TITAN_FIGHTER',
      'SPRITE_LOCZ_PROJECTILES',
      'SPRITE_LOCZ_EFFECTS_FOREGROUND',
      'SPRITE_LOCZ_SCREEN_FLASH',
      'SPRITE_LOCZ_HUD_BG',
      'SPRITE_LOCZ_HUD_FG',
      'SPRITE_LOCZ_GAME_FADE',
      'SPRITE_LOCZ_GAME_TEXT',
      'SPRITE_LOCZ_ALL_FADE',
    );
  }
}
