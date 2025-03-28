import { InteractionReplyOptions } from "discord.js";

import Interactable from "../../classes/Interactable.ts";
import Card from "../../classes/Card.ts";
import Battle from "../../classes/Battle.ts";

export default new Interactable({
    id: 22,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, player, client } = interaction;
        let [ action, battleId ] = args;

        battleId = parseInt(battleId);
        if (isNaN(battleId)) throw "nan";

        const battle = await interaction.client.db.battle.findFirst({ where: { id: battleId, OR: [{ userId1: player.data.id }, { userId2: player.data.id }], status: "ACTIVE" } });
        if (!battle) throw 27;

        const userIndex = battle.userId1 === player.data.id ? 1 : 2;
        if (battle[`move${userIndex}`]) throw 69;

        if (action === "move") {
            const card = await client.db.cardInstance.findFirst({ where: { id: battle[`cardId${userIndex}`] }, include: { moves: true } });
            const moves = card.moves;

            await interaction.followUp({
                components: [ interaction.components.selectMenu({
                    id: 5,
                    options: moves.map(move => ({ 
                        label: `[${move.pp - battle.history.filter((h: any) => h.type === "move" && h.cardId === battle[`cardId${userIndex}`] && h.moveId === move.id).length}/${move.pp}] ${move.name}`,
                        description: `{locale_main_power}: ${move.power}\u2800|\u2800{locale_main_accuracy}: ${move.accuracy}\u2800({locale_main_${move.moveType}})`,
                        emoji: move.type.toLowerCase(),
                        value: move.id.toString()
                    })),
                    placeholder: "{locale_main_selectMove}",
                    args: { action: "move", battleId: battleId, messageId: interaction.message.id },
                    cooldown: { id: "battleSel", time: 5 }
                }) ],
                flags: ["Ephemeral"]
            });
        } else if (action === "item") {
            const items = await client.db.inventory.findMany({ where: { userId: player.data.id, item: { type: "CONSUMABLE" } }, include: { item: true } });
            if (!items.length) throw 24;

            await interaction.followUp({
                components: [ interaction.components.selectMenu({
                    id: 6,
                    options: items.map(item => ({ 
                        label: `{locale_items_${item.item.name}_name}`,
                        hardEmoji: item.item.emoji,
                        description: `x${item.count}`,
                        value: item.itemId.toString()
                    })),
                    placeholder: "{locale_main_selectItem}",
                    args: { action: "item", battleId: battleId, messageId: interaction.message.id }
                }) ],
                flags: ["Ephemeral"]
            });
        } else if (action === "team") {
            let team = await client.db.cardInstance.findMany({ where: { userId: player.data.id, team: { gt: 0 } }, include: { card: { include: { character: true } } }});
            team = team.filter(card => card.id !== battle[`cardId${userIndex}`] && card.status === "FIGHT");
            if (!team.length) throw 68;

            const cards = team.map(t => new Card({ card: t, parent: t.card, character: t.card.character }));

            await interaction.followUp({
                components: [ interaction.components.selectMenu({
                    id: 5,
                    options: cards.map(card => ({ 
                        label: card.getName() + ` [Lv. ${card.getLevel()}]`,
                        hardEmoji: card.getType().emoji,
                        value: card.card.id.toString(),
                        description: `{number_${card.getCurrentHealth()}} / {number_${card.getMaxHealth()}}`
                    })),
                    placeholder: "{locale_main_selectCard}",
                    args: { action: "team", battleId: battleId, messageId: interaction.message.id },
                    cooldown: { id: "battleSel", time: 5 }
                }) ],
                flags: ["Ephemeral"]
            });
        } else if (action === "forfeit") {
            const battleInstance = new Battle(battle, player.data.id, client);
            await battleInstance.selectAction("run", {});

            const panel = await client.panels.get("battle").execute(interaction, battle.id)
            return panel;
        }

        return {};
    }
});