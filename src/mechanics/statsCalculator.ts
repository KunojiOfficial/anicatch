function calculateExpForLevel(level: number) {
    if (level === 1) return 0;
    return 100 * Math.pow(level, 2);
}

function calculateLevelFromExp(exp: number) {
    if (exp === 0) return 1;
    return Math.max(1,Math.floor(Math.sqrt(exp/100)));
}

function calculateHp(vit: number) {
    return 1000 + Math.floor(15*Math.pow(vit-1, 1.8));
}

function calculateAtk(powCard: number, powMove: number) {
    return Math.floor(Math.pow(powCard, 1.4)*2 + Math.pow(powMove, 1.8)*4);
}

function calculateDmg(atk: number, def: number, effectiveness: number, blocked: number) {
    return Math.floor(Math.max(0, Math.floor((atk-(Math.pow(def, 1.2)*1.3))*effectiveness)-blocked));
}

function calculateDroppedExp(level: number) {
    return Math.floor(250 * Math.pow(level, 1.1));
}

function calculateDroppedCoins(turns: number, coins: number) {
    const minCoins = Math.ceil(coins * 0.2);
    const maxCoins = Math.ceil(coins * 0.45);

    if (turns < 5) return minCoins;
    else return maxCoins;
}

function calculateDroppedFragments(spareRange: number[]) {
    const [min, max] = spareRange;
    const amount = Math.ceil(Math.random() * (max - min + 1)) + min;

    return amount;
}

export { calculateLevelFromExp, calculateExpForLevel, calculateHp, calculateAtk, calculateDmg, calculateDroppedExp, calculateDroppedCoins, calculateDroppedFragments };