function toUpperCamelCase (text: string): string {
    return text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase());
}

function getTextBetweenTwoStrings(string: String, start: string, end: string) {
    const matches = string.match(new RegExp(`${start}(.*?)${end}`, 'g')) || []; 
    return [ matches, matches.map(match => match.slice(start.length, -end.length)) ]
}

function deepValue(obj: any, path: any){
    for (var i=0, path=path.split('.'), len=path.length; i<len; i++){
        obj = obj[path[i]];
    };
    return obj;
};

function numberWithCommas(x: any) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function randomElement(array: any) {
    return array[Math.floor((Math.random()*array.length))];
}

function addHours(date: Date, hours: number) {
    let now = new Date(date);
    now.setHours(now.getHours() + hours);
    return now;
}

function base10ToBase26(num: number): any {
    var mod = num % 26,
        pow = num / 26 | 0,
        out = mod ? String.fromCharCode(64 + mod) : (--pow, 'Z');
    
    return pow ? base10ToBase26(pow) + out : out;
}

function base26ToBase10(str: string) {
    let result = 0;
    for (let i = 0; i < str.length; i++) {
        let charValue = str.charCodeAt(i) - 64;  // A = 1, B = 2, ..., Z = 26
        result = result * 26 + charValue;
    }
    return result;
}

function parseColor(color: string) {
    color = color.replace("#", "");
    return parseInt(color, 16);
}

function getRandomNumber(x: number, y: number) {
    return Math.floor(Math.random() * (y - x + 1)) + x;
}

export { getRandomNumber, toUpperCamelCase, getTextBetweenTwoStrings, deepValue, numberWithCommas, randomElement, addHours, base10ToBase26, base26ToBase10, parseColor };