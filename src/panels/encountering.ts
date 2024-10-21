import { InteractionReplyOptions, AttachmentBuilder } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

import encounter from '../mechanics/encounter';
import Card from "../classes/Card";

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
                    timestamp: [ client.getNextEncounterDate(player.data) ],
                    bot: [`${client.user}`]
                }) ],
                components: [ interaction.components.buttons([{
                    id: "0F",
                    label: "Visit Store",
                    emoji: "smallCoin",
                    args: { path: "store" }
                }, {
                    label: "Vote"
                }, {
                    label: "Become a Patron"
                }]) ]
            };

            if (interaction.isButton()) {
                await interaction.followUp(notice);
                return {}
            } else {
                return notice;
            }
        }

        //get user balls :)
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
                    label: "Visit Store",
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

        const type = client.data.types[data.result.type.toString() as keyof typeof client.data.types];
        const escapeTime = new Date();
        escapeTime.setSeconds(escapeTime.getSeconds() + 10);

        const embed = {
            description: `-# ${client.getId(data.insert.cardId, data.insert.print)}\n\n🍃 A wild **${data.result.character.name}** has appeared!\nIt's a **${type.emoji} ${type.name}** type!\n\nYou got the **${data.rarity.emoji.short} ${data.rarity.name}** rarity\nwith a **${data.rarity.chance}%** encounter rate!\n\n-# Escapes ${client.unixDate(escapeTime)}...`,
            image: "attachment://card.jpg",
            color: data.rarity.color
        };

        let followUp:any;
        //edit message after animon escapes
        const timeOutId = setTimeout(async () => {
            try {
                await followUp.edit({
                    components: [],
                    embeds: [ 
                        {
                            ...followUp.embeds[0].data,
                            description: followUp.embeds[0].data.description?.substring(0, followUp.embeds[0].description?.indexOf("-#", 3)), 
                            image: { url: "attachment://card.jpg" },
                        },
                        interaction.components.embed({
                            color: "#ffffff",
                            description: "🏃\u2800{locale_main_catchEscape}"
                        })
                    ]
                });
            } catch (err) {}
        }, 1000 * 10);

        const buttons = balls.map(b => ({ emoji: b.item.emoji, label: b.count.toString(), id: 1, args: { cardId: data.insert.id, ballId: b.itemId, timeoutId: data.timeout, embedTimeout: timeOutId } }));

        let k = -1, components = [];
        for (const [index, button] of buttons.entries()) {
            if (index % 5 === 0) {
                components.push([]);
                k++;
            }

            components[k].push(button as never);
        }

        if (components.length) components = components.map(c => interaction.components.buttons(c));

        components.push(interaction.components.buttons([{
            id: '2',
            label: `Next (${player.data.encounters-1})`,
            emoji: "next",
            cooldown: { id: "next", time: 2 },
            args: { id: timeOutId },
        }]))

        //send message
        followUp = await interaction.followUp({
            content: `${user}`,
            embeds: [interaction.components.embed(embed)],
            files: [attachment!],
            components: components.length ? components as any : []
        });

        return {};
    }
});