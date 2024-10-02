import { AttachmentBuilder, InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

export default new Panel({
    name: "animon",
    async execute(interaction: DiscordInteraction, id: string | number, userAccess: boolean = false): Promise<InteractionReplyOptions> {
        const { client } = interaction;

        if (typeof id !== 'number' && !userAccess) id = parseInt(id);
        
        let where = { id: id } as any;
        
        if (userAccess) {
            const [ cardId, print ] = (id as string).split("-"); //for human ID system as ABC-123       

            if (!id || !print) throw 8;
            where = { cardId: client.getIdReverse(cardId), print: parseInt(print) };
        }

        const animon = await client.db.cardInstance.findFirst({ where: where, include: { card: { include: { character: true } }, ball: true, user: true } });
        if (!animon) throw 5;

        const rarity = client.data.rarities[animon.rarity.toString() as keyof typeof client.data.rarities];
        const type = client.data.types[animon.card.type.toString() as keyof typeof client.data.types];

        const filePath = `./src/assets/cards/${animon.card.id-1}.jpg`;
        const attachment = new AttachmentBuilder(filePath, { name: "card.jpg" });

        const owner = await client.users.fetch(animon.user.discordId);

        return { 
            embeds: [ interaction.components.embed({
                fields: [
                    { name: "\u2800", value: `-# Name\n${animon.card.character.name}\u2800\u2800\n-# Type\n${type.name} ${type.emoji}\n-# Caught\n${client.unixDate(animon.createdAt)}`, inline: true },
                    { name: "\u2800", value: `-# ID\n\`${client.getId(animon.cardId, animon.print).padEnd(7, " ")}\`\n-# Ball\n${animon.ball?.name} ${animon.ball?.emoji}`, inline: true },
                    { name: "\u2800", value: `-# Rarity\n**${rarity.name}** (${rarity.chance}%)\n${rarity.emoji.full}` },
                ],
                color: rarity.color,
                image: "attachment://card.jpg"
            }) ],
            files: [attachment]
        }
    }
});