import { db, manager, formatter } from "index";
import { addHours, parseColor, unixDate } from "src/helpers/utils";

import votesData from "../config/vote.json";
import config from "../config/main.json";

export default class Vote {
    discordId: string
    website: string

    constructor(discordId: string, website: string) {
        this.discordId = discordId;
        this.website = website;
    }

    private rewardCalculator(day: number, x: number = 100) {
        return Math.floor(x * Math.log(day + 1) + 100);
    }

    public async process() {
        const user = await db.user.findFirst({ where: { discordId: this.discordId }, include: { stats: true, config: true } });
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
        text += `\n\n{locale_main_voteAgain}\n\n{locale_main_voteThanks} {emoji_favorite}`;

        for (const [_, cluster] of manager.clusters) {
            const answer = await cluster.request({ action: 'directMessage', user: user.discordId, content: {
                embeds: [ {
                    description: formatter.f(text, user.config.locale, {
                        count: [newStreak],
                        date: [unixDate(addHours(new Date(), 24 + votesData[this.website].cooldown), "long")]
                    }),
                    color: parseColor(config.defaults.embed.color),
                    image: { url: config.imgs.vote }
                } ]
            } });
            if ((answer as any).found) break;
        }

        await db.user.update({ 
            where: { discordId: this.discordId }, 
            data: { coins: { increment: reward }, stats: { update: { votes: votes } } }
        });
    }
}