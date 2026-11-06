import base from './towing-combat.config.mjs';
import {defineConfig} from 'playwright/test';
import {fileURLToPath} from 'node:url';
export default defineConfig({...base,testMatch:'space-groups.spec.mjs',outputDir:fileURLToPath(new URL('../../dist/space-groups-browser/artifacts',import.meta.url)),reporter:[['line'],['json',{outputFile:fileURLToPath(new URL('../../dist/space-groups-browser/results.json',import.meta.url))}]]});
