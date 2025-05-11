import referral from "../data/referral.json";

export default class Referral {

    public get rewards() {
        return referral.rewards;
    }

    public get rewardsText() {
        let text = "";
        for (const reward of referral.rewards) {
            text += "* ";
            if (reward.who === "both") text += "{locale_main_bothWillReceive}";
            else if (reward.who === "referrer") text += "{locale_main_youWillReceive}";
            else if (reward.who === "referral") text += "{locale_main_friendWillReceive}";

            if (reward.type === "coins") text += ` {emoji_smallCoin}**{number_${reward.amount}}**.`;
            else if (reward.type === "gems") text += ` {emoji_smallGem}**{number_${reward.amount}}**.`;
            else if (reward.type === "boughtGems") text += ` **${reward.value*100}%** {locale_main_boughtGems}`;
            text += "\n";
        }

        return text;
    }


}