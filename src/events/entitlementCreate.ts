import { Entitlement } from "discord.js";

import Event from "../classes/Event.ts";
import redeem from "../mechanics/redeem.ts";

export default new Event({
    async execute(entitlement: Entitlement): Promise<void> {
        await redeem(entitlement);
    }
});