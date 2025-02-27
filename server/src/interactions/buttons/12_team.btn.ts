import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";
import Card from "../../classes/Card";

export default new Interactable({
    id: 12,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args, player } = interaction;
        let [ action, number, where, data ] = args;

        number = parseInt(number);

        switch (action) {
            case "clear":
                await client.db.cardInstance.updateMany({ where: { userId: player.data.id, team: number }, data: { team: 0 } });
                break;
            case "add":
                const team = await client.db.cardInstance.findMany({ where: { userId: player.data.id, team: { gt: 0 } } });
                const slots = team.map(t => t.team);
                let slot = 0;
                
                for (let i = 1; i < 6; i++) {
                    if (slots.includes(i)) continue;
                    slot = i;
                    break;
                }
                
                if (!slot) throw 30; 

                await client.db.cardInstance.updateMany({ where: { userId: player.data.id, team: 0, id: number, status: "IDLE" }, data: { team: slot } });
                break;
            default:
                break;
        }

        
        let message;
        if (where === "card") {
            let info = data.split(":");
            message = await client.panels.get("animon")!.execute!(interaction, info[0], info[1], info[2]); 
        } else message = await client.panels.get("team")!.execute!(interaction, data);

        return message;
    }
});