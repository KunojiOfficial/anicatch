import { ChannelType, Guild, PermissionsBitField } from "discord.js";

import Event from "../classes/Event.ts";
import { DiscordClient } from "../types.ts";
import { parseColor } from "../helpers/utils.ts";

import config from "../config/main.json";

const requiredPermissions = [
    PermissionsBitField.Flags.SendMessages, 
    PermissionsBitField.Flags.ViewChannel, 
    PermissionsBitField.Flags.AttachFiles
];

export default new Event({
    async execute(guild: Guild): Promise<void> {
        if (!guild) return;

        const { client }  = guild;

        const channel = guild.channels.cache.filter(c =>
            c.type === ChannelType.GuildText &&
            c.permissionsFor(guild.members.me!).has(requiredPermissions)
        ).find(c => c.name.startsWith('general')) || guild.channels.cache.filter(c => 
            c.type === ChannelType.GuildText &&
            c.permissionsFor(guild.members.me!).has(requiredPermissions)
        ).first() || guild.channels.cache.first();

        if (!channel) return;

        const locale = guild.preferredLocale;
        await client.user.fetch();

        const discordClient = client as DiscordClient;
        const embed = {
            title: discordClient.formatText("{locale_main_welcomeTitle}", locale, { guildName: [guild.name] }),
            description: discordClient.formatText("{locale_main_welcomeText}", locale),
            color: parseColor(config.defaults.embed.color),
            thumbnail: { url: client.user?.displayAvatarURL() },
            image: { url: client.user?.bannerURL({size: 512}) }
        };

        try {
            await (channel as any).send({
                embeds: [embed]
            });

        } catch (e) {}
    }
});

