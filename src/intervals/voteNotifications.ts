import { PrismaClient } from "@prisma/client";
import { ClusterManager } from "discord-hybrid-sharding";
import { parseColor } from "../helpers/utils.ts";

import config from "../config/main.json";
import vote from "../config/vote.json";
import Formatter from "../classes/Formatter.ts";

export default function (db: PrismaClient, manager: ClusterManager, formatter: Formatter) {
    setInterval(async () => {

        for (const site of Object.keys(vote)) {
            const cooldown = new Date(Date.now() - vote[site].cooldown * 60 * 60 * 1000);
    
            const users = await db.userStats.findMany({
                where: {
                    AND: [
                        { votes: { path: [site, "lastVoted"], lte: cooldown } }, 
                        { votes: { path: [site, "notified"], equals: false } }
                    ]
                },
                include: { user: { include: { config: true } } }
            });

            for (const user of users) {
                await db.userStats.updateMany({ where: { userId: user.userId }, data: {
                    votes: {
                        [site]: {
                            ...user.votes[site],
                            notified: true
                        }
                    }
                } });

                for (const [_, cluster] of manager.clusters) {
                    const answer = await cluster.request({ action: 'directMessage', user: user.user.discordId, content: {
                        embeds: [ {
                            description: formatter.f(
                                `### {locale_main_voteNotification}\n{locale_main_voteNotificationText}\n\n-# {locale_main_voteNotificationsOff}`,
                                user.user.config.locale,
                                { name: [config.bot.name], site: [site] }
                            ),
                            color: parseColor(config.defaults.embed.color),
                            thumbnail: { url: vote[site].img }
                        } ],
                        components: [{ type: 1, components: [{
                            type: 2,
                            style: 5,
                            label: formatter.f("{locale_main_vote}!", user.user.config.locale),
                            url: vote[site].url
                        }]}]
                    } });

                    if ((answer as any).found) break;
                }
            }
        }
      
    }, 60000);
}