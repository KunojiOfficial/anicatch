import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import launchActivity from "../../mechanics/launchActivity.ts";

export default new Interactable({
    id: 19,
    dontReply: true,
    async execute(interaction): Promise<InteractionReplyOptions> {
        await launchActivity(interaction);
        return {};
    }
});