import { db, manager } from "index";
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
        const user = await db.user.findFirst({ where: { discordId: this.discordId }, include: { stats: true } });
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
        votes[this.website] = { lastVoted: new Date(), streak: newStreak };

        let message = {};

        if (newStreak > streak && streak > 0) {
            //continue streak
            message = {
                embeds: [ {
                    description: `### Your streak continues! 🎉\nYou voted **${newStreak}** times in a row!\n\nToday, you receive **${reward} coins**!\nVote again before ${unixDate(addHours(lastVotedDate, 24+votesData[this.website].cooldown), "long")} to increase your streak and receive ${this.rewardCalculator(newStreak+1, votesData[this.website].base)}!`,
                    color: parseColor(config.defaults.embed.color)
                } ]
            };
        } else if (newStreak < streak) {
            //streak reset
            message = { content: `Your streak has been reset!` };
        } else {
            //first vote
            message = { content: `You have voted for the first time!` };
        }

        console.log(message)

        for (const [_, cluster] of manager.clusters) {
            const answer = await cluster.request({ action: 'directMessage', user: user.discordId, content: message });
            if ((answer as any).found) break;
        }

        await db.user.update({ 
            where: { discordId: this.discordId }, 
            data: { coins: { increment: reward }, stats: { update: { votes: votes } } }
        });
    }
}