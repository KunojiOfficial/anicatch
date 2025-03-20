import { DiscordInteraction } from "../types.ts";

export default async function(interaction: DiscordInteraction) {

    if (interaction.isButton() && interaction.customId.startsWith("exit_intro:" + interaction.user.id)) {

        await interaction.update({
            embeds: [ interaction.components.embed({
                description: `{locale_main_intro2}`,
                thumbnail: interaction.client.getEmojiUrl("aniball")
            }) ],
            components: [ interaction.components.buttons([{
                label: "\u2800{locale_main_mobile}",
                emoji: "📱",
                id: "exit_intro2:" + interaction.user.id + ":mobile"
            }, {
                label: "\u2800{locale_main_pc}",
                emoji: "💻",
                id: "exit_intro2:" + interaction.user.id + ":pc"
            }]) ]
        });
    } else if (interaction.isButton() && interaction.customId.startsWith("exit_intro2:" + interaction.user.id)) {
        await interaction.client.db.user.update({ where: { discordId: interaction.user.id }, data: { status: "ACTIVE" } });

        let info = "";
        if (interaction.customId.includes("mobile")) {
            info = "{locale_main_mobileMode} 📱";
            await interaction.client.db.config.update({ where: { userId: interaction.player.data.id }, data: { isMobile: true } });
        }
        else info = "{locale_main_pcMode} 💻";

        await interaction.update({
            embeds: [interaction.components.embed({
                description: `**${info}**\n\n{locale_main_intro3}`,
                thumbnail: interaction.client.getEmojiUrl("aniball")
            })],
            components: [ interaction.components.buttons([{
                id: "0",
                label: "\u2800{locale_main_tutorial}",
                emoji: "📚",
                args: { path: "guide" }
            }]) ]
        });

    } else {
        await interaction.reply({
            embeds: [ interaction.components.embed({
                description: `{locale_main_intro1}`,
                thumbnail: interaction.client.getEmojiUrl("aniball")
            }) ],
            components: [ interaction.components.buttons([{
                label: "{locale_main_intro1Btn}",
                style: "green",
                emoji: "wyes",
                id: "exit_intro:" + interaction.user.id
            }]) ]
        });
    }

}