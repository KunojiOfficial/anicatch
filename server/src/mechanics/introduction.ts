import { DiscordInteraction } from "../types";

export default async function(interaction: DiscordInteraction) {

    if (interaction.isButton() && interaction.customId.startsWith("exit_intro:" + interaction.user.id)) {

        await interaction.update({
            embeds: [ interaction.components.embed({
                description: `**Thank you for accepting the terms!** 🎉\n\nYou're almost ready to start your journey!\nSome of the bot's functions might appear unreadable on mobile devices, so we've added a mobile version.\nPlease let us know if you'll be using the bot on mobile or PC.\n\nYou can always toggle the mobile version in **{command_settings}**.`,
                thumbnail: interaction.client.getEmojiUrl("aniball")
            }) ],
            components: [ interaction.components.buttons([{
                label: "\u2800Mobile",
                emoji: "📱",
                id: "exit_intro2:" + interaction.user.id + ":mobile"
            }, {
                label: "\u2800PC",
                emoji: "💻",
                id: "exit_intro2:" + interaction.user.id + ":pc"
            }]) ]
        });
    } else if (interaction.isButton() && interaction.customId.startsWith("exit_intro2:" + interaction.user.id)) {
        await interaction.client.db.user.update({ where: { discordId: interaction.user.id }, data: { status: "ACTIVE" } });

        let info = "";
        if (interaction.customId.includes("mobile")) {
            info = "Mobile mode enabled! 📱";
            await interaction.client.db.config.update({ where: { userId: interaction.player.data.id }, data: { isMobile: true } });
        }
        else info = "PC mode enabled! 💻";

        await interaction.update({
            embeds: [interaction.components.embed({
                description: `**${info}**\n\nYou're all set to start your adventure! 🚀\n\nIf you're new to the bot, you can follow the tutorial. If you already know the basics, you can start playing right away!\n\nIf you have any questions, feel free to ask in the [support server]({config_urls_support})!`,
                thumbnail: interaction.client.getEmojiUrl("aniball")
            })],
            components: [ interaction.components.buttons([{
                label: "\u2800Tutorial",
                emoji: "📚",
            }]) ]
        });

    } else {
        await interaction.reply({
            embeds: [ interaction.components.embed({
                description: `**Welcome to ${interaction.client.user?.displayName}**! 🎉\n\nWe're excited to have you join the adventure! Before you begin, please take a moment to review and agree to our **Terms of Service** and **Community Guidelines**.\n\nBy continuing, you confirm that you have read and accepted these terms. This helps ensure a fair and enjoyable experience for everyone.\n\n**[{emoji_tos} Terms of Service]({config_urls_tos})**\n**[{emoji_privacy} Community Guidelines]({config_urls_guidelines})**\n\nOnce you're ready, press the button below to start your journey!`,
                thumbnail: interaction.client.getEmojiUrl("aniball")
            }) ],
            components: [ interaction.components.buttons([{
                label: "I have read and accepted these terms",
                style: "green",
                emoji: "wyes",
                id: "exit_intro:" + interaction.user.id
            }]) ]
        });
    }

}