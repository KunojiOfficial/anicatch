import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";
import Card from "../../classes/Card";

export default new Interactable({
    id: 11,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args, player } = interaction;
        let [ id ] = args;
        id = parseInt(id);

        const animon = await client.db.stat.findFirst({ where: { cardId: id }, include: { card: { include: { card: true } } } });
        if (!animon) throw 5;

        const card = new Card({card: animon.card, parent: animon.card.card, stats: animon, client: client});
        const stats = card.getStats();
    
        const fields = [];
        for (const key of Object.keys(stats)) {
            if (key === "hp") continue;
            fields.push({ 
                name: client.formatText(`{locale_main_stats_${key}}`, interaction.locale),
                value: `${stats[key as keyof typeof stats]}\n-# ${animon[key as keyof typeof animon]}/20`,
                inline: true
            });
        }

        if (interaction.message.embeds[0].fields.length) return {};

        return {
            embeds: [{
                ...interaction.message.embeds[0].data,
                description: interaction.message.embeds[0].data.description + "\n\u2800",
                fields: fields,
                image: { url: "attachment://card.jpg" }
            }]
        };
    }
});