import { Entitlement } from "discord.js";
import Event from "../classes/Event";

import redeem from "src/mechanics/redeem";

export default new Event({
    async execute(entitlement: Entitlement): Promise<void> {
        await redeem(entitlement);
    }
});