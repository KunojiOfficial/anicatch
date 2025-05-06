import { InteractionReplyOptions } from "discord.js";

import Interactable from "../../classes/Interactable.ts";
import Card from "../../classes/Card.ts";
import Battle from "../../classes/Battle.ts";

export default new Interactable({
    id: 6,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, player, client } = interaction;
        let [ action, battleId, messageId ] = args;

        const team = await client.db.cardInstance.findMany({ where: { userId: player.data.id, team: { gt: 0 } }, include: { card: { include: { character: true } } }});
        if (!team.length) throw 68;

        const cards = team.map(t => new Card({ card: t, parent: t.card, character: t.card.character }));

        return {
            components: [ interaction.components.selectMenu({
                id: 5,
                options: cards.map(card => ({ 
                    label: card.name + ` [Lv. ${card.getLevel()}]`,
                    emoji: card.type.name.toLowerCase(),
                    value: card.card.id.toString(),
                    description: `{number_${card.currentHealth}} / {number_${card.maxHealth}}`
                })),
                placeholder: "{locale_main_selectCard}",
                args: { action: "item", battleId: battleId, messageId: messageId, itemId: interaction.values[0] },
                cooldown: { id: "battleSel", time: 5 }
            }) ],
            flags: ["Ephemeral"]
        };
    }
});