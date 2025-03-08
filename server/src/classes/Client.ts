import { ClientOptions, REST, Routes, Client as DiscordClient, Collection } from "discord.js";
import { ClusterClient } from "discord-hybrid-sharding";
import { PrismaClient, User as PrismaUser, Role as PrismaRole } from "@prisma/client";
import { readdirSync } from "fs";
import path from "path";

import { DiscordInteraction, UserRole } from "../types";
import { deepValue, getTextBetweenTwoStrings, numberWithCommas, base10ToBase26, base26ToBase10, loadFiles, unixDate } from "../helpers/utils";
import Event from "./Event";
import Panel from "./Panel";
import Command from "./Command";
import Interactable from "./Interactable";

import config from "../config/main.json";
import emoji from "../config/emoji.json";

import Logger from "./Logger";

import rarities from "../data/rarities.json";
import types from "../data/types.json";
import { pathToFileURL } from "url";
import Formatter from "./Formatter";

class Client extends DiscordClient {
    cluster: ClusterClient<DiscordClient> | undefined;
    db: PrismaClient;
    
    commands: Collection<string, Command>;
    buttons: Collection<string, Interactable>; 
    menus: Collection<string, Interactable>;
    modals: Collection<string, Interactable>;
    panels: Collection<string, Panel>;

    config: any;

    logger: Logger;
    formatter: Formatter;
    
    data: { rarities: typeof rarities, types: typeof types }
    
    state: string = "loading"

    constructor(options: ClientOptions) {
        super(options)
        
        //initialize database connection
        this.db = new PrismaClient();

        this.commands = new Collection();
        this.buttons = new Collection();
        this.menus = new Collection();
        this.modals = new Collection();
        this.panels = new Collection();

        this.config = config;

        this.data = { rarities: rarities, types: types };

        this.logger = new Logger(this);
        this.formatter = new Formatter();

        //initialize collections
        this.initializeAsync();
    
    }
    
    private async initializeAsync() {
        await this.loadEvents();

        await loadFiles(this.commands, "src/interactions/commands");
        await loadFiles(this.buttons, "src/interactions/buttons");
        await loadFiles(this.menus, "src/interactions/menus");
        await loadFiles(this.modals, "src/interactions/modals");
        await loadFiles(this.panels, "src/panels");

        this.state = "ready";
    }

    public formatText(text: string, locale: string, variables?: object): string {
        return this.formatter.f(text, locale, variables);
    }

    /**
     * Loads all Discord events
     */
    private async loadEvents() {
        const eventPath: string = path.resolve(process.cwd(), "src/events");
        const eventFiles: string[] = readdirSync(eventPath).filter(
            (file) => file.endsWith('.js') || file.endsWith('.ts')
        );

        for (const file of eventFiles) {
            const name = path.parse(file).name;
            const eventUrl = pathToFileURL(`${eventPath}/${file}`).href;
            const event: Event = (await import(eventUrl)).default as Event

            if (event.once) {
                this.once(name, (...args: any[]) => event.execute(...args))
            } else {
                this.on(name, (...args: any[]) => event.execute(...args))
            }
        }

        console.log(`Loaded ${eventFiles.length} events!`);
    }

    /**
     * Deploys commands to Discord API
     */
    public async deployCommands() {
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        let route = process.env.NODE_ENV === "development" ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, config.bot.dev_guild) : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
    
        let jsonCommands: Array<{data: any, emoji: any}> = this.commands.map(cmd => ({data: cmd.data.toJSON(), emoji: cmd.emoji}));
        for (let command of jsonCommands) {
            if (typeof command.emoji === "object") { //subcommands
                for (const sub of command.data.options.filter((o:any) => o.type === 1)) {
                    sub.description = command.emoji[sub.name] + " " + sub.description;
                }
            }

            command.data.description = command.emoji + " " + command.data.description;
            command = command.data as any;
        }

        (async () => {
            try {
                await rest.put(route, { body: jsonCommands.map(cmd => cmd.data) });
                console.log("Commands reloaded!")
            } catch (err) {
                console.log(err);
            }
        })();
    }

    /**
     * Creates an unix date
     * @param date 
     * @param format 
     * @returns 
     */
    unixDate(date: Date, format?: 'long' | 'short' | 'hours') {
        return unixDate(date, format);
    }

    /**
     * Error dealer
     * @param err 
     */
    async error(err: any, interaction: DiscordInteraction) {
        const lang = interaction.locale;
        if (typeof err !== 'number'){ 
            this.logger.error(err);
            err = 3;
        }

        const message = {
            embeds: [ interaction.components.embed({
                description: `-# Code **#${err}**\n{locale_errors_${err}}\n\n-# *{locale_errors_note}*`,
                color: "#ff0000"
            }) ]
        }

        if (interaction.deferred) await interaction.followUp(message).catch(console.error);
        else await interaction.reply(message).catch(console.error);
    }

    getId(cardId: number, printId?: number) {
        return printId ? `${base10ToBase26(cardId)}-${printId}` : base10ToBase26(cardId);
    }

    getIdReverse(cardId: string) {
        return base26ToBase10(cardId);
    }

    getEmojiUrl(emojiName?: string, hardEmoji?: string) {
        const value = emoji[emojiName as keyof typeof emoji];
        if (!value && !hardEmoji) return "";

        const match = emojiName ? (value as string).match(/:(\w+)>/) : hardEmoji ? hardEmoji.match(/:(\w+)>/) : [];

        if (!match?.length) return "";

        return `https://cdn.discordapp.com/emojis/${match[1]}.webp?quality=lossless`
    }

    getNextEncounterDate(user: PrismaUser, role: PrismaRole) {
        const now = user.lastReset;
        const newDate = new Date(now.getTime() + role.rechargeTime*1000);

        return this.unixDate(newDate);
    }
}

export default Client;