import { AutoTranslator, ObjectTranslator } from '@seelen/translation-toolkit';
import { SupportedLanguages } from '@seelen-ui/lib';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import yaml from 'js-yaml';

const API_KEY = process.env.DEEPL_API_KEY;

if (!API_KEY) {
  console.error('Missing DEEPL_API_KEY');
  process.exit(1);
}

const translator = new AutoTranslator({ source: 'en', deeplApiKey: API_KEY });

const targetLanguages = SupportedLanguages.filter((lang) => lang.value !== 'en');

function deepSortObject<T>(obj: T): T {
  if (Array.isArray(obj)) {
    // if it's an array, recursively sort its elements
    return obj.map(deepSortObject) as unknown as T;
  } else if (obj !== null && typeof obj === 'object') {
    // if it's an object, sort its entries
    const sortedEntries = Object.entries(obj)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort keys
      .map(([key, value]) => [key, deepSortObject(value)]); // Recursively sort values

    return Object.fromEntries(sortedEntries) as T;
  }
  // if it's not an array or object, return it as is
  return obj;
}

async function completeTranslationsFor(localesDir: string) {
  const enPath = `${localesDir}/en.yml`;
  const strYaml = readFileSync(enPath, 'utf8');
  const en = deepSortObject(yaml.load(strYaml) as object);
  writeFileSync(enPath, yaml.dump(en)); // overwrite sorted

  const yamlTranslator = new ObjectTranslator(en, translator);

  for (const targetLang of targetLanguages) {
    const filePath = `${localesDir}/${targetLang.value}.yml`;

    let translation: any = {};
    if (existsSync(filePath)) {
      translation = yaml.load(readFileSync(filePath, 'utf8'));
    }

    const translated = await yamlTranslator.translate_to(targetLang.value, translation);
    writeFileSync(filePath, yaml.dump(deepSortObject(translated)));
  }
}

await completeTranslationsFor('src/apps/toolbar/i18n/translations');
await completeTranslationsFor('src/apps/seelenweg/i18n/translations');
await completeTranslationsFor('src/apps/settings/i18n/translations');
await completeTranslationsFor('src/apps/seelen_rofi/i18n/translations');

await completeTranslationsFor('src/background/i18n');
