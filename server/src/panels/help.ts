import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

export default new Panel({
    name: "help",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { user, client } = interaction;

        const commands = [...client.commands.values()];
        commands.sort((a,b) => b.data.description.length - a.data.description.length);
        let text = [];
        const fields = [];
        for (const cmd of commands) {
            if (typeof cmd.emoji === 'object') {
                let options = (cmd.data.toJSON()).options;
                if (!options) continue;

                for (const sub of options.filter((o:any) => o.type === 1) as any) {
                    text.push(`-# \`${(cmd.emoji as any)[sub.name]}\` {command_${cmd.data.name} ${sub.name}} - {locale_commands_${cmd.data.name}_options_${sub.name}_description}\n`);
                }
            } else {
                text.push(`-# \`${cmd.emoji}\` {command_${cmd.data.name}} - {locale_commands_${cmd.data.name}_description}\n`);
            }
        }        

            
        return { 
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_help} - ${user.displayName}`, iconUrl: user.displayAvatarURL() },
                description: `{locale_main_helpText}\n### {emoji_links}{locale_main_usefulLinks}\n{emoji_website} [{locale_main_ourWebsite}]({config_urls_website})\n{emoji_discord} [{locale_main_supportServer}]({config_urls_support})\n{emoji_privacy} [{locale_main_privacyPolicy}]({config_urls_privacyPolicy})\n{emoji_tos} [{locale_main_tos}]({config_urls_tos})\n### {emoji_cmds}{locale_main_commands}\n${text.sort((a,b) => a.length - b.length).join('')}`,
                fields: fields
            }) ]
        }
    }
}); 