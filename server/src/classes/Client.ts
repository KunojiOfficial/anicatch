import { ClientOptions, Client as DiscordClient, Collection } from "discord.js";
import { ClusterClient } from "discord-hybrid-sharding";
import { PrismaClient, User as PrismaUser, Role as PrismaRole } from "@prisma/client";
import { pathToFileURL } from "url";
import { readdirSync } from "fs";
import path from "path";

import { base10ToBase26, base26ToBase10, loadFiles, unixDate } from "../helpers/utils";

import Event from "./Event.ts";
import Panel from "./Panel.ts";
import Command from "./Command.ts";
import Interactable from "./Interactable.ts";
import Logger from "./Logger.ts";
import Formatter from "./Formatter.ts";

import emoji from "../config/emoji.json";

class Client extends DiscordClient {
    cluster: ClusterClient<DiscordClient> | undefined;
    db: PrismaClient;
    
    commands: Collection<string, Command>;
    buttons: Collection<string, Interactable>; 
    menus: Collection<string, Interactable>;
    modals: Collection<string, Interactable>;
    panels: Collection<string, Panel>;

    logger: Logger;
    formatter: Formatter;
    
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
        
        this.logger.info(`Bot is ready.`);
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