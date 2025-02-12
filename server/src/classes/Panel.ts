import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";

/**
 * Represents a interactable panel
 */
export default class Panel {
    name: string
    execute?: (interaction: DiscordInteraction, ...args: any) => Promise<InteractionReplyOptions> | InteractionReplyOptions

    constructor(object: {
        name: string
        execute?: (interaction: DiscordInteraction, ...args: any) => Promise<InteractionReplyOptions> | InteractionReplyOptions
    }) {
        this.name = object.name;
        if (object.execute) this.execute = object.execute;
    }
}