import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";

import Panel from "../classes/Panel.ts";
import Card from "../classes/Card.ts";

export default new Panel({
    name: "team",
    async execute(interaction: DiscordInteraction, slot?: string | number): Promise<InteractionReplyOptions> {
        const { player, client } = interaction;

        const animons = await client.db.cardInstance.findMany({ 
            where: { userId: player.data.id, team: { gt: 0 } }, 
            include: { card: { include: { character: true } }, ball: true } 
        });
        
        const fields = [], options = [];
        for (let i = 1; i < 6; i++) {
            let animon = animons.find(a => a.team === i);
            
            if (!animon) {
                fields.push({ name: `{emoji_emptyball} {locale_main_emptySlot} #${i}`, value: "{locale_main_emptySlotText}", inline: true });
                options.push({ label: `Slot #${i}`, emoji: "emptyball", description: "Empty slot", value: `1:${i}`, default: i == slot });
                continue;
            }

            let card = new Card({ card: animon, parent: animon.card, character: animon.card.character });
            fields.push({
                name: `${animon.ball?.emoji} ${animon.card.character.name}`,
                value: `\`${card.getId().padEnd(7, " ")}\`\u2800{emoji_${card.type.name.toLowerCase()}}\n${card.rarityInstance.getLongEmoji()}`,
                inline: true
            });

            options.push({ label: `Slot #${i}`, hardEmoji: animon.ball!.emoji!, description: `${animon.card.character.name}`, value: `1:${i}`, default: i == slot });

        }

        fields.push({ name: "\u2800", value: "\u2800", inline: true });

        const components = [interaction.components.selectMenu({
            id: 0,
            options: options,
            placeholder: `💿\u2800{locale_main_selectSlot}`,
            args: { path: "team" }
        })];

        if (slot) {
            let animon = animons.find(a => a.team == slot);

            let buttons: any = [];
            if (animon) {
                buttons = [{
                    id: "0F",
                    label: "{locale_main_viewDetails}",
                    emoji: "glass",
                    args: { path: "animon", cardId: animon.id }
                }, {
                    id: "12",
                    label: "{locale_main_clearSlot}",
                    emoji: "wno",
                    style: "red",
                    args: { action: "clear", slot: slot, where: "team", data: slot }
                }]
            } else {
                buttons = [{
                    id: "3",
                    label: "{locale_main_addAnimon}",
                    emoji: "plus",
                    style: "green",
                    args: { modal: 2, slot: slot }
                }]
            }

            components.push(interaction.components.buttons(buttons))
        }

        return {
            embeds: [ interaction.components.embed({
                author: { name: `${player.user.displayName} - {locale_main_team}`, iconUrl: player.user.displayAvatarURL() },
                description: `{locale_main_teamText}\n` + `\u2800`.repeat(40),
                fields: fields,
            }) ],
            components: components
        }
    }
}); 