import type {
    AutocompleteInteraction,
    SlashCommandBuilder,
} from 'discord.js'
import { DiscordInteraction } from '../types.ts'

/**
 * Represents an Application Command
 */
export default class Command {
    emoji?: string | object
    data: any
    panel?: string
    execute?: (interaction: DiscordInteraction) => Promise<void> | void
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void> | void
    dontReply?: Boolean
    cooldown?: number
    aliases?: string[]

    /**
     * @param {{
     *      data: SlashCommandBuilder
     *      execute?: (interaction: DiscordInteraction) => Promise<void> | void
     *      autocomplete?: (interaction: AutocompleteInteraction) => Promise<void> | void
     *  }} options - The options for the slash command
     */
    constructor(options: {
        emoji: string | object,
        data: any
        panel?: string
        execute?: (interaction: DiscordInteraction) => Promise<void> | void
        autocomplete?: (interaction: AutocompleteInteraction) => Promise<void> | void
        dontReply?: Boolean,
        cooldown?: number,
        aliases?: string[]
    }) {
        if (options.execute) {
            this.execute = options.execute
        } 
        
        this.data = options.data;
        if (options.emoji) this.emoji = options.emoji;
        if (options.panel) this.panel = options.panel;
        if (options.dontReply) this.dontReply = options.dontReply;
        if (options.cooldown) this.cooldown = options.cooldown;
        if (options.aliases) this.data.aliases = options.aliases;
    }
}