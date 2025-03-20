import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";
import Card from "src/classes/Card";

const keys = ["vit", "def", "pow", "agi", "spi", "res"];

export default new Panel({
    name: "allocate",
    async execute(interaction: DiscordInteraction, cardId: number | string, points: number | string = 1, stat: string): Promise<InteractionReplyOptions> {
        const { client } = interaction;

        if (typeof cardId === 'string') cardId = parseInt(cardId);
        if (typeof points === 'string') points = parseInt(points);

        const panel = await client.panels.get("animon")!.execute!(interaction, cardId, false, "stats", stat);
        const animon = await client.db.cardInstance.findFirst({ where: { id: cardId } });

        if (!animon || animon.userId !== interaction.player.data.id) throw 59;

        const card = new Card({ card: animon });
        const availablePoints = card.getStatPoints();

        if (points < 1) points = availablePoints;
        if (points > availablePoints) points = 1;

        const defaults = { id: '0', args: { path: "allocate", cardId: cardId, points: points, stat: stat } };

        const components = [ interaction.components.selectMenu({
            ...defaults,
            id: 0,
            placeholder: "⭐\u2800{locale_main_selectAttribute}",
            options: keys.map(k => ({
                label: `{locale_main_stats_${k}}`,
                value: `3:${k}`,
                default: k === stat
            })),
        }), interaction.components.buttons([{
            label: "{locale_main_back}",
            emoji: "back",
            ...defaults,
            args: { path: "animon", cardId: cardId, userAccess: false, page: "stats" }
        }, {
            ...defaults,
            emoji: "minus",
            args: { ...defaults.args, points: points - 1 },
        }, {
            label: points.toString(),
            id: '5',
            args: { min: 1, max: availablePoints, index: 2, customId: Object.values(defaults.args).join(':') }
        }, {
            ...defaults,
            emoji: "plus",
            args: { ...defaults.args, points: points + 1 }
        }, {
            id: "20",
            label: "{locale_main_allocate}",
            style: "green",
            emoji: "wyes",
            args: { cardId: cardId, points: points, stat: stat },
            disabled: availablePoints < 1,
            cooldown: { id: "allocate", time: 2 }
        }]) ]

        return {
            ...panel,
            components: components
        }
    }
}); 