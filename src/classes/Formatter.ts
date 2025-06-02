import { deepValue, getTextBetweenTwoStrings, numberWithCommas } from "../helpers/utils.ts";
import Localization from "./Localization.ts";

import emoji from '../config/emoji.json';
import config from "../config/main.json";
import commands from "../assets/commands.json"

export default class Formatter {
    localization: Localization = new Localization();
    commands = commands;
    formatables = {
        emoji: emoji,
        config: config
    }

    public f(text: string, locale: string = 'en-US', variables?: object): string {
        let previousText: string | null = null;

        // Continue replacing until no more placeholders change
        while (text !== previousText) {
            previousText = text;

            const [matches, values] = this.extractPlaceholders(text);
            if (matches.length === 0) break;

            for (const [i, rawValue] of values.entries()) {
                // Resolve inner placeholders in the placeholder string itself
                const value = this.f(rawValue, locale, variables); 

                const replacement = this.evaluatePlaceholder(value, locale, variables);
                text = text.replace(matches[i], replacement);
            }
        }

        return text || "?";
    }

    private evaluatePlaceholder(value: string, locale: string, variables?: object): string {
        const path = value.split('_');
        const type = path.shift();
        const rest = path.join('.');

        switch (type) {
            case 'locale':
                return this.f(this.localization.t(locale, rest), locale, variables);
            case 'custom':
                return this.custom(path, locale, variables);
            case 'number':
                return numberWithCommas(rest);
            case 'item':
                return String(deepValue(variables, rest));
            case 'command':
                return this.commands[rest] ? `</${rest}:${this.commands[rest]}>` : `/${rest}`;
            case 'percent':
                const percentValues = parseFloat(rest)*100;
                return isNaN(percentValues) ? "0%" : `${percentValues}%`;
            default:
                return String(deepValue(this.formatables[type], rest));
        }
    }

    private extractPlaceholders(text: string): [string[], string[]] {
        const matches: string[] = [];
        const values: string[] = [];
        let depth = 0;
        let start = -1;

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '{') {
                if (depth === 0) start = i;
                depth++;
            } else if (text[i] === '}') {
                depth--;
                if (depth === 0 && start !== -1) {
                    const full = text.slice(start, i + 1); // e.g., {locale_main_{item_type}}
                    const inner = full.slice(1, -1);        // strip outer {}
                    matches.push(full);
                    values.push(inner);
                    start = -1;
                }
            }
        }

        return [matches, values];
    }


    private custom(path: string[], locale: string = 'en-US', variables?: object): string {
        let replacement = deepValue(variables, path.join("."));

        if (!replacement) return path.join(".");
        
        if (replacement.length > 1) {
            replacement = replacement.reverse();
            replacement = replacement.pop();
        } else if (replacement.length) {
            replacement = this.f(replacement[0], locale, variables);
        }

        return replacement;
    }
}