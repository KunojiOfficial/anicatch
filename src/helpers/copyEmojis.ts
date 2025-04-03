import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({
    path: "../../.env"
});

const token = process.env.DEV_BOT_TOKEN;
// Function to fetch image data and convert to Data URI
async function getImageDataUri(url: string): Promise<string> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const mimeType = response.headers['content-type'];
    return `data:${mimeType};base64,${base64}`;
}

async function copyEmojis() {
    const emojis = axios.get(`https://discord.com/api/v10/applications/${process.env.DEV_DISCORD_CLIENT_ID}/emojis`, {
        headers: {
            'Authorization': `Bot ${token}`
        }
    }).then(async res => {
        if (res.status !== 200) {
            throw new Error(`Failed to fetch emojis: ${res.statusText}`);
        }
    
        for (const emoji of res.data.items) {
            const url = `https://cdn.discordapp.com/emojis/${emoji.id}.png`;
            const filePath = path.join(process.cwd(), 'emojis', `${emoji.name}.png`);
    
            // Download and save the image
            // await downloadImage(url, filePath);
    
            // Fetch the image data and convert to Data URI
            const dataUri = await getImageDataUri(url);
    
            const payload = {
                name: encodeURIComponent(emoji.name),
                image: dataUri
            };
    
            const upload = await axios.post(`https://discord.com/api/v10/applications/${process.env.DISCORD_CLIENT_ID}/emojis`, payload, {
                headers: {
                    'Authorization': `Bot ${process.env.BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }).catch(err => {
                console.log(err);
            });
        }
    });
}

    
    // // Function to download image from URL and save to file
    // async function downloadImage(url: string, filePath: string): Promise<void> {
    //     const response = await axios.get(url, { responseType: 'arraybuffer' });
    //     fs.mkdirSync(path.dirname(filePath), { recursive: true });
    //     fs.writeFileSync(filePath, response.data);
    // }

export default copyEmojis;