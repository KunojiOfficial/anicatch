import { CardInstance, Battle as DbBattle } from "@prisma/client";
import { BattleIncluded, HistoryElement } from "src/types";
import Card from "./Card";
import { manager, db } from "../../index";
import { BaseMessage } from "discord-hybrid-sharding";
import { parseColor } from "src/helpers/utils";
import rarities from "../data/rarities.json";
import types from "../data/types.json";
import Client from "./Client";

// Define interfaces for better type safety
interface SmallMove {
    type: string;
    moveId?: number;
    cardId?: number;
}

const fakeClient = { data: { rarities, types } } as Client;

function rev(i: number) { return i === 0 ? 1 : 0; }

class Battle {
    battle: DbBattle;
    userIndex: number;
    isAi: boolean = false;

    activeCards: Card[] = [];

    cachedCard?: any;

    constructor(battle: DbBattle, userId: number) {
        this.battle = battle;
        this.userIndex = userId === battle.userId1 ? 0 : 1;

        if (this.battle.type === "PVE" && this.userIndex === 1) this.isAi = true;
    }

    /**
     * Select the moves for the battle
     * @param type type of the action
     * @param data data for the action
     */
    public async selectAction(type: string, data: any) {
        if (!this.activeCards.length) await this.setActiveCards();

        const cardId = this.battle[`cardId${this.userIndex+1}`];

        if (type === "move") {
            const canUse = await this.validateMove(data.moveId, cardId);
            if (!canUse) return await this.skip();
        } else if (type === "switch") {
            const canUse = await this.validateSwitch(data.cardId, this.battle[`userId${this.userIndex+1}`]);
            if (!canUse) return await this.skip();
        }

        await db.battle.update({
            where: { id: this.battle.id },
            data: {
                [`move${this.userIndex+1}`]: { userIndex: this.userIndex, type, ...data }
            }
        });

        this.battle[`move${this.userIndex+1}`] = { userIndex: this.userIndex, type, ...data };

        if (this.battle.move1 && this.battle.move2) {
            //execute actions
            console.log("executing actions");
            await this.executeActions();
        } else if (this.battle.move1 && this.battle.type === "PVE") {
            await this.enemyAI();
        }
    }

    /**
     * Set the active cards for the battle
     */
    private async setActiveCards() {
        const cards = await db.cardInstance.findMany({
            where: { id: { in: [this.battle.cardId1, this.battle.cardId2] } },
            include: { stat: true, card: true, moves: true }
        });

        const card1 = cards.find(c => c.id === this.battle.cardId1);
        const card2 = cards.find(c => c.id === this.battle.cardId2);

        this.activeCards = [
            new Card({ card: card1, parent: card1.card, stats: card1.stat, moves: card1.moves, client: fakeClient }),
            new Card({ card: card2, parent: card2.card, stats: card2.stat, moves: card2.moves, client: fakeClient })
        ];
    }

    /**
     * Validate whether user can use this move
     * @param moveId the move id
     * @param cardId the card id
     * @returns 
     */
    private async validateMove(moveId: number, cardId: number): Promise<boolean> {
        const card = this.activeCards.find(c => c.card.id === cardId);
        if (!card) return false;

        const move = card.moves.find(m => m.id === moveId);
        if (!move) return false;

        const usedMoves = this.battle.history.filter((h: any) => h.type === "move" && h.cardId === cardId && h.moveId === moveId).length;
        if (usedMoves >= move.pp) return false;

        return true;
    }

    /**
     * Validate whether user can switch to this card
     * @param cardId id of the card to switch to
     * @param userId id of the user
     * @returns 
     */
    private async validateSwitch(cardId: number, userId: number): Promise<boolean> {
        const card = await db.cardInstance.findFirst({
            where: { id: cardId, userId, status: "FIGHT", team: { gt: 0 } },
            include: { card: true, stat: true, moves: true }
        });

        if (!card) return false;

        this.cachedCard = card;

        return true;
    }

