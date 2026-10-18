import { g, sprite, list, idiv, LList, Member } from '../../../runtime';
import { Class_Screen } from '../Class_Screen';

export class Class_WinScreen extends Class_Screen {
  scoreNumberMembers: LList<Member>;

  constructor() {
    super();
    this.scoreNumberMembers = list(
      g.util.findMember('endtext_0'),
      g.util.findMember('endtext_1'),
      g.util.findMember('endtext_2'),
      g.util.findMember('endtext_3'),
      g.util.findMember('endtext_4'),
      g.util.findMember('endtext_5'),
      g.util.findMember('endtext_6'),
      g.util.findMember('endtext_7'),
      g.util.findMember('endtext_8'),
      g.util.findMember('endtext_9'),
    );
  }

  load(): void {
    this.loaded = 1;
    let playerOrder: LList<number>;
    let enemyOrder: LList<number>;
    if (g.playMode === g.PLAYMODE_AS_TITANS) {
      playerOrder = g.TITAN_FIGHTER_ORDER;
      enemyOrder = g.VILLAIN_FIGHTER_ORDER;
    } else {
      playerOrder = g.VILLAIN_FIGHTER_ORDER;
      enemyOrder = g.TITAN_FIGHTER_ORDER;
    }
    void playerOrder;
    let totalScore = 0;
    for (const enemyID of enemyOrder) {
      totalScore = totalScore + g.playerScores.get(g.playerID).get(enemyID);
    }
    for (let i = 1; i <= 9; i++) {
      // Lingo: totalScore mod POWERS_OF_TEN[i + 1] / POWERS_OF_TEN[i] (left to right, integer division).
      const digit = idiv(totalScore % g.POWERS_OF_TEN.get(i + 1), g.POWERS_OF_TEN.get(i));
      sprite(20 + i).member = this.scoreNumberMembers.get(digit + 1);
    }
  }
}
