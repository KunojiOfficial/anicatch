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
            if (typeof cmd.emoji === 'object') {
                let options = (cmd.data.toJSON()).options;
                if (!options) continue;

                for (const sub of options.filter((o:any) => o.type === 1) as any) {
                    text += `\`${(cmd.emoji as any)[sub.name]}\` {command_${cmd.data.name} ${sub.name}} - ${sub.description}\n`;
                }
            } else {
                text += `\`${cmd.emoji}\` {command_${cmd.data.name}} - ${cmd.data.description}\n`;
            }
        }        

        return { 
            embeds: [ interaction.components.embed({
                author: { name: `Help - ${user.displayName}`, iconUrl: user.displayAvatarURL() },
                description: `Looking for a guide how to start using the bot? Use {command_guide}!\n### {emoji_links}Useful Links\n{emoji_website} [Our Website]({config_urls_website})\n{emoji_discord} [Support Server]({config_urls_support})\n{emoji_privacy} [Privacy Policy]({config_urls_privacyPolicy})\n{emoji_tos} [Terms of Service]({config_urls_tos})\n### {emoji_cmds}Commands\n${text}`,
            }) ]
        }
    }
}); 