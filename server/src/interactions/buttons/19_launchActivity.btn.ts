import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";
import launchActivity from "../../mechanics/launchActivity";

export default new Interactable({
    id: 19,
    dontReply: true,
    async execute(interaction): Promise<InteractionReplyOptions> {
        await launchActivity(interaction);
        return {};
    }
});