import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";
import Card from "../classes/Card";

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
                fields.push({ name: `{emoji_emptyBall} Empty Slot #${i}`, value: "-# *Empty slot for*\n-# *your Animon.*", inline: true });
                options.push({ label: `Slot #${i}`, emoji: "emptyBall", description: "Empty slot", value: `1:${i}`, default: i == slot });
                continue;
            }

            let card = new Card({ card: animon, parent: animon.card, character: animon.card.character, client: client });
            fields.push({
                name: `${animon.ball?.emoji} ${animon.card.character.name}`,
                value: `\`${card.getId().padEnd(7, " ")}\`\u2800${card.type.emoji}\n${card.rarity.emoji.full}`,
                inline: true
            });

            options.push({ label: `Slot #${i}`, hardEmoji: animon.ball!.emoji!, description: `${animon.card.character.name}`, value: `1:${i}`, default: i == slot });

        }

        fields.push({ name: "\u2800", value: "\u2800", inline: true });

        const components = [interaction.components.selectMenu({
            id: 0,
            options: options,
            placeholder: `💿\u2800Select a slot...`,
            args: { path: "team" }
        })];

        if (slot) {
            let animon = animons.find(a => a.team == slot);

            let buttons: any = [];
            if (animon) {
                buttons = [{
                    id: "0F",
                    label: "View Details",
                    emoji: "glass",
                    args: { path: "animon", cardId: animon.id }
                }, {
                    id: "12",
                    label: "Clear Slot",
                    emoji: "wno",
                    style: "red",
                    args: { action: "clear", slot: slot, where: "team", data: slot }
                }]
            } else {
                buttons = [{
                    id: "3",
                    label: "Add Animon",
                    emoji: "plus",
                    style: "green",
                    args: { modal: 2, slot: slot }
                }]
            }

            components.push(interaction.components.buttons(buttons))
        }

        return {
            embeds: [ interaction.components.embed({
                author: { name: `${player.user.displayName} - Team`, iconUrl: player.user.displayAvatarURL() },
                description: `Edit your team by using the menu below.\n-# The order of your slots determines which Animon will enter battle first.\n` + `\u2800`.repeat(40),
                fields: fields,
            }) ],
            components: components
        }
    }
}); 