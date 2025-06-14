
// import { db, formatter, manager } from "../../index.ts";
import { addHours, parseColor, unixDate } from "../helpers/utils.ts";

import votesData from "../config/vote.json";
import config from "../config/main.json";
import { PrismaClient } from "@prisma/client";
import { ClusterManager } from "discord-hybrid-sharding";
import Formatter from "./Formatter.ts";

export default class Vote {
    discordId: string
    website: string

    manager: ClusterManager
    db: PrismaClient
    formatter: Formatter

    constructor(discordId: string, website: string, db: PrismaClient, manager: ClusterManager, formatter: Formatter) {
        this.discordId = discordId;
        this.website = website;

        this.manager = manager;
        this.db = db;
        this.formatter = formatter;
    }

    private rewardCalculator(day: number, x: number = 100) {
        return Math.floor(x * Math.log(day + 1) + 100);
    }

    public async process() {
        const user = await this.db.user.findFirst({ where: { discordId: this.discordId }, include: { stats: true, config: true } });
        if (!user) return;

        const votes = user.stats.votes as any;
        
        let streak = 0, newStreak = 0, lastVotedDate;
        if (votes[this.website]) streak = votes[this.website].streak;

        if (streak > 0 && votes[this.website].lastVoted) {
            lastVotedDate = new Date(votes[this.website].lastVoted);
            const now = new Date();
            const hoursDifference = (now.getTime() - lastVotedDate.getTime()) / (1000 * 60 * 60);
            
            if (hoursDifference < 24 + votesData[this.website].cooldown) newStreak = streak + 1;
            else newStreak = 1;
        } else {
            newStreak = 1;
        }

        const reward = this.rewardCalculator(newStreak, votesData[this.website].base);
        votes[this.website] = { lastVoted: new Date(), streak: newStreak, notified: false };

        let text = "";
        if (newStreak > streak && streak > 0) {
            //continue streak
            text += `### {locale_main_yourVoteStreakContinues}\n{locale_main_youVotedTimes}`;
        } else if (newStreak < streak) {
            //streak reset
            text += "### {locale_main_streakResetTitle}\n{locale_main_streakReset}";
        } else {
            //first vote
            text += `### {locale_main_voteFirst}\n{locale_main_voteFirstText}`;
        }

        text += `\n### {locale_main_youHaveReceived}:\n`;
        text += `* {emoji_smallCoin} **{number_${reward}}**`;
        if (votesData[this.website].encounters) text += `\n* {emoji_encounters} **{number_${votesData[this.website].encounters}}**`;
        text += `\n\n{locale_main_voteAgain}\n\n{locale_main_voteThanks} {emoji_favorite}`;

        for (const [_, cluster] of this.manager.clusters) {
            const answer = await cluster.request({ action: 'directMessage', user: user.discordId, content: {
                embeds: [ {
                    description: this.formatter.f(text, user.config.locale, {
                        count: [newStreak],
                        date: [unixDate(addHours(new Date(), 24 + votesData[this.website].cooldown), "long")]
                    }),
                    color: parseColor(config.defaults.embed.color),
                    image: { url: config.imgs.vote }
                } ]
            } });
            if ((answer as any).found) break;
        }

        await this.db.user.update({ 
            where: { discordId: this.discordId }, 
            data: { coins: { increment: reward }, encounters: { increment: votesData[this.website].encounters||0 }, stats: { update: { votes: votes } } }
        });
    }
}