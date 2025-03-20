import { Collection, REST, Routes } from 'discord.js';
import { loadFiles } from './utils';

import Logger from '../classes/Logger.ts';
import Command from '../classes/Command.ts';
import Formatter from '../classes/Formatter.ts';

function parseLocalization(text: string, key: string, emoji?: string) {
    if (key === "name") {
        const regex = /^[-_'\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/u;
        if (!regex.test(text)) text = text.replace(/[^-_'\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]/gu, '').slice(0, 31);
        return text;
    } else {
        if (emoji) return (emoji + " " + text).slice(0,99);
        else return text.slice(0,99);
    }
}

function localizeOptions(options: any[], command: any, formatter: Formatter, language: string, parentKey: string = "") {
    for (const option of options) {
        option.name_localizations = {};
        option.description_localizations = {};

        for (const key of ["name", "description"]) {
            let value = formatter.f(`{locale_commands_${command.data.name}_options_${parentKey}${option.name}_${key}}`, language);
            if (value.includes("commands.")) continue;

            option[`${key}_localizations`][language] = parseLocalization(value, key, option.type === 1 ? command.emoji[option.name] : undefined);
        }

        if (option.options) {
            localizeOptions(option.options, command, formatter, language, `${parentKey}${option.name}_options_`);
        }

    }
}

const allCommands = [];

function handleCommand(command: any, formatter: Formatter) {
    //aliases
    if (command.data.aliases?.length) {
        for (const alias of command.data.aliases) {
            handleCommand({...command, data: {...command.data, name: alias, aliases: []}}, formatter);
        }
    }

    //localization
    command.data.name_localizations = {};
    command.data.description_localizations = {};
    for (const language in formatter.localization.locales) {
        for (const key of ["name", "description"]) {
            let value = formatter.f(`{locale_commands_${command.data.name}_${key}}`, language);
            if (value.includes("commands.")) continue;
            
            command.data[`${key}_localizations`][language] = parseLocalization(value, key, command.emoji);

            if (language === "en-US") {
                command.data[key] = command.data[`${key}_localizations`][language];
            }
        }

        localizeOptions(command.data.options, command, formatter, language);
    }

    command.data.description = command.emoji + " " + command.data.description;
    command = command.data as any;

    allCommands.push(command);
}

export default async function deployCommands(logger: Logger, formatter: Formatter) {
    const commands = new Collection<string, Command>();
    const count = await loadFiles(commands, "src/interactions/commands");

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    const route = process.env.NODE_ENV === "development" ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DEV_GUILD_ID) : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

    const jsonCommands: Array<{data: any, emoji: any}> = commands.map(cmd => ({data: cmd.data.toJSON(), emoji: cmd.emoji}));
    
    for (let command of jsonCommands) {
        handleCommand(command, formatter);
    }

    try {
        await rest.put(route, { body: allCommands });
        logger.info(`Deployed ${count} commands`);
    } catch (err) {
        console.error(err);
    }
}