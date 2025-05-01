
import { ButtonStyle } from "discord.js";
import emoji from "../config/emoji.json"

enum ComponentType {
    ActionRow = 1,
    Button = 2,
    StringSelect = 3,
    TextInput = 4,
    UserSelect = 5,
    RoleSelect = 6,
    MentionableSelect = 7,
    ChannelSelect = 8,
    Section = 9,
    TextDisplay = 10,
    Thumbnail = 11,
    MediaGallery = 12,
    File = 13,
    Separator = 14,
    Container = 17
}

interface Component {
    component_id?: number
    type: keyof typeof ComponentType
    components?: Array<Component>
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
    emoji?: keyof typeof emoji
    hardEmoji?: string
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
    placeholder?: string
    cooldown?: { id: string, time: number }
    label?: string
    emoji?: string
    args?: object
    disabled?: boolean
    followUp?: boolean
    options?: Array<StringSelectOption>
}

interface StringSelectOption {
    label: string
    value: string
    description?: string
    emoji?: keyof typeof emoji
    hardEmoji?: string
    default?: boolean
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

export { ComponentType, Component, ButtonData, ContainerData, StringSelectData, StringSelectOption, TextDisplayData, ThumbnailData, MediaGalleryData, SeparatorData, SectionComponent, SectionData }