import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command.ts';
import ComponentsV2 from '../../classes/ComponentsV2.ts';

export default new Command({
    emoji: "🏓",
    dontReply: true,
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Pong!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall),
    async execute(interaction): Promise<void> {
        // const message = await interaction.deferReply({ withResponse: true });

        // //db speed
        // const now = new Date();
        // await interaction.client.db.$executeRaw`SELECT 1`;
        // const elapsed = (new Date()).getTime() - now.getTime();

        // await interaction.editReply({
        //     embeds: [
        //         interaction.components.embed({
        //             description: `Pong! Shard #${interaction.guild !== undefined ? (interaction.guild?.shardId||-1) : -1}\n\n\`${interaction.client.ws.ping}ms, ${message.interaction.createdTimestamp - interaction.createdTimestamp}ms, ${elapsed}ms\``
        //         })
        //     ]
        // });


        const componentsV2 = new ComponentsV2(interaction.client, interaction.locale, interaction.player);

        // await interaction.reply()
        await componentsV2.send(interaction, {
            components: [
                { type: "Container", components: [
                    { type: "MediaGallery", media_gallery_data: { items: [ { media: { url: "https://media.discordapp.net/attachments/697138785317814292/1364347504702914602/docs-header.png?ex=6809ffe1&is=6808ae61&hm=85422951b5867f0fc6b6d664d04ea5350b3df8e77a2ac6109aba5ee469ccdf2a&format=webp&quality=lossless&" } } ]  } },
                    { type: "Separator" },
                    {
                        type: "Section",
                        section_data: { 
                            components: [
                                { type: "TextDisplay", text_display_data: { content: "**Ichigo Kurwosaki**\n⭐⭐⭐⭐⭐" } },
                            ],
                            accessory: { type: "Button", button_data: {
                                label: "View Card", style: "Success"
                            } }
                        }
                    },
                    {
                        type: "Section",
                        section_data: { 
                            components: [
                                { type: "TextDisplay", text_display_data: { content: "**Ichigo Kurwosaki**\n⭐⭐⭐⭐⭐" } },
                            ],
                            accessory: { type: "Button", button_data: {
                                label: "View Card", style: "Success"
                            } }
                        }
                    },
                    {
                        type: "Section",
                        section_data: { 
                            components: [
                                { type: "TextDisplay", text_display_data: { content: "**Ichigo Kurwosaki**\n⭐⭐⭐⭐⭐" } },
                            ],
                            accessory: { type: "Button", button_data: {
                                label: "View Card", style: "Success"
                            } }
                        }
                    },
                    {
                        type: "Section",
                        section_data: { 
                            components: [
                                { type: "TextDisplay", text_display_data: { content: "**Ichigo Kurwosaki**\n⭐⭐⭐⭐⭐" } },
                            ],
                            accessory: { type: "Button", button_data: {
                                label: "View Card", style: "Success"
                            } }
                        }
                    },
                    {
                        type: "Section",
                        section_data: { 
                            components: [
                                { type: "TextDisplay", text_display_data: { content: "**Ichigo Kurwosaki**\n⭐⭐⭐⭐⭐" } },
                            ],
                            accessory: { type: "Button", button_data: {
                                label: "View Card", style: "Success"
                            } }
                        }
                    },
                    {
                        type: "Section",
                        section_data: { 
                            components: [
                                { type: "TextDisplay", text_display_data: { content: "**Ichigo Kurwosaki**\n⭐⭐⭐⭐⭐" } },
                            ],
                            accessory: { type: "Button", button_data: {
                                label: "View Card", style: "Success"
                            } }
                        }
                    },
                    {
                        type: "Section",
                        section_data: { 
                            components: [
                                { type: "TextDisplay", text_display_data: { content: "**Ichigo Kurwosaki**\n⭐⭐⭐⭐⭐" } },
                            ],
                            accessory: { type: "Button", button_data: {
                                label: "View Card", style: "Success"
                            } }
                        }
                    },
                    {
                        type: "Section",
                        section_data: { 
                            components: [
                                { type: "TextDisplay", text_display_data: { content: "**Ichigo Kurwosaki**\n⭐⭐⭐⭐⭐" } },
                            ],
                            accessory: { type: "Button", button_data: {
                                label: "View Card", style: "Success"
                            } }
                        }
                    }
                ] },
            ]
        })
    }
})