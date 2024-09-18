import { APIEmbed, ActionRowBuilder, ButtonBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, User } from "discord.js";
import { DiscordClient } from "../types";
import { deepValue } from "../helpers/utils";
import emoji from '../config/emoji.json';

let emojis: any = emoji;

function parseColor(color: string) {
    color = color.replace("#", "");
    return parseInt(color, 16);
}

const BUTTON_COLORS: any = {
    blurple: 1,
    gray: 2,
    green: 3,
    red: 4,
    link: 5
}

interface Button {
    id?: String
    owner?: String
    cooldown?: { id: string, time: number }
    label?: string
    emoji?: keyof typeof emoji | string
    hardEmoji?: string,
    args?: Object
    url?: String
    disabled?: Boolean
    style?: "blurple" | "gray" | "green" | "red" | "link"
}


export default class Components {
    client: DiscordClient
    user: User
    locale: string

    constructor(client: DiscordClient, locale: string, user: User) {
        this.client = client;
        this.locale = locale;
        this.user = user;
    }

    /**
     * Generates a Discord embed
     * @param object Embed values
     * @returns Embed
     */
    embed(object: {
        title?: string,
        description?: string,
        fields?: Array<{ name?: string, value?: string, inline?: boolean }>,
        author?: { name?: string, iconUrl?: string  },
        footer?: { text?: string, iconUrl?: string  },
        color?: string,
        thumbnail?: string,
        image?: string,
    }, replace?: object) {
        if (!object.color) object.color = this.client.config.defaults.embed.color;
        let embedColor = parseColor(object.color!);

        if (!replace) replace = { user: [this.user.displayName] }
        else replace = { ...replace, user: [this.user.displayName] };

        if (object.title) object.title = this.client.formatText(object.title, this.locale, replace);
        if (object.description) object.description = this.client.formatText(object.description, this.locale, replace);
        if (object.fields) {
            for (let field of object.fields) {
                if (field.name) field.name = this.client.formatText(field.name, this.locale, replace);
                if (field.value) field.value = this.client.formatText(field.value, this.locale, replace);
            }
        }

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
    buttons(buttons: Array<Button>) {
        
        const buttonsArray = []

        for (const button of buttons) {
            let buttonRow = new ButtonBuilder();
            let customId = [];

            if (button.id !== undefined) customId.push(button.id);
            else customId.push(buttons.length <= 1 ? 0 : Math.random());

            customId.push(this.user.id);

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
            if (button.url) color = 5;
            else if (button.style) color = BUTTON_COLORS[button.style];
           
            if (button.hardEmoji) buttonRow.setEmoji(button.hardEmoji);
            if (button.emoji) buttonRow.setEmoji(deepValue(emojis, button.emoji) || button.emoji);
            if (button.label) buttonRow.setLabel(this.client.formatText(button.label, this.locale));
            if (button.disabled) buttonRow.setDisabled(true);

            buttonRow.setStyle(color);
            buttonRow.setCustomId(customId.join(';'))

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
    }) {
        const customId = [];
        if (object.id !== undefined) customId.push(object.id + (object.followUp ? "F" : ""));
        else customId.push(0);

        customId.push(this.user.id);

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
        
        if (object.placeholder) menu.setPlaceholder(object.placeholder);
        if (object.options) menu.addOptions(object.options.map(o => ({ ...o, 
            label: this.client.formatText(o.label, this.locale)?.substring(0,100), 
            description: o.description ? this.client.formatText(o.description || "", this.locale)?.substring(0,100) : undefined,
            emoji: o.hardEmoji ? o.hardEmoji : o.emoji ? deepValue(emojis, o.emoji) : undefined
        })));
        
        if (object.minValues) menu.setMinValues(object.minValues);
        if (object.maxValues) menu.setMaxValues(object.maxValues);

        return new ActionRowBuilder().addComponents(menu) as any;
    }

    modal(object: {
        id?: string,
        title: string,
        args?: object,
        customId?: string,
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
    }) {
        const modalObj = new ModalBuilder();
        const customId = [];

        if (object.id !== undefined) customId.push(object.id); 
        else customId.push("0");

        if (object.args) for (const arg of Object.values(object.args)) customId.push(arg); 
        if (object.customId) customId.push(object.customId);

        modalObj.setTitle(object.title);
        modalObj.setCustomId(customId.join(';'));
        
        const rows: ActionRowBuilder[] = [];

        for (const input of object.inputs) {
            const inp = new TextInputBuilder();
            
            inp.setCustomId(input.customId);
            inp.setLabel(input.label);
            inp.setStyle(TextInputStyle[input.style]);

            if (input.minLength) inp.setMinLength(input.minLength);
            if (input.maxLength) inp.setMinLength(input.maxLength);
            if (input.placeholder) inp.setPlaceholder(input.placeholder);
            if (input.value) inp.setValue(input.value);
            if (input.required) inp.setRequired(true);
            
            rows.push(new ActionRowBuilder().addComponents(inp));
        }

        modalObj.addComponents(rows as any);

        return modalObj;
    }
}