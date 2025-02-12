import { readdirSync } from "fs";
import path from "path";

async function loadFiles(object: any, directory: string) {
    const filePath: string = path.resolve(__dirname, directory);
    const files: string[] = readdirSync(filePath).filter(
        (file) => file.endsWith('.json')
    );

    for (const file of files) {
        let name = path.parse(file).name;
        const language: any = (await import(`${filePath}/${file}`)).default as any
        
        object[name] = language;
    }
}

export default class Locale {
    languages: object

    constructor() {
        this.languages = {};
    }

    async load(directory: string) {
        await loadFiles(this.languages, directory);
    }
}