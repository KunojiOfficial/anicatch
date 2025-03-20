import { PrismaClient } from "@prisma/client";
import { ClusterManager } from "discord-hybrid-sharding";

import { parseColor } from "../helpers/utils.ts";
import { formatter } from "../../index.ts";

import config from "../config/main.json";

export default function (db: PrismaClient, manager: ClusterManager) {
    setInterval(async () => {
        const users = await db.user.findMany({ where: { nextNotify: { lte: new Date() }, config: { encounters: true } }, include: { config: true } });
        
        for (const user of users) {
          await db.user.updateMany({ where: { id: user.id }, data: { nextNotify: null } });
          for (const [_, cluster] of manager.clusters) {
            const answer = await cluster.request({ action: 'directMessage', user: user.discordId, content: {
              embeds: [ {
                description: formatter.f(`### {locale_main_encountersRecharged}\n{locale_main_encountersRechargedText}\n\n-# {locale_main_disableNotifications}`, user.config.locale),
                color: parseColor(config.defaults.embed.color)
              } ]
            } });
            if ((answer as any).found) break;
          }
        }
      
    }, 60000);
}