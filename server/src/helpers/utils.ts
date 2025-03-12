import { Collection } from "discord.js";
import { readdirSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

import config from "../config/main.json";
import emoji from "../config/emoji.json";

function toUpperCamelCase (text: string): string {
    return text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase());
}

function getTextBetweenTwoStrings(string: String, start: string, end: string) {
    if (typeof string !== 'string') string = string.toString();
    
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

async function loadFiles(collection: Collection<string, any>, directory: string): Promise<number> {
    const filePath: string = path.resolve(process.cwd(), directory);
    const files: string[] = readdirSync(filePath).filter(
        (file) => file.endsWith('.js') || file.endsWith('.ts')
    );

    for (const file of files) {
        let name = path.parse(file).name.replace(/.cmd|.sel|.btn/, '');
        const cmdUrl = pathToFileURL(`${filePath}/${file}`).href;
        const command: any = (await import(cmdUrl)).default as any
        
        if (command.id !== undefined) name = command.id.toString();
        collection.set(name, command);
    }

    return collection.size;
}

function unixDate(date: Date, format?: 'long' | 'short' | 'hours') {
    let type = 'R';
    switch (format) {
        case 'long': type = 'f'; break;
        case 'short': type = 'D'; break;
        case 'hours': type = 't'; break;
        default: type = 'R'; break;
    }

    return (`<t:${parseInt((date.getTime() / 1000).toFixed(0))}:${type}>`);
}

export { getRandomNumber, toUpperCamelCase, getTextBetweenTwoStrings, deepValue, numberWithCommas, randomElement, addHours, base10ToBase26, base26ToBase10, parseColor, loadFiles, unixDate };