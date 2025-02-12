import { Battle as BattleDb } from "@prisma/client";

export default class Battle {
    battle: BattleDb

    constructor(battle: BattleDb) {
        this.battle = battle;
    }
}