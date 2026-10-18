import { member, Member, MEMBER_EMPTY, LList } from '../../runtime';

export class Class_MemberLoader {
  memList: LList<Member>;

  constructor(names: LList<string>, srcCast: string | number) {
    this.memList = new LList();
    for (let i = 1; i <= names.count; i++) {
      const mem = member(names.get(i), srcCast);
      if (mem.number > 0) {
        this.memList.append(mem);
        continue;
      }
      this.memList.append(MEMBER_EMPTY);
    }
  }

  destroy(): undefined {
    return undefined;
  }

  getList(): LList<Member> {
    return this.memList;
  }
}
