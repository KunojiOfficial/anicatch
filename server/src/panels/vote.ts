import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

import votesData from "../config/vote.json";
import { addHours } from "src/helpers/utils";

export default new Panel({
    name: "vote",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { player, client } = interaction;

        const userStats = await client.db.userStats.findFirst({ where: { userId: player.data.id } });
        if (!userStats) throw "no user stats";

        const votes = userStats.votes;

        return {
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_vote} - ${player.user.displayName}`, iconUrl: player.user.displayAvatarURL() },
                description: `{locale_main_voteText}\n### {locale_main_availableVotes}`,
                fields: Object.keys(votesData).map(website => ({
                    name: `${website.charAt(0).toUpperCase()}${website.slice(1)}`,
                    value: `{locale_main_extraEncounters}: **${votesData[website].encounters||0}**\n{locale_main_voteStreak}: **${votes[website]?.streak||0}**\n**${!votes[website]?.lastVoted || (addHours(new Date(votes[website]?.lastVoted), votesData[website].cooldown) < new Date()) ? "{locale_main_voteNow}":`{locale_main_voteIn}`}**`
                })),
                thumbnail: client.user.displayAvatarURL()
            }, {
                date: Object.keys(votesData).map(website => client.unixDate(addHours(new Date(votes[website]?.lastVoted), votesData[website].cooldown)))
            }) ],
            components: [ interaction.components.buttons(Object.keys(votesData).map(website => ({
                label: `{locale_main_voteOn}`,
                url: votesData[website].url
            })), {
                website: Object.keys(votesData).map(website => `${website.charAt(0).toUpperCase()}${website.slice(1)}`)
            }) ]
        }
    }
}); 