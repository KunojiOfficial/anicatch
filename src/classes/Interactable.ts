import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types"

export default class Interactable {
    id: Number
    dontReply?: boolean
    execute?: (interaction: DiscordInteraction) => Promise<InteractionReplyOptions> | Promise<string>

    constructor(object: {
        id: Number,
        dontReply?: boolean,
        execute?: (interaction: DiscordInteraction) => Promise<InteractionReplyOptions> | Promise<string>
    }) {
        this.id = object.id;
        if (object.dontReply) this.dontReply = true;
        if (object.execute) this.execute = object.execute;
    }
}