import {defineConfig} from 'playwright/test';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));

export default defineConfig({
  testDir:'.',testMatch:'recette.spec.mjs',fullyParallel:false,workers:1,retries:0,
  timeout:90000,expect:{timeout:15000},outputDir:'../../dist/recette-browser/artifacts',
  reporter:[['line'],['json',{outputFile:'dist/recette-browser/results.json'}],['html',{outputFolder:'dist/recette-browser/report',open:'never'}]],
  use:{browserName:'chromium',headless:true,baseURL:'http://127.0.0.1:4173',viewport:{width:1280,height:900},screenshot:'only-on-failure',trace:'off',video:'off'},
  webServer:{command:'node scripts/recette.mjs',cwd:root,url:'http://127.0.0.1:4173/recette.json',reuseExistingServer:false,timeout:180000,gracefulShutdown:{signal:'SIGTERM',timeout:10000}},
});
