import { Router } from "express";

const router = Router();

router.post("/token", async (req, res) => {

    // Exchange the code for an access_token
    const response = await fetch(`https://discord.com/api/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID as any,
            client_secret: process.env.DISCORD_CLIENT_SECRET as any,
            grant_type: "authorization_code",
            code: req.body.code,
        }),
    });
    
    // Retrieve the access_token from the response
    const { access_token } = await response.json() as any;

    // Return the access_token to our client as { access_token: "..."}
    res.send({access_token});
});

export default router;
