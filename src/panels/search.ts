import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";

const ON_PAGE = 12;

export default new Panel({
    name: "vote",
    async execute(interaction: DiscordInteraction, name?: string, series?: string, page: number = 1): Promise<InteractionReplyOptions> {
        const { player, client } = interaction;

        if (typeof page === 'string') page = parseInt(page);

        const results = await client.db.cardCatalog.findMany({
            where: {
                character: { 
                    name: { contains: name ? name : "", mode: "insensitive" }
                },
                OR: [
                    { character: { series: { english_title: { contains: series ? series : "", mode: "insensitive" } } } },
                    { character: { series: { japanese_title: { contains: series ? series : "", mode: "insensitive" } } } },
                ]
            },
            include: { character: { include: { series: true } } }
        });

        const count = results.length;
        const pages = Math.ceil(count / ON_PAGE);

        if (page < 1) page = pages;
        else if (page > pages) page = 1;

        const cards = results.slice((page - 1) * ON_PAGE, page * ON_PAGE);

        let fields;
        if (cards.length) fields = cards.map(c => ({ name: `{emoji_${c.type.toLowerCase()}}\u2800` + c.character.name, value: `-# **${client.getId(c.id)}**\u2800` + c.character.series.english_title, inline: true }));
        else fields = [{ name: "{locale_main_noResults}", value: "{locale_main_noResultsText}" }];
        
        while (cards.length && fields.length < ON_PAGE) fields.push({ name: "\u2800", value: "\u2800", inline: true });

        const defaults = { id: '0', args: { path: "search", name: name, series: series, page: page } };

        return {
            embeds: [ interaction.components.embed({
                author: { name: `Anidex - ${player.user.displayName}`, iconUrl: player.user.displayAvatarURL() },
                description: `{locale_main_searchResults}\n` + (!player.config.isMobile && "\u2800".repeat(53)),
                fields: fields
            }, {
                count: [`**${count}**`]
            })],
            components: [ interaction.components.selectMenu({
                id: 0,
                followUp: true,
                placeholder: "{locale_main_selectAnimon}",
                options: cards.map(c => ({
                    label: c.character.name,
                    value: `1:${client.getId(c.id)}`,
                    description: c.character.series.english_title,
                    emoji: c.type.toLowerCase(),
                })),
                args: { path: "anidex", page: page }
            }), interaction.components.buttons([{
                ...defaults,
                emoji: "chevron.single.left",
                args: { ...defaults.args, page: page - 1 },
            }, {
                id: '5',
                label: `${page} / ${Math.ceil(count / ON_PAGE)}`,
                args: { min: 1, max: Math.ceil(count / ON_PAGE), index: 3, customId: Object.values(defaults.args).join(':') }
            }, {
                ...defaults,
                emoji: "chevron.single.right",
                args: { ...defaults.args, page: page + 1 },
            }, {
                emoji: "glass",
                id: "24"
            }]) ],
            files: []
        }
    }
}); 