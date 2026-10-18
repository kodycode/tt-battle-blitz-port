"""Where each ported Lingo script lives under src/game/ (one file per script, named after it).

Used by research/gen_assets.py (to place generated asset classes) and documents the layout:

  fighters/<name>/   one folder per fighter: its class, moves, projectiles, effects, AI, key adapter, assets class
                     and, for the Titans, the effect played when it is summoned as an assist
  fighters/          what all fighters share: Class_Fighter, Class_Move, the AI and key adapters, shared assets
  actors/            things on stage: actors, projectiles, effects, shadows, overlays, the sprite manager
  animation/         the animation classes
  effects/           effects not tied to one fighter (dust, hits, ground, bursts, background bars)
  hud/               the fight HUD
  screens/<screen>/  each screen class with the behaviours (button and sprite scripts) of its frames
  screens/           the screen base class
  core/              globals, main loop, utilities, audio, keys, loaders, data structures
  movie/             score frame scripts, the Cartoon Network wrapper scripts, debug scripts
"""
import re

FIGHTERS = ['Robin', 'Raven', 'Cyborg', 'Starfire', 'Beastboy', 'Jinx', 'Gizmo', 'Mammoth', 'Cinderblock', 'Plasmus']

SCREENS = {
    'title': ['Class_TitleScreen', 'Behavior_TitleScreen*'],
    'intro': ['Class_IntroScreen', 'Behavior_IntroScreen*'],
    'select': ['Class_SelectFighterScreen', 'Behavior_SelectFighterScreen', 'Behavior_SelectScreen*'],
    'versus': ['Class_VersusScreen', 'Behavior_VersusScreen'],
    'game': ['Class_GameScreen', 'Behavior_GameScreen', 'Class_GameTimer', 'Behavior_ChangeRoundNumMember', 'Class_AssetsGameMessages'],
    'win': ['Class_WinScreen', 'Behavior_WinScreen*', 'Behavior_ChangeWinBGLoop', 'Behavior_ChangeWinnerName', 'loop_win_animation'],
    'controls': ['Class_ControlsScreen', 'Class_ControlsPopUp', 'Behavior_ControlsScreen*', 'Behavior_ControlPopup*'],
}

GROUPS = {
    'fighters': ['Class_Fighter', 'Class_Move', 'Class_AIAdapter', 'Class_KeyAdapter', 'Class_KeyCombo', 'Class_AssetsCharShared'],
    'actors': ['Class_Actor', 'Class_ActorTrails', 'Class_AnimatedActor', 'Class_CollidableActor', 'Class_StaticActor', 'Class_Projectile',
               'Class_Effect', 'Class_Shadow', 'Class_Overlay', 'Class_StaticOverlay', 'Class_SpriteManager'],
    'animation': ['Class_*Animation'],
    'effects': ['Class_Dust*', 'Class_Ground*', 'Class_Hit*', 'Class_White*', 'Class_BgBars*', 'Class_BlockedAttackEffect', 'Class_LightColumnEffect'],
    'hud': ['Class_HUD*', 'Class_AssetsHUD'],
    'screens': ['Class_Screen'],
    'core': ['Class_Globals', 'Class_Main', 'Class_Utility', 'Class_AudioManager', 'Class_AssetsAudio', 'Class_KeyManager', 'Class_MemberLoader',
             'Class_NetPreloader', 'Class_ObjectGroup', 'Class_ObjectTable', 'Class_Scene', 'Class_Sequence'],
    'movie': ['Frame_*', 'CN_*', 'Debug_*', 'DEBUG', 'Behavior_AudioEvent', 'Behavior_SetLocZ'],
}


def _match(name, patterns):
    return any(re.fullmatch(re.escape(p).replace(r'\*', '.*'), name) for p in patterns)


def folder_for(name):
    """The folder (relative to src/game, '/'-separated) of the script `name`; '' for the top level."""
    if name == 'classes':
        return ''
    for f in FIGHTERS:
        if name.startswith('Class_' + f) or name in ('Class_Assets' + f, 'Class_Summon%sEffect' % f):
            return 'fighters/' + f.lower()
    for screen, patterns in SCREENS.items():
        if _match(name, patterns):
            return 'screens/' + screen
    for group, patterns in GROUPS.items():
        if _match(name, patterns):
            return group
    raise KeyError('no folder for %s: add it to scripts/game_layout.py' % name)
