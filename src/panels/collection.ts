import { InteractionReplyOptions, User } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

const PER_PAGE = 9;

export default new Panel({
    name: "collection",
    async execute(interaction: DiscordInteraction, page: number | string = 1, owner: User): Promise<InteractionReplyOptions> {
        const { user, client } = interaction;
        
        if (typeof page === 'string') page = parseInt(page);
        if (!owner) owner = user;

        const userData = await client.db.user.findFirst({ 
            where: { discordId: owner.id }, 
            include: { 
                cards: { 
                    where: { status: { notIn: ["FLED", "WILD"] } }, 
                    orderBy: { rarity: 'desc' }, 
                    include: { card: { include: { character: true } } } 
                } 
            } 
        });

        if (!userData) throw 7; //user not registered

        const cards = userData.cards;
        const pageCount = Math.ceil(cards.length/PER_PAGE);
        
        if (page < 1) page = pageCount;
        else if (page > pageCount) page = 1;
        
        const pageCards = cards.slice((page-1)*PER_PAGE, page*PER_PAGE);
        
        //get ballIcons
        const ballData = await client.db.item.findMany({ where: { type: "BALL" } });
        
        const fields = [], options = [];
        for (const c of pageCards) {
            const type = client.data.types[c.card.type.toString() as keyof typeof client.data.types];
            const rarity = client.data.rarities[c.rarity.toString() as keyof typeof client.data.rarities];
            const ball = ballData.find(b => b.id === c.ballId);
            const id = client.getId(c.cardId, c.print);

            fields.push({
                name: `${(ball?.emoji + " ") || "{emoji_empty}"}${c.card.character.name}`,
                value: `\`${id.padEnd(7, " ")}\`${type.emoji}\n${rarity.emoji.full}\n\u2800`,
                inline: true
            });

            options.push({
                label: c.card.character.name,
                hardEmoji: ball?.emoji || "",
                description: `${id}\u2800|\u2800${rarity.name}`,
                value: `1:${c.id.toString()}`
            });
        }

        const defaults = { id: '0', args: { path: "collection", page: page } };

        while (fields.length%3 !== 0) fields.push({ name: "\u2800", value: "\u2800", inline: true });

        const components = [ interaction.components.buttons([{
            ...defaults,
            emoji: "chevron.double.left",
            args: { ...defaults.args, page: pageCount + 5 },
            disabled: pageCount <= 1
        }, {
            ...defaults,
            emoji: "chevron.single.left",
            args: { ...defaults.args, page: page - 1 },
            disabled: pageCount <= 1
        }, {
            label: `\u2800` + `Page ${page} / ${pageCount}` + `\u2800`,
            disabled: pageCount <= 1
        }, {
            ...defaults,
            emoji: "chevron.single.right",
            args: { ...defaults.args, page: page + 1 },
            disabled: pageCount <= 1
        }, {
            ...defaults,
            emoji: "chevron.double.right",
            args: { ...defaults.args, page: -5 },
            disabled: pageCount <= 1
        }]) ];

        if (fields.length) components.unshift(interaction.components.selectMenu({
            id: 0,
            followUp: true,
            options: options.length ? options : [ { label: "test", value: "test" } ],
            placeholder: `💿\u2800Select an Animon to view its details!`,
            args: { path: "animon" }
        }))

        return {
            embeds: [ interaction.components.embed({
                author: { name: `${owner.displayName}'s Collection`, iconUrl: owner.displayAvatarURL() },
                description: `### Developer <:bigthree:1172168626627948565>\n**Sort by:** rarity (desc.)\n-# View details of an Animon by using the {command_animon} command or the select menu below.\n` + "\u2800".repeat(47),
                fields: fields
            }) ],
            components: components
        }
    }
});