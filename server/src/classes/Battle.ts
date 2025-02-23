import { Move, PrismaClient, User } from "@prisma/client";
import { BattleIncluded, HistoryElement } from "src/types";
import Card from "./Card";

import rarities from "../data/rarities.json";
import types from "../data/types.json";

import { manager, db } from "../../index";
import { BaseMessage } from "discord-hybrid-sharding";
import { parseColor } from "src/helpers/utils";

interface SmallMove {
    type: string;
    moveId?: number;
}

function rev(i: number) { return i === 0 ? 1 : 0; }

export default class Battle {
    battle: BattleIncluded;

    userIndex: number;

    usersOrdered: User[];
    cardsOrdered: Card[];

    isAi: boolean = false;

    state1?: any;
    state2?: any;

    constructor(battle: BattleIncluded, userId: number) {
        this.battle = battle;
        this.userIndex = userId === battle.userId1 ? 0 : 1;

        let card1 = battle.cards.find(c => c.id === battle.cardId1);
        let card2 = battle.cards.find(c => c.id === battle.cardId2);

        let client = { data: { rarities: rarities, types: types } } as any;

        this.usersOrdered = [battle.users.find(u => u.id === battle.userId1), battle.users.find(u => u.id === battle.userId2)];
        this.cardsOrdered = [
            new Card({ card: card1, stats: card1.stat, parent: card1.card, client }), 
            new Card({ card: card2, stats: card2.stat, parent: card2.card, client })
        ];
    
        if (this.battle.type === "PVE" && this.userIndex === 1) this.isAi = true;
    }

    /**
     * Select a move
     * @param type The move type
     * @param moveId The move id
     * @returns 1
     */
    async move(type: string, moveId?: number) {
        let target = this.userIndex === 0 ? this.battle.move1 : this.battle.move2;
        if (target) throw new Error("Move already selected");

        const selectedMove = this.battle.cards.find(c => c.id === this.cardsOrdered[this.userIndex].card.id).moves.find((m) => m.id === moveId);
        if (!selectedMove) throw new Error("Move not found");

        //perform move
        let update = {}

        update[this.userIndex === 0 ? "move1" : "move2"] = { type, moveId };
        this.battle[this.userIndex === 0 ? "move1" : "move2"] = { type, moveId };
        
        const history = this.battle.history as any as HistoryElement[];
        const usedMoves = history.filter((h: any) => h.userId === (this.isAi ? this.cardsOrdered[this.userIndex].card.id : this.usersOrdered[this.userIndex].id) && h.type === "move" && h.cardId === this.cardsOrdered[this.userIndex] && h.moveId === moveId).length;
        if (usedMoves >= selectedMove.pp) type = "skip";

        await db.battle.update({
            where: { id: this.battle.id },
            data: update
        });

        //both players have selected a move, execute
        if ((this.userIndex === 0 && this.battle.move2) || (this.userIndex === 1 && this.battle.move1)) await this.executeMoves();

        return 1;
    }

    
    async executeMoves() {
        //Who moves first?
        let stats1 = this.cardsOrdered[0].getStats();
        let stats2 = this.cardsOrdered[1].getStats();

        let firstMover = stats1.agi > stats2.agi ? this.cardsOrdered[0] : this.cardsOrdered[1];
        let secondMover = stats1.agi > stats2.agi ? this.cardsOrdered[1] : this.cardsOrdered[0];

        let firstMove: SmallMove = (firstMover.card.id === this.battle.cardId1 ? this.battle.move1 : this.battle.move2) as any;
        let secondMove: SmallMove = (secondMover.card.id === this.battle.cardId1 ? this.battle.move1 : this.battle.move2) as any;
        
        if (!firstMove || !secondMove) throw new Error("Moves not selected");
        
        const firstMoveHistory: HistoryElement = await this.executeMove(firstMove, 0, firstMover.card.id === this.battle.cardId1 ? 0 : 1);
        const secondMoveHistory: HistoryElement = await this.executeMove(secondMove, 1, secondMover.card.id === this.battle.cardId1 ? 0 : 1);

        await db.battle.update({
            where: { id: this.battle.id },
            data: { 
                turn: { increment: 1 },
                move1: null,
                move2: null,
                history: { set: [...this.battle.history, firstMoveHistory as any, secondMoveHistory as any].filter(h => h) }
            }
        });
    }

