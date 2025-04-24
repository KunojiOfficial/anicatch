import { ButtonStyle } from "discord.js";
import { DiscordClient, DiscordInteraction, ComponentType } from "../types";
import { deepValue, parseColor } from "../helpers/utils";

import emoji from '../config/emoji.json';
import config from "../config/main.json";
import Player from "./Player";


interface Component {
    type: keyof typeof ComponentType
    components?: [Component?,Component?,Component?,Component?,Component?,Component?,Component?,Component?,Component?,Component?]

    button_data?: ButtonData
    container_data?: ContainerData
    string_select_data?: StringSelectData
    section_data?: SectionData
    text_display_data?: TextDisplayData
    thumbnail_data?: ThumbnailData
    media_gallery_data?: MediaGalleryData
    separator_data?: SeparatorData
}

interface ButtonData {
    id?: string
    owner?: string
    cooldown?: { id: string, time: number }
    label?: string
    emoji?: string
    args?: object
    disabled?: boolean
    style?: keyof typeof ButtonStyle
    skuId?: string
    url?: string
}

interface ContainerData {
    color?: string
}

interface StringSelectData {
    id?: string
    owner?: string
    cooldown?: { id: string, time: number }
    label?: string
    emoji?: string
    args?: object
    disabled?: boolean
    options?: Array<StringSelectOption>
}

interface StringSelectOption {
    label: string
    value: string
    description?: string
    emoji?: string
}

interface TextDisplayData {
    content: string
}

interface UnfurledMediaItem {
    url: string
}

interface ThumbnailData {
    media: UnfurledMediaItem,
    description?: string,
    spoiler?: boolean
}

interface Accessory {
    type: "Button" | "Thumbnail"
    button_data?: ButtonData
    thumbnail_data?: ThumbnailData
}

interface SectionComponent {
    type: "TextDisplay",
    text_display_data: TextDisplayData
}

interface SectionData {
    components: [SectionComponent, SectionComponent?, SectionComponent?]
    accessory: Accessory
}

interface MediaGalleryData {
    items: Array<ThumbnailData>
}

interface SeparatorData {
    divider?: boolean
    spacing?: 1 | 2
}

const MAX_COMPONENTS = 30;

export default class ComponentsV2 {
    client: DiscordClient
    player: Player
    locale: string

    totalComponents: number = 0

    constructor(client: DiscordClient, locale: string, player: Player) {
        this.client = client;
        this.locale = locale;
        
        this.player = player;
    }

    private actionRow(components: Array<Component>): object {
        components = components.map(c => this.parseComponent(c)).filter(c => c !== null)
        if (!components.length) return null;
        return { components }
    }

    /**
     * Creates a button component for Discord message
     * @param data Button data
     * @returns Button component 
     */
    private button(data: ButtonData): object {
        if (data.style === "Premium" && !data.skuId) return null;
        if (data.style === "Link" && !data.url) return null;

        if (data.emoji) data.emoji = deepValue(emoji, data.emoji) || data.emoji
        delete data.id;
        
        return {
            ...data,
            style: data.style ? ButtonStyle[data.style] : ButtonStyle.Secondary,
            custom_id: Math.random().toString(36).substring(2, 15)
        }
    }

    private stringSelect(data: StringSelectData): object {
        if (!data.options) return null;

        delete data.id;
        
        return {
            ...data,
            custom_id: Math.random().toString(36).substring(2, 15),
            options: data.options.map((o) => ({
                ...o,
                label: o.label || o.value,
                value: o.value || o.label
            }))
        }
    }

    private section(data: SectionData): object {
        let obj = {
            components: data.components?.map(c => this.parseComponent(c)).filter(c => c !== null) || [],
            accessory: this.parseComponent(data.accessory)
        }

        if (!obj.accessory || !obj.components) return null;
        return obj;
    }

    private textDisplay(data: TextDisplayData): object {
        return {
            content: data.content
        }
    }

    private thumbnail(data: ThumbnailData): object {
        return { ...data }
    }

    private mediaGallery(data: MediaGalleryData): object {
        return { ...data }
    }

    private separator(data: SeparatorData): object {
        return { ...data }
    }

    private container(data: ContainerData, components: Array<Component>): object {

        return {
            accent_color: parseColor(data.color || config.defaults.embed.color),
            components: components
        }
    }

    private parseComponent(component: Component) {
        if (!component || this.totalComponents >= MAX_COMPONENTS) return null;
        this.totalComponents++;

        let parsed;

        if (component.type === "ActionRow") {
            parsed = this.actionRow(component.components || []);
        } else if (component.type === "Button") {
            parsed = this.button(component.button_data || {});
        } else if (component.type === "Container") {
            parsed = this.container(component.container_data || {}, component.components.map(c => this.parseComponent(c)).filter(c => c !== null));
        } else if (component.type === "StringSelect") {
            parsed = this.stringSelect(component.string_select_data || {});
        } else if (component.type === "Section") {
            parsed = this.section(component.section_data);
        } else if (component.type === "TextDisplay") {
            parsed = this.textDisplay(component.text_display_data);
        } else if (component.type === "Thumbnail") {
            parsed = this.thumbnail(component.thumbnail_data);
        } else if (component.type === "MediaGallery") {
            parsed = this.mediaGallery(component.media_gallery_data);
        } else if (component.type === "Separator") {
            parsed = this.separator(component.separator_data || {});
        }

        if (!parsed) return null;

        parsed.type = ComponentType[component.type];

        return parsed;
    }

    public async send(interaction: DiscordInteraction, payload: {
        components: Array<Component>
    }): Promise<void> {
        const url = `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`;

        payload.components = payload.components.map(c => this.parseComponent(c)).filter(c => c !== null);

        const body =  {
            type: 4,
            data: {
                flags: "32768",
                ...payload
            }
        }

        // console.log(JSON.stringify(payload, null, 2))

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bot ${this.client.token}`,
            },
            body: JSON.stringify(body),
        });


        if (!response.ok) {
            const error = await response.json();
            console.error("Failed to send message:", JSON.stringify(error.errors, null, 2));
        }
    }
}