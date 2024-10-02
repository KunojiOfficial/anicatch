import { PrismaClient } from "@prisma/client";
import { ClusterManager } from "discord-hybrid-sharding";
import { parseColor } from "../helpers/utils";

import config from "../config/main.json";

export default function (db: PrismaClient, manager: ClusterManager) {
    setInterval(async () => {
        const users = await db.user.findMany({ where: { nextNotify: { lte: new Date() } } });
        
        for (const user of users) {
          await db.user.updateMany({ where: { id: user.id }, data: { nextNotify: null } });
          for (const [_, cluster] of manager.clusters) {
            const answer = await cluster.request({ action: 'directMessage', user: user.discordId, content: {
              embeds: [ {
                description: `### ✨ Your encounters have been recharged! ✨\nReturn to **${config.bot.name}** and collect your favorite anime characters! 🎉\n\n-# You can disable these notifications in your settings.`,
                color: parseColor(config.defaults.embed.color)
              } ]
            } });
            if ((answer as any).found) break;
          }
        }
      
    }, 60000);
}