    async executeMove(move: SmallMove, order: number, mover: number): Promise<HistoryElement> {
        if (move.type === "move") {
            let selectedMove = this.battle.cards.find(c => c.id === this.cardsOrdered[mover].card.id).moves.find(m => m.id === move.moveId);
                
            if (!selectedMove) throw new Error("Move not found");

            if (selectedMove.moveType === "ATTACK") {
                return await this.attack(selectedMove, order, mover);
            }

        } else {
            return await this.skip(mover);
        }
    }

    async attack(move: Move, order: number, mover: number): Promise<HistoryElement> {
        let enemy = mover === 0 ? 1 : 0;

        let stats = [
            this.cardsOrdered[0].getStats(),
            this.cardsOrdered[1].getStats()
        ]

        let efectivness: 1 | 0.5 | 2 = types[move.type].strong.includes(this.cardsOrdered[enemy].parent.type) ? 2 : types[move.type].weak.includes(this.cardsOrdered[enemy].parent.type) ? 0.5 : 1;
        let damage = Math.floor((move.power * stats[mover].pow * efectivness) - stats[enemy].def);

        if (order === 1 && this.state1?.type === "defense") damage -= this.state1.value;
        damage = Math.max(0, damage);

        let hp = stats[enemy].hp - damage;
        if (hp <= 0) hp = 0;

        await db.stat.updateMany({
            where: { cardId: this.cardsOrdered[enemy].card.id },
            data: { hp: hp }
        });

        this.cardsOrdered[enemy].stats.hp = hp;

        if (hp <= 0) {
            await this.end();
            return;
        }

        return { userId: this.isAi ? this.cardsOrdered[mover].card.id : this.usersOrdered[mover].id, type: "move", cardId: this.cardsOrdered[mover].card.id, moveId: move.id, efectivness };
    }

    async skip(mover: number): Promise<HistoryElement> {
        await db.battle.update({
            where: { id: this.battle.id },
            data: { turn: { increment: 1 } }
        });

        return { userId: this.isAi ? this.cardsOrdered[mover].card.id : this.usersOrdered[mover].id, type: "skip", cardId: this.cardsOrdered[mover].card.id };
    }

    async enemyAI() {
        if (!this.isAi) return;

        const enemyCard = this.cardsOrdered[rev(this.userIndex)];
        const enemyType = enemyCard.parent.type;
        const moves = this.battle.cards.find(c => c.id === this.cardsOrdered[this.userIndex].card.id).moves;

        for (const move of moves) {
            //Remove moves that are out of PP
            const usedMoves = this.battle.history.filter((h: any) => h.type === "move" && h.cardId === this.cardsOrdered[this.userIndex].card.id && h.moveId === move.id).length;
            if (usedMoves >= move.pp) moves.splice(moves.indexOf(move), 1);
        }

        const weakAgainst = types[enemyType].weak;
        const strongAgainst = types[enemyType].strong;

        const weakMoves = moves.filter((move) => strongAgainst.includes(move.type)).sort((a, b) => b.power - a.power);
        const strongMoves = moves.filter((move) => weakAgainst.includes(move.type)).sort((a, b) => b.power - a.power);
        const neutralMoves = moves.filter((move) => !weakAgainst.includes(move.type) && !strongAgainst.includes(move.type)).sort((a, b) => b.power - a.power);

        const perfectMove = strongMoves.length ? strongMoves[0] : neutralMoves.length ? neutralMoves[0] : weakMoves[0];
        if (!perfectMove) {
            //out of moves, skip
            return await this.skip(this.userIndex);
        }

        await this.move("move", perfectMove.id);
    }

    async end() {
        let exp = 0;
        for (const [i, card] of this.battle.cards.entries()) {
            if (card.status === "WILD_FIGHT") {
                await db.cardInstance.deleteMany({
                    where: { id: card.id },
                });
            } else if (card.stat.hp <= 0 && card.status === "FIGHT") {      
                await db.cardInstance.update({
                    where: { id: card.id },
                    data: { status: "DEAD" }
                });
            } else {
                if (this.battle.type === "PVE") {
                    exp = 600*(this.cardsOrdered[rev(i)].card.rarity);
                }

                await db.cardInstance.update({
                    where: { id: card.id },
                    data: { status: "IDLE", exp: { increment: exp } }
                });
            }
        }

        await db.battle.update({
            where: { id: this.battle.id },
            data: { status: "ENDED" }
        });

        manager.broadcast(new BaseMessage({action: "edit", channelId: this.battle.channelId, messageId: this.battle.messageId, content: {
            embeds: [ {
                description: `The battle has ended!\n+${exp} EXP`,
                image: { url: "attachment://card.jpg" },
                color: parseColor("#ffffff")
            } ]
        }}));
    }
}