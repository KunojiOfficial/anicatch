import { SlashCommandBuilder } from 'discord.js';
import Command from '../classes/Command';

export default new Command({
    emoji: "🛒",
    data: new SlashCommandBuilder()
        .setName("store")
        .setDescription("Buy cool items and eghehgjeihej!"),
    panel: "store"
});