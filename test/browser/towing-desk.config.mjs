import base from './towing-combat.config.mjs';
import {defineConfig} from 'playwright/test';
import {fileURLToPath} from 'node:url';
export default defineConfig({...base,testMatch:'towing-desk.spec.mjs',outputDir:fileURLToPath(new URL('../../dist/towing-desk-browser/artifacts',import.meta.url)),reporter:[['line'],['json',{outputFile:fileURLToPath(new URL('../../dist/towing-desk-browser/results.json',import.meta.url))}]]});
