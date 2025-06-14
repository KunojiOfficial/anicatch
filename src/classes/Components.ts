import { APIEmbed, ActionRowBuilder, ButtonBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, User } from "discord.js";
import { DiscordClient, Button } from "../types.ts";
import { deepValue, parseColor } from "../helpers/utils.ts";

import emoji from '../config/emoji.json';
import config from '../config/main.json';

import Player from "./Player.ts";

let emojis: any = emoji;

const BUTTON_COLORS: any = {
    blurple: 1,
    gray: 2,
    green: 3,
    red: 4,
    link: 5,
    premium: 6
}

export default class Components {
    client: DiscordClient
    player: Player
    locale: string

    constructor(client: DiscordClient, locale: string, player: Player) {
        this.client = client;
        this.locale = locale;
        
        this.player = player;
    }

    /**
     * Generates a Discord embed
     * @param object Embed values
     * @returns Embed
     */
    embed(object: {
        title?: string,
        description?: string,
        fields?: Array<{ name?: string, value?: string, inline?: boolean } | null>,
        author?: { name?: string, iconUrl?: string  },
        footer?: { text?: string, iconUrl?: string  },
        color?: string,
        thumbnail?: string,
        image?: string
    }, replace?: object) {
        if (object.fields) object.fields = object.fields.filter(o => o !== null);

        if (!object.color) object.color = config.defaults.embed.color;
        let embedColor = parseColor(object.color!);

        if (object.footer?.text) object.footer.text = this.client.formatText(object.footer.text, this.locale, replace);

        if (!replace) replace = { user: [this.player.user.displayName] }
        else replace = { ...replace, user: [this.player.user.displayName] };

        if (object.author?.name) object.author.name = this.client.formatText(object.author.name, this.locale, replace);
        if (object.title) object.title = this.client.formatText(object.title, this.locale, replace);
        if (object.description) object.description = this.client.formatText(object.description, this.locale, replace);
        if (object.fields) {
            for (let field of object.fields) {
                if (!field) continue;

                if (field.name) field.name = this.client.formatText(field.name, this.locale, replace);
                if (field.value) field.value = this.client.formatText(field.value, this.locale, replace);
            }
        }

        if (this.player.config.isMobile && !object.footer && object.fields) object.footer = { text: this.client.formatText("{locale_main_mobileVersion}", this.locale) }; 

        return {
            ...object,
            color: embedColor,
            thumbnail: object.thumbnail ? { url: object.thumbnail! } : undefined,
            image: object.image ? { url: object.image! } : undefined,
        } as APIEmbed
    }

    /**
     * Generates Discord buttons components
     * @param buttons 
     */
    buttons(buttons: Array<Button>, replace?: object) {
        
        const buttonsArray = []

        for (const button of buttons) {
            let buttonRow = new ButtonBuilder();
            let customId = [];

            if (button.id !== undefined) customId.push(button.id);
            else customId.push(buttons.length <= 1 ? 0 : Math.random());

            if (!button.owner) customId.push(this.player.user.id);
            else customId.push(button.owner);

            if (button.cooldown) {
                customId.push(button.cooldown.id);
                customId.push(button.cooldown.time);
            } else {
                customId.push(0);
                customId.push(0);
            }

            if (button.args) {
                for (let value of Object.values(button.args)) {
                    customId.push(value);
                }
            }
            
            let color = 2;
            if (button.url) {
                color = 5;
                buttonRow.setURL(this.client.formatText(button.url, this.locale, replace))
            }
            else if (button.style) color = BUTTON_COLORS[button.style];
           
            if (button.hardEmoji) buttonRow.setEmoji(button.hardEmoji);
            if (button.emoji) buttonRow.setEmoji(deepValue(emojis, button.emoji) || button.emoji);
            if (button.label) buttonRow.setLabel(this.client.formatText(button.label, this.locale, replace));
            if (button.disabled) buttonRow.setDisabled(true);
            if (button.skuId) buttonRow.setSKUId(button.skuId);

            buttonRow.setStyle(color);
            if (!button.url && !button.skuId) buttonRow.setCustomId(customId.join(';'))

            buttonsArray.push(buttonRow);
        }

        const row = new ActionRowBuilder().addComponents(buttonsArray);

        return row as any;
    }

