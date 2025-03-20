import fs from "fs";
import path from "path";
import { deepValue } from "src/helpers/utils";

type Translations = Record<string, any>;

export default class Localization {
    public locales: Record<string, Translations> = {};
    private defaultLocale = "en-US";
  
    constructor() {
        this.loadLocales();
    }
  
    private loadLocales() {

        const basePath = path.join(process.cwd(), "/src/locale");
        const categories = fs.readdirSync(basePath);

        for (const category of categories) {
            const categoryPath = path.join(basePath, category);
            if (!fs.lstatSync(categoryPath).isDirectory()) continue;

            const localeFiles = fs.readdirSync(categoryPath);
            for (const file of localeFiles) {
              const locale = file.split(".")[0];
              const filePath = path.join(categoryPath, file);
              const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      
              if (!this.locales[locale]) this.locales[locale] = {};
              this.locales[locale] = { ...this.locales[locale], [category]: content };
            }
        }
    }
  
    public t(locale: string, key: string): string {
        const keys = key.split(".");
        let translation: any = this.locales[locale] || this.locales[this.defaultLocale];
  
        for (const k of keys) {
            if (translation[k] === undefined) {
                let englishTranslation = deepValue(this.locales[this.defaultLocale], key);
                
                if (englishTranslation) return englishTranslation; //return original english translation if not found
                return key; // Fallback to key if not found
            }
        
            translation = translation[k];
        }

        return translation;
    }
}