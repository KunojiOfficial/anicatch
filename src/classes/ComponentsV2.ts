import { ButtonStyle, MessageFlags, parseEmoji } from "discord.js";
import { ButtonData, Component, ComponentType, ContainerData, MediaGalleryData, SectionData, SeparatorData, StringSelectData, TextDisplayData, ThumbnailData } from "../types/componentTypes.ts";

import { deepValue, parseColor } from "../helpers/utils.ts";

import emojiConfig from "../config/emoji.json";
import config from "../config/main.json";

import Client from "./Client";
import Player from "./Player.ts";

const MAX_COMPONENTS = 30;

export default class ComponentsV2 {
    client: Client
    locale: string
    player: Player

    totalComponents: number = 0

    public readonly Flag = MessageFlags.IsComponentsV2;

    constructor(client: Client, locale: string, player: Player) {
        this.client = client;
        this.locale = locale;
        this.player = player;
    }

    private actionRow(components: Array<Component>, replace?: any): object | null {
        components = components.map(c => this.parseComponent(c, replace)).filter(c => c !== null)
        if (!components.length) return null;
        return { components }
    }

    /**
     * Creates a button component for Discord message
     * @param data Button data
     * @returns Button component 
     */
    private button(data: ButtonData, replace?: any): object | null {
        if (data.style === "Premium" && !data.skuId) return null;
        if (data.style === "Link" && !data.url) return null;

        let emojiData = "";
        if (data.emoji) emojiData = deepValue(emojiConfig, data.emoji);
        else if (data.hardEmoji) emojiData = data.hardEmoji;

        let emoji;
        if (emojiData !== "") {
            const { id, name } = parseEmoji(emojiData)
            emoji = { id, name } as any;
        }

        if (data.label) data.label = this.client.formatText(data.label, this.locale, replace);

        let customId = [];
        if (data.id !== undefined) customId.push(data.id);
        else customId.push(0);
        
        if (!data.owner) customId.push(this.player.user.id);
        else customId.push(data.owner);

        if (data.cooldown) {
            customId.push(data.cooldown.id);
            customId.push(data.cooldown.time);
        } else {
            customId.push(0);
            customId.push(0);
        }

        if (data.args) {
            for (let value of Object.values(data.args)) {
                customId.push(value);
            }
        }

        delete data.id;
        
        return {
            ...data,
            emoji,
            style: data.style ? ButtonStyle[data.style] : ButtonStyle.Secondary,
            custom_id: !data.url && !data.skuId ? customId.join(";") : undefined,
            url: data.url ? this.client.formatText(data.url, this.locale) : undefined,
        }
    }

    private stringSelect(data: StringSelectData): object | null {
        if (!data.options) return null;

        for (const option of data.options) {
            let emojiData = "";
            if (option.emoji) emojiData = deepValue(emojiConfig, (option.emoji as any)?.name || option.emoji);
            else if (option.hardEmoji) emojiData = option.hardEmoji;

            let emoji;
            if (emojiData !== "") {
                const { id, name } = parseEmoji(emojiData)
                emoji = { id, name } as any;
            }

            option.emoji = emoji;
        }

        const customId = [];
        if (data.id !== undefined) customId.push(data.id + (data.followUp ? "F" : ""));
        else customId.push(0);

        customId.push(this.player.user.id);

        if (data.cooldown) {
            customId.push(data.cooldown.id);
            customId.push(data.cooldown.time);
        } else {
            customId.push(0);
            customId.push(0);
        }

        if (data.args) {
            for (let value of Object.values(data.args)) {
                customId.push(value);
            }
        }

        delete data.id;
        
        return {
            ...data,
            custom_id: customId.join(";"),
            placeholder: data.placeholder ? this.client.formatText(data.placeholder, this.locale) : undefined,
            options: data.options.map((o) => ({
                ...o,
                label: this.client.formatText(o.label, this.locale),
                description: o.description ? this.client.formatText(o.description || "", this.locale) : undefined,
                value: o.value || o.label
            }))
        }
    }

    private section(data: SectionData, replace?: any): object | null {
        let obj = {
            components: data.components?.map(c => this.parseComponent(c, replace)).filter(c => c !== null) || [],
            accessory: this.parseComponent(data.accessory, replace)
        }

        if (!obj.accessory || !obj.components) return null;
        return obj;
    }

    private textDisplay(data: TextDisplayData, replace?: any): object {
        const replaceCopy = { ...replace };
        return {
            content: this.client.formatText(data.content, this.locale, replaceCopy)
        }
    }

    private thumbnail(data: ThumbnailData): object {
        return { ...data }
    }

    private mediaGallery(data: MediaGalleryData): object {
        return { ...data }
    }

    private separator(data: SeparatorData): object {
        return { ...data, }
    }

    private container(data: ContainerData, components: Array<Component>, replace?: any): object {
        components = components.map(c => this.parseComponent(c, replace)).filter(c => c !== null)
        return {
            accent_color: data.color ? parseColor(data.color) : parseColor(config.defaults.embed.color),
            components: components
        }
    }

    private parseComponent(component: Component, replace?: any): any {
        if (!component || this.totalComponents >= MAX_COMPONENTS*50) return null;
        this.totalComponents++;
        let parsed;


        if (component.type === "ActionRow") {
            if (!component.components) return null;
            parsed = this.actionRow(component.components as Component[]);
        } else if (component.type === "Button") {
            parsed = this.button(component.button_data || {}, replace);
        } else if (component.type === "Container") {
            if (!component.components) return null;
            parsed = this.container(component.container_data || {}, component.components, replace);
        } else if (component.type === "StringSelect") {
            parsed = this.stringSelect(component.string_select_data || {});
        } else if (component.type === "Section") {
            if (!component.section_data) return null;
            parsed = this.section(component.section_data, replace);
        } else if (component.type === "TextDisplay") {
            if (!component.text_display_data) return null;
            parsed = this.textDisplay(component.text_display_data, replace);
        } else if (component.type === "Thumbnail") {
            if (!component.thumbnail_data) return null;
            parsed = this.thumbnail(component.thumbnail_data);
        } else if (component.type === "MediaGallery") {
            if (!component.media_gallery_data) return null;
            parsed = this.mediaGallery(component.media_gallery_data);
        } else if (component.type === "Separator") {
            parsed = this.separator(component.separator_data || {});
        }

        if (!parsed) return null;

        (parsed as any).type = ComponentType[component.type];
        if (component.component_id) (parsed as any).id = component.component_id

        return parsed;
    }

    /**
     * Constructs components for Discord message
     * @param components Components to construct
     * @returns Constructed components
     */
    public construct(components: Array<Component>, replace?: any): any {
        components = components.map(c => this.parseComponent(c, replace)).filter(c => c !== null);
        // console.log(this.totalComponents)
        if (!components.length) return null;
        return components;
    }
}