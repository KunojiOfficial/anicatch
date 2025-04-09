import { createCanvas, loadImage, registerFont } from 'canvas';
import { BaseMessage } from "discord-hybrid-sharding";
import { Battle as DbBattle, PrismaClient } from "@prisma/client";

// import { manager, db } from "../../index.ts";
import { DiscordClient, HistoryElement } from "../types.ts";
import { numberWithCommas, parseColor } from "../helpers/utils.ts";

import consumable from "../mechanics/consumable.ts";
import { calculateAtk, calculateDmg, calculateDroppedExp } from "../mechanics/statsCalculator.ts";

import types from "../data/types.json";
import locale from "../locale/items/en-US.json";

import Card from "./Card.ts";
import { drawCard, drawStats } from '../helpers/battleCanvas.ts';

function rev(i: number) { return i === 0 ? 1 : 0; }

registerFont('./src/assets/fonts/Ebrima.ttf', { family: 'Ebrima' });

class Battle {
    battle: DbBattle;
    userIndex: number;
    isAi: boolean = false;

    activeCards: Card[] = [];
    movesOrdered: any[] = [];
    aliveCards: number[] = [];

    cachedCard?: any;

    client: DiscordClient;

    constructor(battle: DbBattle, userId: number, client: DiscordClient) {
        this.battle = battle;
        this.userIndex = userId === battle.userId1 ? 0 : 1;

        this.client = client;

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

        await this.client.db.battle.update({
            where: { id: this.battle.id },
            data: {
                [`move${this.userIndex+1}`]: { userIndex: this.userIndex, type, ...data }
            }
        });

        this.battle[`move${this.userIndex+1}`] = { userIndex: this.userIndex, type, ...data };

        if (this.battle.move1 && this.battle.move2) {
            //execute actions
            await this.executeActions();
        } else if (this.battle.move1 && this.battle.type === "PVE") {
            await this.enemyAI();
        }
    }

