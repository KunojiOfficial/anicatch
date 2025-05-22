import { Collection, InteractionReplyOptions, Locale } from "discord.js";
import { DiscordInteraction } from "../types.ts";

import Player from "./Player.ts";
import Components from "./Components.ts";

import introduction from "../mechanics/introduction.ts";
import ComponentsV2 from "./ComponentsV2.ts";

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
            this.interaction.componentsV2 = new ComponentsV2(this.interaction.client, this.interaction.locale, this.interaction.player);
            
            //suspensions
            if (this.interaction.player.suspensions.length) {
                const suspended = this.interaction.player.suspensions[0];
                if (suspended) {
                    await this.interaction.reply({
                        embeds: [ this.interaction.components.embed({
                            description: 
                                `### {locale_main_suspended}\n**{locale_main_reason}:** ${suspended.reason}
                                \n**{locale_main_expires}:** ${suspended.expiresAt ? this.interaction.client.unixDate(suspended.expiresAt) : "{locale_main_never}"}.\n\n-# *{locale_main_suspendedNote}*
                            `,
                            color: "#ff0000"
                        }) ], 
                        flags: [ "Ephemeral" ]
                    });
                    return;
                }
            }

            //introduction
            if (this.interaction.player.data.status === "NEW") {
                await introduction(this.interaction);
                return;
            }

            //commands
            if (this.interaction.isChatInputCommand()) await this.handleCommands();
            else await this.handleInteractables();

            //changelog
            if (this.interaction.player.data.version !== this.interaction.client.version) {
                await this.interaction.client.db.user.update({
                    where: { id: this.interaction.player.data.id },
                    data: { version: this.interaction.client.version }
                });

                await this.interaction.followUp({
                    flags: ["IsComponentsV2"],
                    components: this.interaction.componentsV2.construct([{
                        type: "Container", components: [
                            { type: "TextDisplay", text_display_data: { content: `-# ${this.interaction.player.user}` } },
                            { type: "Separator" },
                            { type: "Section", section_data: { components: [
                                { type: "TextDisplay", text_display_data: { content: "{locale_main_update}" } }
                            ], accessory: { type: "Button", button_data: { id: "0", emoji: "tos", label: "{locale_main_changelog}", args: { path: "changelog" }  } }  } }
                        ]
                    }], {
                        version: [this.interaction.client.version]
                    })
                });
            }

        } catch (error) {
            this.error(error);
        }
    }

    private async handleCommands() {
        let name = this.interaction.commandName;
        if (!this.interaction.client.commands.has(name)) {
            let parentCommand = this.interaction.client.commands.find(cmd => cmd.data.aliases?.includes(name));
            if (!parentCommand) throw 13;

            name = parentCommand.data.name;
        }
        
        const command = this.interaction.client.commands.get(name);
        if (!command) throw "unknown command";
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
    
        let owners = owner.split("+");

        if (!owners.includes(this.interaction.user.id) && owner != "0") throw 20;

        if (cdId && cdTime) {
            const cooldown = this.cooldown(cdId, "int", parseInt(cdTime));
            if (cooldown) throw {id: 14, variables: { time: [`<t:${Math.round(cooldown/1000)}:R>`] }};
        }


        let interactable = collection?.get(!followUp ? id : id.replace("F", ""));
        if (!interactable) throw 13;

        if (!interactable?.dontReply) await this.interaction.deferUpdate();

        let message = await interactable.execute!(this.interaction);
        
        if (followUp && Object.keys(message).length) await this.interaction.followUp(message);
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

            if (err.toString().includes("Unknown interaction")) {
                this.interaction.client.logger.warn(`Client: Unknown interaction user: ${this.interaction.user.id}`);
                return;
            } else if(err.toString().includes("Missing Access")) {
                this.interaction.client.logger.warn(`Client: Missing access for user: ${this.interaction.user.id}`);
                return;
            } else {
                this.interaction.client.logger.error(err);
                err = 3;
            }
        }

        const message: InteractionReplyOptions = {
            embeds: [ this.interaction.components.embed({
                description: `-# Code **#${err}**\n{locale_errors_${err}}\n\n-# *{locale_errors_note}*`,
                color: "#ff0000"
            }, variables) ],
            flags: [ "Ephemeral" ]
        }

        if (this.interaction.deferred) await this.interaction.followUp(message).catch(console.error);
        else await this.interaction.reply(message).catch(console.error);
    }
}