import { ClientOptions, REST, Routes, Client as DiscordClient, Collection } from "discord.js";
import { ClusterClient } from "discord-hybrid-sharding";
import { PrismaClient, User as PrismaUser, Role as PrismaRole } from "@prisma/client";
import { readdirSync } from "fs";
import path from "path";

import { DiscordInteraction, UserRole } from "../types";
import { deepValue, getTextBetweenTwoStrings, numberWithCommas, base10ToBase26, base26ToBase10 } from "../helpers/utils";
import Event from "./Event";
import Panel from "./Panel";
import Command from "./Command";
import Interactable from "./Interactable";
import Locale from "./Locale";

import config from "../config/main.json";
import emoji from "../config/emoji.json";

import Logger from "./Logger";

import rarities from "../data/rarities.json";
import types from "../data/types.json";

async function loadFiles(collection: Collection<string, any>, directory: string) {
    const filePath: string = path.resolve(__dirname, directory);
    const files: string[] = readdirSync(filePath).filter(
        (file) => file.endsWith('.js') || file.endsWith('.ts')
    );

    for (const file of files) {
        let name = path.parse(file).name.replace(/.cmd|.sel|.btn/, '');
        const command: any = (await import(`${filePath}/${file}`)).default as any
        
        if (command.id !== undefined) name = command.id.toString();
        collection.set(name, command);
    }
}

const FORMATABLES: any = {
    emoji: emoji,
    config: config,
    number: {},
    locale: {},
    custom: {},
    command: {},
    item: {}
}

class Client extends DiscordClient {
    commands: Collection<string, Command>;
    buttons: Collection<string, Interactable>; 
    menus: Collection<string, Interactable>;
    modals: Collection<string, Interactable>;
    panels: Collection<string, Panel>;
    locales: any;
    cluster: ClusterClient<DiscordClient> | undefined;
    db: PrismaClient;
    config: any;
    logger: Logger;
    data: { rarities: typeof rarities, types: typeof types }

    constructor(options: ClientOptions) {
        super(options)
    
        //initialize database connection
        this.db = new PrismaClient();

        this.commands = new Collection();
        this.buttons = new Collection();
        this.menus = new Collection();
        this.modals = new Collection();
        this.panels = new Collection();
        this.locales = {};

        this.config = config;

        this.data = { rarities: rarities, types: types };

        this.logger = new Logger(this);

        //initialize collections
        this.loadEvents();
        this.loadCommandsData();

        loadFiles(this.commands, "../interactions/commands");
        loadFiles(this.buttons, "../interactions/buttons");
        loadFiles(this.menus, "../interactions/menus");
        loadFiles(this.modals, "../interactions/modals");
        loadFiles(this.panels, "../panels");
    
        //initalize locales
        let localeDir = path.resolve(__dirname, "../locale");
        let directories = readdirSync(localeDir);
        for (let dir of directories) {
            let locale = new Locale();
            locale.load(`${localeDir}/${dir}`);

            this.locales[dir] = locale.languages;
        }

    }

    /**
     * Loads all Discord events
     */
    async loadEvents() {
        const eventPath: string = path.resolve(__dirname, "../events");
        const eventFiles: string[] = readdirSync(eventPath).filter(
            (file) => file.endsWith('.js') || file.endsWith('.ts')
        );

        for (const file of eventFiles) {
            const name = path.parse(file).name;
            const event: Event = (await import(`${eventPath}/${file}`)).default as Event
            if (event.once) {
                this.once(name, (...args: any[]) => event.execute(...args))
            } else {
                this.on(name, (...args: any[]) => event.execute(...args))
            }
        }
    }

    /**
     * Deploys commands to Discord API
     */
    async deployCommands() {
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        let route = Routes.applicationGuildCommands(config.bot.id, config.bot.dev_guild);
    
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

    async loadCommandsData() {
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        const commandsData = await rest.get(Routes.applicationGuildCommands(config.bot.id, config.bot.dev_guild));
        
        const object: any = {};
        for (const command of commandsData as any) {
            if (command.options?.find((o:any) => o.type === 1)) { //subcommands
                for (const sub of command.options?.filter((o:any) => o.type === 1)) {
                    object[`${command.name} ${sub.name}`] = command.id;
                }
            }

            object[command.name] = command.id;
        }

        FORMATABLES["command"] = object;
    }

    /**
     * Replaces variables in text
     * @param {string} text 
     */ 
    formatText(text: string, locale?: string, replace?: object) {
        for (let formatable of Object.keys(FORMATABLES)) {
            const [matches, values] = getTextBetweenTwoStrings(text, `{${formatable}_`, '}');

            for (let i = 0; i < matches.length; i++) {
                let replacement;
                if (formatable === 'command') replacement = `</${values[i]}:${FORMATABLES.command[values[i]]}>`;
                else if (formatable === 'number') replacement = numberWithCommas(values[i]);
                else if (formatable === 'locale' && locale) {
                    let [ namespace, ...rest ] = values[i].split("_");
                    replacement = this.formatText(deepValue(this.locales[namespace][locale], rest.join('.')), locale, replace);
                }
                else if (formatable === 'custom') {
                    replacement = deepValue(replace, values[i]); 
                    if (replacement.length > 1) {
                        replacement = replacement.reverse();
                        replacement = replacement.pop();
                    } else if (replacement.length) {
                        replacement = this.formatText(replacement[0], locale);
                    }
                } else if (formatable === 'item') {
                    replacement = deepValue(replace, values[0]);
                }
                else replacement = deepValue(FORMATABLES[formatable], values[i].replaceAll("_", "."))
                
                text = text.replace(matches[i], replacement);
            }

        }

        return text;
    }

    /**
     * Creates an unix date
     * @param date 
     * @param format 
     * @returns 
     */
    unixDate(date: Date, format?: 'long' | 'short' | 'hours') {
        let type = 'R';
        switch (format) {
            case 'long': type = 'f'; break;
            case 'short': type = 'D'; break;
            case 'hours': type = 't'; break;
            default: type = 'R'; break;
        }
    
        return (`<t:${parseInt((date.getTime() / 1000).toFixed(0))}:${type}>`);
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

        let locale : any = this.locales['errors'][lang];
        if (!locale) locale = this.locales['errors']['en-US'];

        const message = {
            embeds: [ interaction.components.embed({
                description: `-# Code **#${err}**\n${locale[err]}\n\n-# *${locale.note}*`,
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

export = Client;