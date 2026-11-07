import {defineConfig} from 'playwright/test';
import {fileURLToPath} from 'node:url';
// Bounded component DOM + native MemoryStore; no whole-app browser recipe.
export default defineConfig({
 testDir:'.',testMatch:'towing-combat.spec.mjs',workers:1,retries:0,timeout:30000,
 outputDir:fileURLToPath(new URL('../../dist/towing-combat-browser/artifacts',import.meta.url)),
 reporter:[['line'],['json',{outputFile:fileURLToPath(new URL('../../dist/towing-combat-browser/results.json',import.meta.url))}]],
 use:{browserName:'chromium',headless:true,launchOptions:{...(process.env.GN_BROWSER_EXECUTABLE?{executablePath:process.env.GN_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox']},screenshot:'only-on-failure',trace:'off',video:'off'},
 projects:[{name:'desktop',use:{viewport:{width:1280,height:900}}},{name:'small-screen',use:{viewport:{width:360,height:800},isMobile:true,hasTouch:true}}],
});
