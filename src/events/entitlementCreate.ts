import { Entitlement } from "discord.js";

import Event from "../classes/Event.ts";
import redeem from "../mechanics/redeem.ts";
import { DiscordClient } from "../types.ts";

export default new Event({
    async execute(entitlement: Entitlement): Promise<void> {
        await redeem(entitlement);
        
        const client = entitlement.client as DiscordClient;
        client.logger.log(`Entitlement created:\n<@${entitlement.userId}> ${entitlement.skuId}`);
    }
});