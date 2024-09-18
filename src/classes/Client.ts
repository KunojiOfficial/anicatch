import { ClientOptions, REST, Routes, Client as DiscordClient, Collection } from "discord.js";
import { ClusterClient } from "discord-hybrid-sharding";
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import path from "path";

import { DiscordInteraction } from "../types";
import { deepValue, getTextBetweenTwoStrings, numberWithCommas } from "../helpers/utils";
import Event from "./Event";
import Panel from "./Panel";
import Command from "./Command";
import Interactable from "./Interactable";
import Locale from "./Locale";

import config from "../config/main.json";
import emoji from "../config/emoji.json";

import Logger from "./Logger";

import rarities from "../data/rarities.json";

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
}

class Client extends DiscordClient {
    commands: Collection<string, Command>;
    buttons: Collection<string, Interactable>; 
    menus: Collection<string, Interactable>; 
    panels: Collection<string, Panel>;
    locales: any;
    cluster: ClusterClient<DiscordClient> | undefined;
    db: PrismaClient;
    config: any;
    logger: Logger;
    data: { rarities: typeof rarities }

    constructor(options: ClientOptions) {
        super(options)
        
        //initialize database connection
        this.db = new PrismaClient();

        this.commands = new Collection();
        this.buttons = new Collection();
        this.menus = new Collection();
        this.panels = new Collection();
        this.locales = {};

        this.config = config;

        this.data = { rarities: rarities  };

        this.logger = new Logger(this);

        //initialize collections
        this.loadEvents();
        this.loadCommandsData();

        loadFiles(this.commands, "../commands");
        loadFiles(this.buttons, "../buttons");
        loadFiles(this.menus, "../menus");
        // loadFiles(this.panels, "../panels");
    
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
                        replacement = replacement[0];
                    }
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
    unixDate(date: Date, format?: String) {
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

        const locale : any = this.locales['errors'][lang];
        const message = {
            embeds: [ interaction.components.embed({
                title: `Error #${err}`,
                description: `*${locale.note}*\n\n${locale[err]} `,
            }) ]
        }

        if (interaction.deferred) await interaction.followUp(message).catch(console.error);
        else await interaction.reply(message).catch(console.error);
    }
}

export = Client;