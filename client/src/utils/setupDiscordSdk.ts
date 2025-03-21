import { DiscordSDK } from "@discord/embedded-app-sdk";

const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

export { discordSdk }; // Export discordSdk

export default async function setupDiscordSdk() {
    await discordSdk.ready();
    console.log("Discord SDK is ready");
  
    // Authorize with Discord Client
    const { code } = await discordSdk.commands.authorize({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: [
            "identify",
            "guilds",
            "applications.commands"
        ],
    });
  
    console.log("Code received:", code);

    const response = await fetch("/.proxy/api/auth/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            code,
        }),
    });

    const { access_token } = await response.json();
    console.log("Access token received:", access_token);
    localStorage.setItem("accessToken", access_token); // Store the access token
  
    // Authenticate with Discord client (using the access_token)
    const auth = await discordSdk.commands.authenticate({
        access_token,
    });
  
    if (auth == null) {
      throw new Error("Authenticate command failed");
    }

    const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });

    if (userResponse.status !== 200) {
        throw new Error("User fetch failed");
    }

    const userData = await userResponse.json();
    localStorage.setItem("discordId", userData.id);

    return auth;
}