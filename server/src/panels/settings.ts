import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

import settings from "../data/settings.json";
import Components from "src/classes/Components";

const categories = Object.keys(settings);
const allSettings = settings[categories[0]].concat(settings[categories[1]]).concat(settings[categories[2]]);
export default new Panel({
    name: "settings",
    async execute(interaction: DiscordInteraction, category: string, selection: string): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;

        if (!categories.includes(category)) category = categories[0];

        let secondMenu = false, miniOptions = [];
        if (selection) {
            const setting = allSettings.find(s => s.name === selection);
            // if (!setting) throw 3;
            
            if (setting?.type === "switch") {
                await client.db.config.updateMany({
                    where: { userId: player.data.id },
                    data: { [setting.name]: { set: !player.config[setting.name] } }
                });

                interaction.player.config[setting.name] = !player.config[setting.name];
            } else {
                if (!selection.includes("/")) {
                    secondMenu = true;
                    if (selection === "locale") {
                        const languages = client.formatter.localization.locales;
                        const names = Object.keys(languages);

                        for (const name of names) {
                            miniOptions.push({
                                label: languages[name]?.main?.name,
                                value: `2:${setting.name}/${name}`,
                                hardEmoji: languages[name]?.main?.emoji,
                                default: player.config[setting.name] === name
                            });
                        }
                    }
                } else {
                    const [name, type] = selection.split("/");

                    await client.db.config.updateMany({
                        where: { userId: player.data.id },
                        data: { [name]: { set: type } }
                    });

                    interaction.player.config[name] = type;
                    if (name === "locale") {
                        interaction.locale = type as any;
                        interaction.components = new Components(client, interaction.locale, interaction.player);
                    }
                }
            }

        }

        const fields = [], options = [];
        for (const category of categories) {
            for (const setting of settings[category]) {
                let emoji;
    
                if (setting.type === "switch") emoji = player.config[setting.name] ? "{emoji_on}" : "{emoji_off}";
                else emoji = setting.emoji;
    
                fields.push({
                    name: `${emoji}\u2800{locale_main_${setting.name}_name}`,
                    value: `{emoji_empty}\u2800{locale_main_${setting.name}_description}`
                });

                options.push({
                    label: `{locale_main_${setting.name}_name}`,
                    description: `{locale_main_${setting.name}_description}`,
                    hardEmoji: client.formatText(emoji, interaction.locale),
                    value: `2:${setting.name}`,
                    default: selection === setting.name && setting.type !== "switch"
                })
            }
        }

        const components = [ interaction.components.selectMenu({
            id: 0,
            placeholder: "🔧\u2800{locale_main_selectSetting}",
            options: options,
            args: { path: "settings", category: category },
            cooldown: { id: "settings", time: 2 }
        }) ];

        if (secondMenu) {
            components.push(interaction.components.selectMenu({
                id: 0,
                placeholder: "🔧\u2800{locale_main_selectOption}",
                options: miniOptions,
                args: { path: "settings", category: "0" },
                cooldown: { id: "settings", time: 2 }
            }))
        }


        return {
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_settings} - ${player.user.displayName}`, iconUrl: player.user.displayAvatarURL() },
                description: "\u2800",
                fields: fields
            }) ],
            components: components
        }

    }
}); 