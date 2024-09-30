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

function base10ToBase26(num: number) {
    if (num < 0) {
        return ''; // Handle negative numbers
    }

    let result = '';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    while (num >= 0) {
        const remainder = num % 26;
        result = alphabet[remainder] + result; // Prepend the corresponding letter
        num = Math.floor(num / 26) - 1; // Decrease num and handle the 0-indexing
    }

    return result;
}

function base26ToBase10(base26Str: string) {
    let result = 0;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < base26Str.length; i++) {
        const char = base26Str[i];
        const value = alphabet.indexOf(char);
        result = result * 26 + (value + 1); // +1 since A = 1, B = 2, ..., Z = 26
    }

    return result - 1; // Adjust for the offset
}

function parseColor(color: string) {
    color = color.replace("#", "");
    return parseInt(color, 16);
}

export { toUpperCamelCase, getTextBetweenTwoStrings, deepValue, numberWithCommas, randomElement, addHours, base10ToBase26, base26ToBase10, parseColor };