    /**
     * Executes the cached actions
     */
    private async executeActions(): Promise<boolean> {
        const move1 = this.battle.move1 as any;
        const move2 = this.battle.move2 as any;

        let movesOrdered = [];
        
        if (move1.type === "switch") movesOrdered = [move1,move2];
        else if (move2.type === "switch") movesOrdered = [move2,move1];
        else if (move1.type === "move" && move2.type === "move") {
            //who goes first based on agi
            const stats1 = this.activeCards[0].getStats();
            const stats2 = this.activeCards[1].getStats();

            if (stats1.agi > stats2.agi) movesOrdered = [move1,move2];
            else movesOrdered = [move2,move1];
        } else {
            //one move, one switch
            movesOrdered = [move1,move2];
        }

        const history = [];
        
        for (const [i, move] of movesOrdered.entries()) {
            let moveResult;
            if (move.type === "move") {
                moveResult = await this.move(move.moveId, move.userIndex, i);
            } else if (move.type === "switch") {
                moveResult = await this.switch(move.cardId, move.userIndex);
            } else if (move.type === "skip") {
                moveResult = { userId: this.battle[`userId${move.userIndex+1}`], cardId: this.battle[`cardId${move.userIndex+1}`], type: "skip" };
            }

            history.push(moveResult);
        }

        return await this.finalizeTurn(history);
    }

    /**
     * Finalizes the turn
     * @param history the history of the turn
     * @returns 
     */
    private async finalizeTurn(history: HistoryElement[]): Promise<boolean> {
        //check if someone is dead
        const data = {};
        const dead = this.activeCards.filter(c => c.card.status === "DEAD" || c.card.status === "WILD_DEAD");
        for (const deadCard of dead) {
            this.cachedCard = null;

            if (deadCard.card.status === "WILD_DEAD") return await this.end();

            this.cachedCard = await db.cardInstance.findFirst({
                where: { userId: deadCard.card.userId, status: "FIGHT", team: { gt: 0 } },
                orderBy: { team: "asc" }
            });
    
            if (!this.cachedCard) {
                return await this.end();
            }

            let index = deadCard.card.userId === this.battle.userId1 ? 1 : 2;
            data[`cardId${index}`] = this.cachedCard.id;
        }

        // console.log({
        //     history: [...this.battle.history, ...history] as any,
        //     move1: null,
        //     move2: null,
        //     turn: { increment: 1 },
        //     ...data
        // });

        //update battle
        await db.battle.update({
            where: { id: this.battle.id },
            data: {
                history: [...this.battle.history, ...history] as any,
                move1: null,
                move2: null,
                turn: { increment: 1 },
                ...data
            }
        });

        return true;
    }

    /**
     * Switch to the chosen card
     * @param cardId the id of the card to switch to
     * @param order the move order
     * @returns HistoryElement
     */
    private async switch(cardId: number, userIndex: number): Promise<HistoryElement> {
        const owner = this.battle[`userId${userIndex+1}`];
        const card = this.cachedCard ? this.cachedCard : await db.cardInstance.findFirst({
            where: { id: cardId, userId: owner, status: "FIGHT", team: { gt: 0 } },
            include: { card: true, stat: true, moves: true }
        });

        if (!card) return { userId: owner, cardId, type: "fail" };
        
        await db.battle.update({
            where: { id: this.battle.id },
            data: {
                [`cardId${userIndex+1}`]: card.id
            }
        });

        this.battle[`cardId${userIndex+1}`] = card.id;
        this.activeCards[userIndex] = new Card({ card, parent: card.card, stats: card.stat, moves: card.moves, client: fakeClient });

        return { userId: owner, cardId, type: "switch" };
    }

    /**
     * Skips the turn for the user
     * @param userIndex 
     * @returns 
     */
    private async skip() {
        await db.battle.update({
            where: { id: this.battle.id },
            data: {
                [`move${this.userIndex+1}`]: { userIndex: this.userIndex, type: "skip" }
            }
        });

        this.battle[`move${this.userIndex+1}`] = { userIndex: this.userIndex, type: "skip" };

        if (this.battle.move1 && this.battle.move2) {
            //execute actions
            await this.executeActions();
        } else if (this.battle.move1 && this.battle.type === "PVE") {
            await this.enemyAI();
        }
    }

