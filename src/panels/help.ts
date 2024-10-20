import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

export default new Panel({
    name: "help",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { user, client } = interaction;

        const commands = [...client.commands.values()];
        commands.sort((a,b) => b.data.description.length - a.data.description.length);
        let text = "";
        for (const cmd of commands) {
            text += `\`${cmd.emoji}\` {command_${cmd.data.name}} - ${cmd.data.description}\n`;
        }        

        return { 
            embeds: [ interaction.components.embed({
                author: { name: `Help - ${user.displayName}`, iconUrl: user.displayAvatarURL() },
                description: `Looking for a guide how to start using the bot? Use {command_guide}!\n### {emoji_links}Useful Links\n{emoji_website} [Our Website]({config_urls_website})\n{emoji_discord} [Support Server]({config_urls_support})\n{emoji_privacy} [Privacy Policy]({config_urls_privacyPolicy})\n{emoji_tos} [Terms of Service]({config_urls_tos})\n### {emoji_cmds}Commands\n${text}`,
            }) ]
        }
    }
}); 