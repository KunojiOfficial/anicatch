import { SlashCommandBuilder } from 'discord.js';
import Command from '../classes/Command';

export default new Command({
    emoji: "🦄",
    cooldown: 2,
    panel: "encountering",
    data: new SlashCommandBuilder()
        .setName("catch")
        .setDescription("Catch anime Waifus and Husbandos (Animons) to add them to your collection!")
})