    /**
     * Execute a selected move
     * @param moveId the id of the move
     * @param order the move order
     * @returns 
     */
    private async move(moveId: number, userIndex: number, order: number): Promise<HistoryElement> {
        const card = this.activeCards[userIndex];
        const move = card.moves.find(m => m.id === moveId);

        console.log("move", move);
        if (!move) return { userId: this.battle[`userId${userIndex+1}`], cardId: card.card.id, type: "fail" };

        const enemyCard = this.activeCards[rev(userIndex)];

        const efectivness = this.getEfectivness(move.type, enemyCard.parent.type);

        const cardStats = card.getStats();
        const enemyStats = enemyCard.getStats();

        let damage = Math.round(cardStats.pow * move.power * efectivness - enemyStats.def);
        if (damage < 0) damage = 0;

        let hp = enemyStats.hp - damage;
        if (hp < 0) hp = 0;

        let data = { stat: { update: { hp: hp } } };
        if (hp === 0 && enemyCard.card.status === "FIGHT") {
            data["status"] = "DEAD";
            enemyCard.card.status = "DEAD";
        } else if (hp === 0 && enemyCard.card.status === "WILD_FIGHT") {
            data["status"] = "WILD_DEAD";
            enemyCard.card.status = "WILD_DEAD";
        }

        await db.cardInstance.update({
            where: { id: enemyCard.card.id },
            data: data
        });

        return { userId: this.battle[`userId${userIndex+1}`], cardId: card.card.id, type: "move", moveId, efectivness };
    }


    /**
     * Calculate the efectivness of the move
     * @param moveType Type1
     * @param enemyType Type2
     * @returns the efectivness
     */
    private getEfectivness(moveType: string, enemyType: string) {
        if (types[enemyType].weak.includes(moveType)) return 2;
        if (types[enemyType].strong.includes(moveType)) return 0.5;
        return 1;
    }

    /**
     * Select the move for AI enemy
     * @returns 
     */
    async enemyAI() {
        if (this.battle.type !== "PVE") return;

        this.userIndex = 1;

        const enemyCard = this.activeCards[rev(this.userIndex)];
        const enemyType = enemyCard.parent.type;

        const moves = this.activeCards[this.userIndex].moves;

        for (const move of moves) {
            //Remove moves that are out of PP
            const usedMoves = this.battle.history.filter((h: any) => h.type === "move" && h.cardId === this.activeCards[this.userIndex].card.id && h.moveId === move.id).length;
            if (usedMoves >= move.pp) moves.splice(moves.indexOf(move), 1);
        }

        const weakAgainst = types[enemyType].weak;
        const strongAgainst = types[enemyType].strong;

        const weakMoves = moves.filter((move) => strongAgainst.includes(move.type)).sort((a, b) => b.power - a.power);
        const strongMoves = moves.filter((move) => weakAgainst.includes(move.type)).sort((a, b) => b.power - a.power);
        const neutralMoves = moves.filter((move) => !weakAgainst.includes(move.type) && !strongAgainst.includes(move.type)).sort((a, b) => b.power - a.power);

        const perfectMove = strongMoves.length ? strongMoves[0] : neutralMoves.length ? neutralMoves[0] : weakMoves[0];
        if (!perfectMove) {
            //out of moves, choose whatever
            return await this.selectAction("move", { type: "move", moveId: moves[0].id, cardId: this.activeCards[this.userIndex].card.id });
        }

        await this.selectAction("move", { type: "move", moveId: perfectMove.id, cardId: this.activeCards[this.userIndex].card.id });
    }

    async end(): Promise<boolean> {
        let exp = 0;

        if (this.battle.type === "PVE") {
            exp = 300*this.activeCards[1].card.rarity;
        }

        await db.$transaction(async tx => {
            await tx.battle.update({
                where: { id: this.battle.id },
                data: { status: "ENDED" }
            });

            await tx.cardInstance.updateMany({
                where: { userId: { in: [this.battle.userId1, this.battle.userId2] }, status: "FIGHT", team: { gt: 0 } },
                data: { status: "IDLE", exp: exp }
            });

            if (this.battle.type === "PVE") {
                await tx.cardInstance.deleteMany({
                    where: { id: this.battle.cardId2 },
                });
            }
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

export default Battle;