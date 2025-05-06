import { CanvasRenderingContext2D, createCanvas, Image } from "canvas";

function drawCard(ctx: CanvasRenderingContext2D, img: Image, x: number, y: number, rarity: Image, ascendedRarity: Image, rarityCount: number, ascension: number) {
    drawEllipse(ctx, x+(225/2), y+(320), 250, 75);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, 215, 340, 20);
    ctx.clip();
    ctx.drawImage(img, x-5, y-5, 225, 350);
    ctx.restore();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.roundRect(x, y, 215, 340, 20);
    ctx.stroke();

    const rarityCanvas = createCanvas(50 * rarityCount, 50 * rarityCount);
    const rarityCtx = rarityCanvas.getContext('2d');

    // Set shadow properties
    rarityCtx.shadowColor = "rgba(0, 0, 0, 0.7)";
    rarityCtx.shadowBlur = 10;
    rarityCtx.shadowOffsetX = 0;
    rarityCtx.shadowOffsetY = 0;

    for (let i = 0; i < rarityCount; i++) rarityCtx.drawImage(i < ascension ? ascendedRarity : rarity, i * 50, 0, 50, 50);

    const rarityX = x + (215 - rarityCanvas.width) / 2;
    ctx.drawImage(rarityCanvas, rarityX, 340);
}

function drawEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fill();
    ctx.restore();
}

function drawStats(ctx: CanvasRenderingContext2D, ball: Image, x: number, y: number, type: Image, name: string, level: number, hpPercent: number, teamAlive: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, 495, 145, 30);
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fill();

    ctx.drawImage(type, x + 30, y + 25, 30, 30);

    ctx.font = "22px Ebrima";
    ctx.fillStyle = "white";

    ctx.textAlign = "left";
    ctx.fillText(name, x + 70, y + 47);
    ctx.textAlign = "right";
    ctx.fillText("Lv. " + level, x + 495 - 30, y + 47);

    ctx.beginPath();
    ctx.roundRect(x+30, y+65, 495-60, 25, 5);
    ctx.fillStyle = "rgb(80, 80, 80)";
    ctx.fill();

    let color = "lime"
    if (hpPercent < 0.3) color = "red";
    else if (hpPercent < 0.6) color = "yellow";

    ctx.beginPath();
    ctx.roundRect(x+30, y+65, (495-60)*hpPercent, 25, 5);
    ctx.fillStyle = color;
    ctx.fill();

    for (let i = 0; i < teamAlive; i++) ctx.drawImage(ball, x + 30 + i * 30, y + 100, 25, 25);
}

export { drawCard, drawStats };