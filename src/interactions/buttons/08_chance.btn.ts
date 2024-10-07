import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";

const COST = 20;

export default new Interactable({
    id: 8,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, client, player } = interaction;
        let [ cardId ] = args;
        cardId = parseInt(cardId);

        const animon = await client.db.cardInstance.findFirst({ where: { id: cardId }, include: { card: { include: { character: true } } } });
        if (!animon) throw 5;
        if (animon.userId !== player.data.id) throw 17;
        if (animon.status !== "FLED") throw 21;
        if (player.data.gems < COST) { // not enough gems
            await interaction.followUp({
                embeds: [ interaction.components.embed({
                    description: `{locale_errors_22}`,
                    color: "#ff0000"
                }) ],
                components: [ interaction.components.buttons([{
                    label: "Get more Gems",
                    emoji: "getGems"
                }]) ]
            });
            return {};
        }

        await client.db.$transaction(async tx => {
            await tx.user.updateMany({ where: { id: player.data.id }, data: { gems: { decrement: COST } }});
            await tx.cardInstance.updateMany({ where: { id: animon.id }, data: { status: "WILD" } });
        });

        const components = interaction.message?.components;
        const newComponents = [];

        if (components.length) {
            for (const [index, component] of components.entries()) {
                const buttons = [];  
                
                for (const button of component.components) {
                    if (button.customId?.startsWith("8")) continue;

                    let data = { ...button.data, disabled: false, style: 2 } as any;
                    buttons.push(data);
                }

                newComponents.push({
                    ...component.data,
                    components: buttons
                });
            }
        }
        
        return {
            embeds: [ 
                { 
                    ...interaction?.message?.embeds[0].data,
                    image: { url: "attachment://card.jpg" },
                    footer: { icon_url: client.getEmojiUrl("gem"), text: "Second Chance" }
                }
            ],
            components: newComponents
        }
    }
})