    /**
     * Generates a Discord select menu
     * @param object 
     * @returns 
     */
    selectMenu(object: {
        id?: number,
        owner?: string,
        args?: object,
        placeholder?: string,
        options?: Array<{
            label: string,
            description?: string,
            emoji?: string,
            hardEmoji?: string,
            value: string,
            default?: boolean
        }>,
        minValues?: number,
        maxValues?: number,
        cooldown?: { id: string, time: number },
        followUp?: boolean
    }, replace?: object) {
        const customId = [];
        if (object.id !== undefined) customId.push(object.id + (object.followUp ? "F" : ""));
        else customId.push(0);

        customId.push(this.player.user.id);

        if (object.cooldown) {
            customId.push(object.cooldown.id);
            customId.push(object.cooldown.time);
        } else {
            customId.push(0);
            customId.push(0);
        }

        if (object.args) {
            for (let value of Object.values(object.args)) {
                customId.push(value);
            }
        }

        const menu = new StringSelectMenuBuilder();
        menu.setCustomId(customId.join(';'));

        if (object.placeholder) menu.setPlaceholder(this.client.formatText(object.placeholder, this.locale, replace));
        
        if (object.options && object.options.length > 0) {
            const options = [];
            for (const o of object.options) {
                options.push({
                    ...o,
                    label: this.client.formatText(o.label, this.locale, replace)?.substring(0,100), 
                    description: o.description ? this.client.formatText(o.description || "", this.locale, replace)?.substring(0,100) : undefined,
                    emoji: o.hardEmoji ? o.hardEmoji : o.emoji ? deepValue(emojis, o.emoji) : undefined
                })
            }
            
            menu.addOptions(options);
        } else {
            menu.addOptions({
                label: this.client.formatText("{locale_main_nothingToShow}", this.locale, replace),
                value: "x"
            });
        }
        

        if (object.minValues) menu.setMinValues(object.minValues);
        if (object.maxValues) menu.setMaxValues(object.maxValues);

        return new ActionRowBuilder().addComponents(menu) as any;
    }

    modal(object: {
        id?: string,
        title: string,
        args?: object,
        customId?: string,
        cooldown?: { id: string, time: number },
        inputs: Array<{
            customId: string,
            label: string,
            style: "Short" | "Paragraph",
            minLength?: number,
            maxLength?: number,
            placeholder?: string,
            value?: string,
            required?: boolean
        }>
    }, replace?: object) {
        const modalObj = new ModalBuilder();
        const customId = [];

        if (object.id !== undefined) customId.push(object.id); 
        else customId.push("0");
        
        customId.push("0");

        if (object.cooldown) {
            customId.push(object.cooldown.id);
            customId.push(object.cooldown.time);
        } else {
            customId.push(0);
            customId.push(0);
        }

        if (object.args) for (const arg of Object.values(object.args)) customId.push(arg); 
        if (object.customId) customId.push(object.customId);

        modalObj.setTitle(this.client.formatText(object.title, this.locale, replace));
        modalObj.setCustomId(customId.join(';'));
        
        const rows: ActionRowBuilder[] = [];

        for (const input of object.inputs) {
            const inp = new TextInputBuilder();
            
            inp.setCustomId(input.customId);
            inp.setLabel(this.client.formatText(input.label, this.locale, replace));
            inp.setStyle(TextInputStyle[input.style]);

            if (input.minLength) inp.setMinLength(input.minLength);
            if (input.maxLength) inp.setMaxLength(input.maxLength);
            if (input.placeholder) inp.setPlaceholder(this.client.formatText(input.placeholder, this.locale, replace));
            if (input.value) inp.setValue(input.value);
            if (input.required) inp.setRequired(true);
            if (input.required === false) inp.setRequired(false);
            
            rows.push(new ActionRowBuilder().addComponents(inp));
        }

        modalObj.addComponents(rows as any);

        return modalObj;
    }
}