import { DiscordInteraction } from "../types";

export default async function(interaction: DiscordInteraction) {

    if (interaction.isButton() && interaction.customId.startsWith("exit_intro:" + interaction.user.id)) {
        await interaction.client.db.user.update({ where: { discordId: interaction.user.id }, data: { status: "ACTIVE" } });

        await interaction.reply({
            embeds: [ interaction.components.embed({
                description: `Yay! Continue to tutorial or do whatever you want or something`
            }) ],
            components: [ interaction.components.buttons([{
                label: "Cool",
                style: "green",
                emoji: "wyes",
                id: "exit_intro"
            }]) ]
        });
    } else {
        await interaction.reply({
            embeds: [ interaction.components.embed({
                description: `**Welcome to ${interaction.client.user?.displayName}**! 🎉\n\nWe're excited to have you join the adventure! Before you begin, please take a moment to review and agree to our **Terms of Service** and **Community Guidelines**.\n\nBy continuing, you confirm that you have read and accepted these terms. This helps ensure a fair and enjoyable experience for everyone.\n\n**[{emoji_tos} Terms of Service]({config_urls_tos})**\n**[{emoji_privacy} Community Guidelines]({config_urls_guidelines})**\n\nOnce you're ready, press the button below to start your journey! 🚀`
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