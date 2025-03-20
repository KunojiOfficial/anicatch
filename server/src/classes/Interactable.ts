import { InteractionReplyOptions, MessagePayload } from "discord.js";
import { DiscordInteraction } from "../types.ts";

export default class Interactable {
    id: Number;
    dontReply?: boolean;
    execute?: (interaction: DiscordInteraction) => Promise<string | MessagePayload | InteractionReplyOptions>;

    constructor(object: {
        id: Number,
        dontReply?: boolean,
        execute?: (interaction: DiscordInteraction) => Promise<string | MessagePayload | InteractionReplyOptions>
    }) {
        this.id = object.id;
        if (object.dontReply) this.dontReply = true;
        if (object.execute) this.execute = object.execute;
    }
}