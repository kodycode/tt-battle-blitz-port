import { LList, voidp } from '../../runtime';

export class Class_KeyCombo {
  COMBO_KEYDOWN_INTERVAL_MIN: number;
  COMBO_KEYDOWN_INTERVAL_MAX: number;
  combo: LList<number>;
  index: number;

  constructor(keyList: LList<number>) {
    this.COMBO_KEYDOWN_INTERVAL_MIN = 10;
    this.COMBO_KEYDOWN_INTERVAL_MAX = 250;
    this.combo = keyList;
    this.index = 1;
  }

  destroy(): undefined {
    return undefined;
  }

  reset(): void {
    this.index = 1;
  }

  checkKey(comboKey: number, time?: number): number {
    if (voidp(time)) time = this.COMBO_KEYDOWN_INTERVAL_MAX;
    let acceptKey = 0;
    if (this.index > this.combo.count) this.index = 1;
    if (comboKey === this.combo.get(this.index)) {
      if (this.index === 1) acceptKey = 1;
      else if ((time as number) <= this.COMBO_KEYDOWN_INTERVAL_MAX && (time as number) >= this.COMBO_KEYDOWN_INTERVAL_MIN) acceptKey = 1;
    }
    if (acceptKey) {
      if (this.index === this.combo.count) {
        this.index = 1;
        return 1;
      }
      this.index = this.index + 1;
    } else {
      this.index = 1;
    }
    return 0;
  }
}
