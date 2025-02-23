import axios from 'axios';
import dotenv from "dotenv";
import { write, writeFile } from 'fs';
import { PrismaClient } from "@prisma/client";

dotenv.config({
    path: ".env"
});


const prisma = new PrismaClient();

let obj = {};
axios.get(`https://discord.com/api/v10/applications/${process.env.DISCORD_CLIENT_ID}/emojis`, {
    headers: {
        'Authorization': `Bot ${process.env.BOT_TOKEN}`
    }
}).then(async res => {
    if (res.status !== 200) {
        throw new Error(`Failed to fetch emojis: ${res.statusText}`);
    }

    let emObj = {};
    for (const emoji of res.data.items) {
        if (!emoji.name.endsWith('_') && emoji.name.includes('_')) {
            const parts = emoji.name.split('_');
            let current = emObj;
            for (let i = 0; i < parts.length; i++) {
                if (i === parts.length - 1) {
                    current[parts[i]] = `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
                } else {
                    if (!current[parts[i]]) current[parts[i]] = current[parts[i]] || {};
                    current = current[parts[i]];
                }
            }
        }

        obj[emoji.name] = `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
        await prisma.item.updateMany({where: { name: emoji.name }, data: { emoji: obj[emoji.name] }});
    }

    obj = { ...obj, ...emObj, yes: '✅', no: '❌' };

    writeFile('src/config/emoji.json', JSON.stringify(obj, null, 2), (err) => {
        if (err) throw err;
        console.log('Emojis saved to emoji.json');
    });

});