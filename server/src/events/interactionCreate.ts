import { DiscordInteraction, UserRole } from "../types";
import Event from "../classes/Event";
import Player from "../classes/Player";
import Components from "../classes/Components";
import { Config, Prisma, User } from "@prisma/client";
// import tutorial from "../mechanics/tutorial";
import { Collection } from "discord.js";
import Client from "../classes/Client";
import introduction from "../mechanics/introduction";
import { createUser } from "src/mechanics/createUser";

const cooldowns = new Collection();

function cooldown(id: string, name: string, type: string, cooldown?: number) {
    if (!cooldown) return false;

    const identifier = `${name}:${type}`;
    //no cooldowns collection, set it first
    if (!cooldowns.has(identifier)) {
        cooldowns.set(identifier, new Collection());
    }
    
    const now = Date.now();
    const timestamps: Collection<string, number> = cooldowns.get(identifier) as any;

    let cooldownTime = cooldown * 1000;

    //user is on cooldown
    if (timestamps.has(id)) {
        const expireTime = timestamps.get(id)! + cooldownTime;
        if (now < expireTime) return expireTime;
    }

    //user is not on a cooldown
    timestamps.set(id, now);
    setTimeout(() => timestamps.delete(id), cooldownTime);
    
    return false;
}

function cdMessage(interaction: DiscordInteraction, expireTime: number) {
    return {
        embeds: [ interaction.components.embed({
            description: `-# Code **#14**\n{locale_errors_14}\n\n-# *{locale_errors_note}*`,
            color: "#ff0000"
        }, {
            time: [`<t:${Math.round(expireTime/1000)}:R>`]
        }) ],
        ephemeral: true
    }
}

async function refreshEncounters(client: Client, player: UserRole) {
    if (player.encounters >= player.role.maxEncounters) return player;

    const now = new Date();
    const lastReset = player.lastReset;
    
    const secondsSinceReset = (now.getTime() - lastReset.getTime()) / 1000;
    const encountersToAdd = Math.floor(secondsSinceReset / player.role.rechargeTime);
    
    if (encountersToAdd > 0) {
        const newEncounters = Math.min(player.encounters + encountersToAdd, player.role.maxEncounters);
        
        let data: any = { 
            encounters: newEncounters, 
            lastReset: new Date()
        };

        if (newEncounters < player.role.maxEncounters) {
            const nextNotify = new Date(now.getTime() + (player.role.rechargeTime * (player.role.maxEncounters-newEncounters) * 1000));
            data.nextNotify = nextNotify;
        }

        return await client.db.user.update({ 
            where: { id: player.id }, 
            data: data, 
            include: { config: true, role: true } 
        });
    }

    if (!player.nextNotify && player.encounters < player.role.maxEncounters) {
        const nextNotify = new Date(now.getTime() + (player.role.rechargeTime * (player.role.maxEncounters-player.encounters) * 1000));
        await client.db.user.update({ where: { id: player.id }, data: { nextNotify: nextNotify } });
    }

    return player;
}

export default new Event({
    async execute(interaction: DiscordInteraction): Promise<void> {

        const { client, user } = interaction;

        try {
            let player = await createUser(user, client, interaction.locale);

            interaction.locale = (player.config?.locale || "en-US") as any;

            //encounter refresh logic
            player = await refreshEncounters(client, player);

            interaction.player = new Player(interaction.user, player, player.role, player.config || undefined);
            interaction.components = new Components(client, interaction.locale, interaction.player);

            //introduction
            if (player.status === "NEW") {
                await introduction(interaction);
                return;
            }

            //commands
            if (interaction.isChatInputCommand()) {
                let commandName = process.env.NODE_ENV !== 'development' ? interaction.commandName : interaction.commandName.replace("dev-", "");
                if (!client.commands.has(commandName)) throw "Command not found";
                const command = client.commands.get(commandName);
    
                //get cooldown
                const cd = cooldown(user.id, interaction.commandName, "cmd", command?.cooldown)
                if (cd) {
                    await interaction.reply(cdMessage(interaction, cd));
                    return;
                }

                if (!command?.dontReply) await interaction.deferReply();
    
                let execute : any;
                if (command?.panel) execute = client.panels.get(command?.panel)?.execute;
                else execute = command?.execute;
    
                let message = await execute(interaction);
                
                if (!message) return;
                if (!command?.dontReply) await interaction.editReply(message);
            } else { //interactables
                let collection;
                if (interaction.isStringSelectMenu()) collection = client.menus;
                else if (interaction.isButton()) collection = client.buttons;
                else if (interaction.isModalSubmit()) collection = client.modals;

                const [ id, owner, cdId, cdTime, ...args ] = interaction.customId.split(';');
                let followUp = false;
                if (id.includes("F")) followUp = true;

                interaction.targetId = parseInt(!followUp ? id : id.replace("F", ""));
                interaction.owner = owner;
                interaction.args = args;
                
                if (owner !== user.id && owner != "0") throw 20;

                //get cooldown
                if (cdId && cdTime) {
                    const cd = cooldown(user.id, cdId, "int", parseInt(cdTime));
                    if (cd) {
                        await interaction.reply(cdMessage(interaction, cd));
                        return;
                    }
                }
                
                let interactable = collection?.get(!followUp ? id : id.replace("F", ""));
                if (!interactable) throw 13;

                if (!interactable?.dontReply) await interaction.deferUpdate();

                let message = await interactable.execute!(interaction);
                if (followUp) await interaction.followUp(message);
                else if (!interactable.dontReply) await interaction.editReply(message);
            }
        } catch (err) {
            await client.error(err, interaction);
        }
    }
});

