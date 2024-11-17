import type {
    AutocompleteInteraction,
    SlashCommandBuilder,
} from 'discord.js'
import { DiscordInteraction } from '../types'

/**
 * Represents an Application Command
 */
export default class Command {
    emoji?: string | object
    data: SlashCommandBuilder
    panel?: string
    execute?: (interaction: DiscordInteraction) => Promise<void> | void
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void> | void
    dontReply?: Boolean
    cooldown?: number

    /**
     * @param {{
     *      data: SlashCommandBuilder
     *      execute?: (interaction: DiscordInteraction) => Promise<void> | void
     *      autocomplete?: (interaction: AutocompleteInteraction) => Promise<void> | void
     *  }} options - The options for the slash command
     */
    constructor(options: {
        emoji: string | object,
        data: SlashCommandBuilder
        panel?: string
        execute?: (interaction: DiscordInteraction) => Promise<void> | void
        autocomplete?: (interaction: AutocompleteInteraction) => Promise<void> | void
        dontReply?: Boolean,
        cooldown?: number
    }) {
        if (options.execute) {
            this.execute = options.execute
        } 
        
        this.data = options.data;
        if (options.emoji) this.emoji = options.emoji;
        if (options.panel) this.panel = options.panel;
        if (options.dontReply) this.dontReply = options.dontReply;
        if (options.cooldown) this.cooldown = options.cooldown;
    }
}