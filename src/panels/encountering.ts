import { Component, InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";

import encounter from '../mechanics/encounter';
import Card from "../classes/Card";

import types from "../data/types.json";
import Rarity from "../classes/Rarity.ts";

export default new Panel({
    name: "encountering",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { user, player, client } = interaction;

        if (player.data.encounters < 1) {
            const notice = {
                embeds: [ interaction.components.embed({
                    description: `-# Code #**6**\n{locale_errors_6}`,
                    color: "#ff0000"
                }, {
                    timestamp: [ client.getNextEncounterDate(player.data, player.role!) ],
                    bot: [`${client.user}`]
                }) ],
                components: [ interaction.components.buttons([{
                    id: "0F",
                    label: "\u2800{locale_main_visitStore}",
                    emoji: "coin",
                    args: { path: "store", page: "ENCOUNTER" }
                }, {
                    id: "0F",
                    label: "\u2800{locale_main_vote}",
                    emoji: "sparkles",
                    args: { path: "vote" }
                }, {
                    id: "0F",
                    label: "\u2800{locale_main_getPremium}",
                    emoji: "gem",
                    args: { path: "premium" }
                }]) ]
            };

            if (interaction.isButton()) {
                await interaction.followUp(notice);
                return {}
            } else {
                return notice;
            }
        }

        //get user's balls :) 
        const balls = await client.db.inventory.findMany({ where: { userId: player.data.id, item: { type: "BALL" } }, include: { item: true } });
        balls.sort((a,b) => a.itemId-b.itemId);

        if (!balls.length) {
            const notice = {
                embeds: [ interaction.components.embed({
                    description: `-# Code #**12**\n{locale_errors_12}`,
                    color: "#ff0000"
                }) ],
                components: [ interaction.components.buttons([{
                    id: "0F",
                    label: "{locale_main_visitStore}",
                    emoji: "smallCoin",
                    args: { path: "store", page: "BALL" }
                }]) ]
            };

            if (interaction.isButton()) {
                await interaction.followUp(notice);
                return {}
            } else {
                return notice;
            }
        }

        const data = await encounter(interaction);
        
        const card = new Card({card: data.insert, parent: data.result});

        //get image
        const attachment = await card.generateImage();

        const type = types[data.result.type.toString() as keyof typeof types];
        const escapeTime = new Date();
        escapeTime.setSeconds(escapeTime.getSeconds() + 15);

        let text = "";
        text += `{locale_main_wildAppeared}`;
        if (data.result.character.series) text += `\n-# {locale_main_wildAppeared2}`;
        text += `\n\n{locale_main_wildAppeared3}`;
        text += `\n{locale_main_wildAppeared4}`;
        text += `\n-# {locale_main_wildAppeared5}`;

        let followUp:any;
        //edit message after animon escapes
        const timeOutId = setTimeout(async () => {
            try {
                await followUp.edit({
                    components: interaction.componentsV2.construct([
                        { type: "Container", container_data: { color: data.rarity.color }, components: [
                            { type: "TextDisplay", text_display_data: { content: `-# ${user} | ID: \`${card.getId()}\`` } },
                            { type: "Separator" },
                            { type: "TextDisplay", text_display_data: { content: text } },
                            { type: "Separator" },
                            { type: "MediaGallery", media_gallery_data: { items: [ { media: { url: "attachment://card.jpg" } } ] } }
                        ] },
                        { type: "Container", component_id: 500, container_data: { color: "#ffffff" },  components: [
                            { type: "TextDisplay", text_display_data: { content: "🏃\u2800{locale_main_catchEscape}" } },
                        ]}
                    ], {
                        name: [`**${data.result.character.name}**`],
                        series: [`**${data.result.character?.series?.english_title}**`],
                        type: [`**{emoji_${type.name.toLowerCase()}} ${type.name}**`],
                        rarity: [`**${(new Rarity(data.insert.rarity)).getShortEmoji()} ${data.rarity.name}**`],
                        rate: [`**${data.rarity.chance}%**`],
                        date: [`${client.unixDate(escapeTime)}`]
                    })
                });
            } catch (err) {}
        }, 1000 * 15);

        const ballButtons = balls.map( b => ({
            component_id: 3000+b.itemId,
            type: "Button",
            button_data: {
                id: 1,
                label: b.count.toString(),
                hardEmoji: b.item.emoji,
                args: { cardId: data.insert.id, ballId: b.itemId, timeoutId: Number(data.timeout), embedTimeout: Number(timeOutId) }
            }
        }))

        let j = -1;
        const actionRows = [];
        for (const [index, button] of ballButtons.entries()) {
            if (index % 3 === 0) {
                actionRows.push({ type: "ActionRow", component_id: 400+index, components: [] });
                j++;
            }

            actionRows[j].components.push(button);
        }

        followUp = await interaction.followUp({
            flags: ["IsComponentsV2"],
            files: [attachment!],
            components: interaction.componentsV2.construct([
                { type: "Container", container_data: { color: data.rarity.color }, components: [
                    { type: "TextDisplay", text_display_data: { content: `-# ${user} | ID: \`${card.getId()}\`` } },
                    { type: "Separator" },
                    { type: "TextDisplay", text_display_data: { content: text } },
                    { type: "Separator" },
                    { type: "MediaGallery", media_gallery_data: { items: [ { media: { url: "attachment://card.jpg" } } ] } },
                    ...actionRows,
                ] },
                { type: "Container", component_id: 500, container_data: { color: data.rarity.color }, components: [
                    { type: "TextDisplay", text_display_data: { content: `{emoji_aniball}\u2800{locale_main_useItemsAbove}\n-# \u2800\u2800\u2800 {locale_main_escapes}` } },
                ]},
                { type: "ActionRow", components: [
                    { type: "Button", button_data: { id: "17", label: "{locale_main_battle}!", emoji: "fight", style: "Danger", args: { id: Number(timeOutId), id2: Number(data.timeout), cardId: card.card.id } } },
                    { type: "Button", button_data: { id: "2", label: `{locale_main_next} (${player.data.encounters-1})`, emoji: "next", style: "Success", args: { id: Number(timeOutId) }, cooldown: { id: "next", time: 2 } } },
                ] }
            ], {
                name: [`**${data.result.character.name}**`],
                series: [`**${data.result.character?.series?.english_title}**`],
                type: [`**{emoji_${type.name.toLowerCase()}} ${type.name}**`],
                rarity: [`**${(new Rarity(data.insert.rarity)).getShortEmoji()} ${data.rarity.name}**`],
                rate: [`**${data.rarity.chance}%**`],
                date: [`${client.unixDate(escapeTime)}`]
            })
        })

        return {};
    }
});