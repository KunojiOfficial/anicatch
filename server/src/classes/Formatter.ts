import { deepValue, getTextBetweenTwoStrings, numberWithCommas } from "src/helpers/utils";
import Localization from "./Localization";

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
        const [matches, values] = getTextBetweenTwoStrings(text, `{`, '}');

        for (const [i, value] of values.entries()) {
            const path = value.split('_');
            const type = path.shift();

            const rest = path.join('.')

            let replacement: any = "";
            if (type === "locale") replacement = this.f(this.localization.t(locale, rest), locale, variables);
            else if (type === "custom") replacement = this.custom(path, locale, variables);
            else if (type === "number") replacement = numberWithCommas(rest);
            else if (type === "item") replacement = deepValue(variables, rest);
            else if (type === "command") replacement = this.commands[rest] ? `</${rest}:${this.commands[rest]}>` : `/${rest}`;
            else replacement = deepValue(this.formatables[type], rest);

            text = text.replace(matches[i], replacement);
        }

        return text || "?";
    }

    private custom(path: string[], locale: string = 'en-US', variables?: object): string {
        let replacement = deepValue(variables, path.join("."));

        if (replacement.length > 1) {
            replacement = replacement.reverse();
            replacement = replacement.pop();
        } else if (replacement.length) {
            replacement = this.f(replacement[0], locale, variables);
        }

        return replacement;
    }
}