    /**
     * Set the active cards for the battle
     */
    private async setActiveCards() {
        const [cards, alive1, alive2] = await Promise.all([
            this.client.db.cardInstance.findMany({
                where: { id: { in: [this.battle.cardId1, this.battle.cardId2] } },
                include: { card: { include: { character: true } }, moves: true }
            }),
            this.client.db.cardInstance.findMany({where: { userId: this.battle.userId1, status: { in: ["DEAD", "FIGHT"] }, team: { gt: 0 }}, select: { id: true }}),
            this.client.db.cardInstance.findMany({where: { userId: this.battle.userId2, status: { in: ["DEAD", "FIGHT"] }, team: { gt: 0 }}, select: { id: true }})
        ])

        this.aliveCards = [alive1.length, alive2.length];

        const card1 = cards.find(c => c.id === this.battle.cardId1);
        const card2 = cards.find(c => c.id === this.battle.cardId2);

        this.activeCards = [
            new Card({ card: card1, parent: card1.card, character: card1.card.character, moves: card1.moves }),
            new Card({ card: card2, parent: card2.card, character: card2.card.character, moves: card2.moves })
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
        const card = await this.client.db.cardInstance.findFirst({
            where: { id: cardId, userId, status: "FIGHT", team: { gt: 0 } },
            include: { card: true, moves: true }
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

        if (move1.type === "switch" || move1.type === "item" || move1.type === "run") this.movesOrdered = [move1,move2];
        else if (move2.type === "switch" || move2.type === "item" || move2.type === "run") this.movesOrdered = [move2,move1];
        else if (move1.type === "move" && move2.type === "move") {
            //who goes first based on agi
            const stats1 = this.activeCards[0].getStats();
            const stats2 = this.activeCards[1].getStats();

            if (stats1.agi > stats2.agi) this.movesOrdered = [move1,move2];
            else if (stats1.agi === stats2.agi) this.movesOrdered = Math.random() < 0.5 ? [move1,move2] : [move2,move1];
            else this.movesOrdered = [move2,move1];
        } else {
            //one move, one switch
            this.movesOrdered = [move1,move2];
        }

        const history = [];
        
        for (const [i, move] of this.movesOrdered.entries()) {
            let moveResult;
            if (move.type === "move") {
                moveResult = await this.move(move.moveId, move.userIndex, i);
            } else if (move.type === "switch") {
                moveResult = await this.switch(move.cardId, move.userIndex);
            } else if (move.type === "skip") {
                moveResult = { userId: this.battle[`userId${move.userIndex+1}`], cardId: this.battle[`cardId${move.userIndex+1}`], type: "skip" };
            } else if (move.type === "item") {
                moveResult = await this.item(move.cardId, move.itemId, this.battle[`userId${move.userIndex+1}`]);
            } else if (move.type === "run") {
                return await this.end(false, this.battle[`userId${rev(move.userIndex)+1}`]);
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

            if (deadCard.card.status === "WILD_DEAD") return await this.end(true, this.battle.userId1);

            this.cachedCard = await this.client.db.cardInstance.findFirst({
                where: { userId: deadCard.card.userId, status: "FIGHT", team: { gt: 0 } },
                orderBy: { team: "asc" }
            });
    
            if (!this.cachedCard) {
                return await this.end(false, deadCard.card.userId === this.battle.userId1 ? this.battle.userId2 : this.battle.userId1);
            }

            let index = deadCard.card.userId === this.battle.userId1 ? 1 : 2;
            data[`cardId${index}`] = this.cachedCard.id;
        }

        //update battle
        await this.client.db.battle.update({
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

    private async item(cardId: number, itemId: number, userId: number): Promise<HistoryElement> {
        try {
            const itemData = await consumable({ client: this.client, player: { data: { id: userId } } } as any, itemId, cardId, 1, true);
            if (cardId === this.battle.cardId1 || cardId === this.battle.cardId2) await this.setActiveCards();
            return { userId, cardId, type: "item", itemId, itemData: { name: locale[itemData.item.name].name } };
        } catch (e) {
            return { userId, cardId, type: "fail" };
        }
    }

    /**
     * Switch to the chosen card
     * @param cardId the id of the card to switch to
     * @param order the move order
     * @returns HistoryElement
     */
    private async switch(cardId: number, userIndex: number): Promise<HistoryElement> {
        const owner = this.battle[`userId${userIndex+1}`];
        const card = this.cachedCard ? this.cachedCard : await this.client.db.cardInstance.findFirst({
            where: { id: cardId, userId: owner, status: "FIGHT", team: { gt: 0 } },
            include: { card: true, moves: true }
        });

        if (!card) return { userId: owner, cardId, type: "fail" };
        
        await this.client.db.battle.update({
            where: { id: this.battle.id },
            data: {
                [`cardId${userIndex+1}`]: card.id
            }
        });

        this.battle[`cardId${userIndex+1}`] = card.id;
        this.activeCards[userIndex] = new Card({ card, parent: card.card, moves: card.moves });

        return { userId: owner, cardId, type: "switch" };
    }

    /**
     * Skips the turn for the user
     * @param userIndex 
     * @returns 
     */
    private async skip() {
        await this.client.db.battle.update({
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

        if (!move || card.card.status === "DEAD") return { userId: this.battle[`userId${userIndex+1}`], cardId: card.card.id, type: "fail" };

        const enemyCard = this.activeCards[rev(userIndex)];
        const cardStats = card.getStats();
        const enemyStats = enemyCard.getStats();
        
        let data = {}, efectivness: 1 | 0.5 | 2 = 1, defended = 0, damage = 0, hp = -1, moveType, miss = false;
        if (move.moveType === "ATTACK" || move.moveType === "SPIRIT_ATTACK") {
            let isSpirit = move.moveType === "SPIRIT_ATTACK";
            efectivness = this.getEfectivness(move.type, enemyCard.parent.type);

            if (order === 1) { //move is second, check for defense of enemy
                const enemyMove = enemyCard.moves.find(m => m.id === (this.battle.move1 as any).moveId);
                if (enemyMove && enemyMove.moveType === (isSpirit ? "SPIRIT_DEFENSE" : "DEFENSE")) {
                    defended = isSpirit ? calculateAtk(enemyStats.res, enemyMove.power) :  calculateAtk(enemyStats.def, enemyMove.power);
                }
            }

            damage = calculateDmg(
                calculateAtk(isSpirit ? cardStats.spi : cardStats.pow, move.power),
                isSpirit ? enemyStats.res : enemyStats.def,
                efectivness,
                defended
            );

            if (this.battle.type === "PVE" && card.card.status === "WILD_FIGHT") damage *= 0.5; //wild card damage 

            if (move.accuracy !== 100) {
                const hit = Math.random() < move.accuracy/100;
                if (!hit) {
                    miss = true;
                    damage = 0;
                }
            }

            hp = enemyStats.hp - damage;
            if (hp < 0) hp = 0;
    
            data = { hp: hp };
            if (hp === 0 && enemyCard.card.status === "FIGHT") {
                data["status"] = "DEAD";
                enemyCard.card.status = "DEAD";
            } else if (hp === 0 && enemyCard.card.status === "WILD_FIGHT") {
                data["status"] = "WILD_DEAD";
                enemyCard.card.status = "WILD_DEAD";
            }

            await this.client.db.cardInstance.update({
                where: { id: enemyCard.card.id },
                data: data
            });
        }


        return { userId: this.battle[`userId${userIndex+1}`], cardId: card.card.id, type: "move", moveId, efectivness, kill: hp === 0 ? enemyCard.card.id : 0, damage, defended, moveType, miss };
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

    async end(isWin: boolean = true, winner?: number): Promise<boolean> {
        const user = await this.client.db.user.findFirst({ where: { id: winner }, include: { role: true } });
        let exp = 0;

        if (this.battle.type === "PVE") exp = isWin ? calculateDroppedExp(this.activeCards[1].getLevel()) : 0;

        await this.client.db.$transaction(async tx => {
            await tx.battle.update({
                where: { id: this.battle.id },
                data: { status: "ENDED", winnerId: winner, rewards: { exp: exp } }
            });

            await tx.cardInstance.updateMany({
                where: { userId: { in: [this.battle.userId1, this.battle.userId2] }, status: "FIGHT", team: { gt: 0 } },
                data: { status: "IDLE" }
            });

            if (exp > 0) {
                await tx.cardInstance.updateMany({
                    where: { id: this.activeCards[0].card.id },
                    data: { exp: { increment: exp } }
                });

                //exp share
                if (user.role.expShare > 0) {
                    const team = await tx.cardInstance.findMany({
                        where: { userId: user.id, team: { gt: 0 } }
                    });

                    for (const card of team.filter(c => c.id !== this.activeCards[0].card.id)) {
                        const cardObj = new Card({ card });
                        if (!cardObj.canLevel()) continue;

                        const sharedExp = Math.floor(exp * user.role.expShare);
                        await tx.cardInstance.update({
                            where: { id: card.id },
                            data: { exp: { increment: sharedExp } }
                        });
                    }
                }
            }

            if (this.battle.type === "PVE") {
                await tx.cardInstance.deleteMany({
                    where: { id: this.battle.cardId2 },
                });
            }
        });

        // let hasLeveledUp = false;
        // if (exp > 0 && this.activeCards[0].canLevel()) {
        //     const card = this.activeCards[0];
        //     const level = card.getLevel();
        //     if (level != card.getLevel(card.card.exp+exp)) hasLeveledUp = true;
        // }

        // let message = "**The battle has ended!**";
        // if (exp > 0) {
        //     if (this.activeCards[0].canLevel()) message += `\n**${this.activeCards[0].character.name}** received **${numberWithCommas(exp)} EXP**!`;
        //     if (user.role.expShare > 0) message += `\nThe rest of Animons in your team received **${numberWithCommas(Math.floor(exp * user.role.expShare))} EXP**!`;
        // }

        // if (hasLeveledUp) {
        //     const newLevel = this.activeCards[0].getLevel() + 1;
        //     message += `\n\n**${this.activeCards[0].character.name}** has leveled up!\nNew level: **${newLevel}**`;
        // } else if (!isWin) {
        //     message += "\nAll your Animons have fainted!\nYou lost the battle!";
        // }

        // if (winner && this.battle.type === "PVP") {
        //     message = `**${user.username}** has won the battle!`;
        // }

        // this.client.cluster.manager.broadcast(new BaseMessage({action: "edit", channelId: this.battle.channelId, messageId: this.battle.messageId, content: {
        //     embeds: [ {
        //         description: message,
        //         image: { url: "attachment://card.jpg" },
        //         color: parseColor("#ffffff")
        //     } ],
        //     components: []
        // }}));

        return true;
    }

    /**
     * Check if the move is selected
     * @returns true if move is selected
     */
    public isMoveSelected() {
        return this.battle[`move${this.userIndex+1}`] !== null;
    }

    public getOpponent() {
        return this.userIndex === 0 ? this.battle.userId2 : this.battle.userId1;
    }

    public getWinnerIndex() {
        return this.battle.winnerId === this.battle.userId1 ? 0 : 1;
    }

    /**
     * Generate the battle canvas
     * @param width the width of canvas
     * @param height the height of canvas
     * @returns the canvas
     */
    public async generateCanvas(width: number = 1200, height: number = 600) {
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        if (this.battle.status !== "ACTIVE") return null;
        if (!this.activeCards.length) await this.setActiveCards();

        const card1Data = this.activeCards[0];
        const card2Data = this.activeCards[1];

        // Load images
        const [ bg, card1, card2, rarity1, rarity2, type1, type2, ball ] = await Promise.all([
            loadImage('./src/assets/battle/bg1.png'),
            loadImage(`./src/assets/cards/${card1Data.parent.id-1}.jpg`),
            loadImage(`./src/assets/cards/${card2Data.parent.id-1}.jpg`),
            loadImage(`./src/assets/rarities/${card1Data.card.rarity}.png`),
            loadImage(`./src/assets/rarities/${card2Data.card.rarity}.png`),
            loadImage(`./src/assets/types/${card1Data.parent.type}.png`),
            loadImage(`./src/assets/types/${card2Data.parent.type}.png`),
            loadImage('./src/assets/battle/aniball.png')
        ]);

        // Draw background
        ctx.drawImage(bg, 0,0, width, height);

        // Draw cards
        drawCard(ctx, card1, 206, 33, rarity1, card1Data.card.rarity);
        drawCard(ctx, card2, 732, 33, rarity2, card2Data.card.rarity);

        // Draw stats
        drawStats(ctx, ball, 66, 430, type1, card1Data.character.name, card1Data.getLevel(), card1Data.getCurrentHealth()/card1Data.getMaxHealth(), this.aliveCards[0]);
        drawStats(ctx, ball, 590, 430, type2, card2Data.character.name, card2Data.getLevel(), card2Data.getCurrentHealth()/card2Data.getMaxHealth(), this.battle.type === "PVE" ? 1 : this.aliveCards[1]);

        return canvas;
    }
}

export default Battle;