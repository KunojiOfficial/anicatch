import { Collection, Locale } from "discord.js";
import { DiscordInteraction } from "src/types";

import Player from "./Player";
import introduction from "src/mechanics/introduction";
import Components from "./Components";

export default class Interaction {
    interaction: DiscordInteraction;
    cooldowns: Collection<string, Collection<string, number>>;

    constructor(interaction: DiscordInteraction, cooldowns: Collection<string, Collection<string, number>>) {
        this.interaction = interaction;
        this.cooldowns = cooldowns;
    }

    public async process() {
        
        if (this.interaction.client.state !== "ready") {
            await this.interaction.reply("The bot is still starting up, please wait a moment.");
            return;
        }

        try {
            this.interaction.player = new Player(this.interaction.user);

            //create or find user
            await this.interaction.player.create(this.interaction.user, this.interaction.client, this.interaction.locale);
            
            //refresh encounters
            await this.interaction.player.refreshEncounters(this.interaction.client);

            //set locale
            this.interaction.locale = this.interaction.player.config?.locale as Locale || "en-US" as Locale;
            
            //add components
            this.interaction.components = new Components(this.interaction.client, this.interaction.locale, this.interaction.player)
            
            //introduction
            if (this.interaction.player.data.status === "NEW") {
                await introduction(this.interaction);
                return;
            }

            //commands
            if (this.interaction.isChatInputCommand()) await this.handleCommands();
            else await this.handleInteractables();

        } catch (error) {
            this.error(error);
        }
    }

    private async handleCommands() {
        let name = this.interaction.commandName;
        if (!this.interaction.client.commands.has(name)) throw "Command not found";
        
        const command = this.interaction.client.commands.get(name);
        const cooldown = await this.cooldown(name, "command", command.cooldown);

        if (cooldown) throw {id: 14, variables: { time: [`<t:${Math.round(cooldown/1000)}:R>`] }};
        if (!command.dontReply) await this.interaction.deferReply();

        let execute: any;
        if (command.panel) execute = this.interaction.client.panels.get(command.panel)?.execute;
        else execute = command.execute;

        let message = await execute(this.interaction);
        if (!message) return;

        if (!command.dontReply) await this.interaction.editReply(message);
    }

    private async handleInteractables() {
        let collection;
        
        if (this.interaction.isStringSelectMenu()) collection = this.interaction.client.menus;
        else if (this.interaction.isButton()) collection = this.interaction.client.buttons;
        else if (this.interaction.isModalSubmit()) collection = this.interaction.client.modals;
    
        const [ id, owner, cdId, cdTime, ...args ] = this.interaction.customId.split(';');
        const followUp = id.includes("F");

        this.interaction.targetId = parseInt(!followUp ? id : id.replace("F", ""));
        this.interaction.owner = owner;
        this.interaction.args = args;
    
        if (owner !== this.interaction.user.id && owner != "0") throw 20;

        if (cdId && cdTime) {
            const cooldown = this.cooldown(cdId, "int", parseInt(cdTime));
            if (cooldown) throw {id: 14, variables: { time: [`<t:${Math.round(cooldown/1000)}:R>`] }};
        }


        let interactable = collection?.get(!followUp ? id : id.replace("F", ""));
        if (!interactable) throw 13;

        if (!interactable?.dontReply) await this.interaction.deferUpdate();

        let message = await interactable.execute!(this.interaction);
        
        if (followUp) await this.interaction.followUp(message);
        else if (!interactable.dontReply) await this.interaction.editReply(message);
    }

    private cooldown(cmdId: string, type: string, time?: number) {
        if (!time) return false;
    
        const identifier = `${cmdId}:${type}`;
        //no cooldowns collection, set it first
        if (!this.cooldowns.has(identifier)) {
            this.cooldowns.set(identifier, new Collection());
        }
        
        const now = Date.now();
        const timestamps: Collection<string, number> = this.cooldowns.get(identifier) as any;
    
        let cooldownTime = time * 1000;
    
        //user is on cooldown
        if (timestamps.has(this.interaction.user.id)) {
            const expireTime = timestamps.get(this.interaction.user.id)! + cooldownTime;
            if (now < expireTime) return expireTime;
        }
    
        //user is not on a cooldown
        timestamps.set(this.interaction.user.id, now);
        setTimeout(() => timestamps.delete(this.interaction.user.id), cooldownTime);
        
        return false;
    }

    /**
     * Error dealer
     * @param err 
     */
    private async error(err: any) {
        let variables = {};

        if (typeof err === 'object' && err.id && err.variables) {
            variables = err.variables;
            err = err.id; 
        } else if (typeof err !== 'number'){ 
            this.interaction.client.logger.error(err);
            err = 3;
        }

        const message = {
            embeds: [ this.interaction.components.embed({
                description: `-# Code **#${err}**\n{locale_errors_${err}}\n\n-# *{locale_errors_note}*`,
                color: "#ff0000"
            }, variables) ]
        }

        if (this.interaction.deferred) await this.interaction.followUp(message).catch(console.error);
        else await this.interaction.reply(message).catch(console.error);
    }
}