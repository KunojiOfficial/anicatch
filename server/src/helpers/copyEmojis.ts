import axios from "axios";
import dotenv from "dotenv";

dotenv.config({
    path: "../../.env"
});

const token = process.env.PROD_BOT_TOKEN;

const emojis = axios.get(`https://discord.com/api/v10/applications/${process.env.PROD_DISCORD_CLIENT_ID}/emojis`, {
    headers: {
        'Authorization': `Bot ${token}`
    }
}).then(res => {
    if (res.status !== 200) {
        throw new Error(`Failed to fetch emojis: ${res.statusText}`);
    }

    for (const emoji of res.data.items) {
        console.log(emoji)
    }
});


