import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";
import Card from "../classes/Card.ts";

const emojis = {
    "ATTACK": "⚔️",
    "DEFENSE": "🛡️",
    "SPIRIT_ATTACK": "✨",
    "SPIRIT_DEFENSE": "💨"
}

export default new Panel({
    name: "moves",
    async execute(interaction: DiscordInteraction, cardId: number | string, slot: number | string = 1, type: string = "ATTACK", moveId: number | string): Promise<InteractionReplyOptions> {
        const { client } = interaction;

        if (typeof cardId === 'string') cardId = parseInt(cardId);
        if (typeof moveId === 'string') moveId = parseInt(moveId);
        if (typeof slot === 'string') slot = parseInt(slot);

        const panel = await client.panels.get("animon")!.execute!(interaction, cardId, false, "moves");
        const animon = await client.db.cardInstance.findFirst({ where: { id: cardId }, include: { card: true, moves: true } });

        if (!animon || animon.userId !== interaction.player.data.id) throw 59;

        const card = new Card({ card: animon, parent: animon.card });

        const availableMoves = await client.db.moveInventory.findMany({ where: { OR: [ {move: {type: card.parent.type}}, {move: {type: "NONE"}} ], move: {requiredLevel: { lte: card.getLevel() }} }, orderBy: [{move: { type: "asc" }}, {move: {power: "asc"}}], include: { move: true } });
        const moveTypes = [... new Set(availableMoves.map(m => m.move.moveType))];

        if (!moveTypes.includes(type as any)) type = moveTypes[0];

        const defaults = { id: '0', args: { path: "moves", cardId: cardId, slot: slot, type: type, moveId: moveId } };
        
        let components = [interaction.components.selectMenu({
            ...defaults,
            id: 0,
            placeholder: "⭐\u2800{locale_main_selectSlot}",
            options: [...Array(4).keys()].map(i => ({ 
                label: animon.moves[i] ? animon.moves[i].name : `{locale_main_emptyMove} ${i+1}`, 
                value: `2:${i+1}`,
                emoji: animon.moves[i] ? animon.moves[i].type.toLowerCase() : "no",
                default: i+1 == slot 
            })),
            args: {...defaults.args, slot: 0 }
        })]

        if (!animon.moves[slot-1]) {
            components = [...components,
                interaction.components.selectMenu({
                    ...defaults,
                    id: 0,
                    placeholder: "⭐\u2800{locale_main_selectMoveType}",
                    options: moveTypes.map((mType, i) => ({ 
                        label: `{locale_main_${mType}}`, 
                        value: `3:${mType}`, 
                        default: mType === type,
                        hardEmoji: emojis[mType]
                    })),
                    args: {...defaults.args, type: "0" }
                }),
                interaction.components.selectMenu({
                    ...defaults,
                    id: 0,
                    placeholder: "⭐\u2800{locale_main_selectMove}",
                    options: availableMoves.filter(move => move.move.moveType === type).map((move, i) => ({ 
                        label: move.move.name, 
                        emoji: move.move.type.toLowerCase(), 
                        value: `4:${move.move.id}`, 
                        default: move.move.id === moveId,
                        description: `{locale_main_power}: ${move.move.power} | {locale_main_accuracy}: ${move.move.accuracy}% | {locale_main_limit}: ${move.move.pp}`
                    })),
                    args: {...defaults.args, moveId: "1" }
                })
            ]

            if (moveId) {
                const move = availableMoves.find(m => m.move.id === moveId);

                components = [...components,
                    interaction.components.buttons([{
                        id: "21",
                        label: "\u2800{locale_main_learn} ",
                        style: "green",
                        emoji: "wyes",
                        args: { action: "learn", cardId: cardId, slot: slot, moveId: moveId },
                        cooldown: { id: "learn", time: 2 }
                    }])
                ];
            }
        } else {
            components = [...components,
                interaction.components.buttons([{
                    id: "21",
                    label: "{locale_main_unlearn}",
                    style: "red",
                    emoji: "wno",
                    args: { action: "remove", cardId: cardId, slot: slot, moveId: animon.moves[slot-1].id }
                }])
            ]
        }

        return {
            ...panel,
            components: [...components, interaction.components.buttons([{
                label: "{locale_main_back}",
                emoji: "back",
                id: "0",
                args: { path: "animon", cardId: cardId, userAccess: false, page: "moves" }
            }])]
        }
    }
}); 