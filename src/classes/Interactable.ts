import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types"

export default class Interactable {
    id: Number
    execute?: (interaction: DiscordInteraction) => Promise<InteractionReplyOptions> | Promise<string>

    constructor(object: {
        id: Number,
        execute?: (interaction: DiscordInteraction) => Promise<InteractionReplyOptions> | Promise<string>
    }) {
        this.id = object.id;
        if (object.execute) this.execute = object.execute;
    }
}