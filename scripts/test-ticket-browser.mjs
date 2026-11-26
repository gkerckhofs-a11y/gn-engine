import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {startTicketDemo} from './ticket-demo.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try{
 for(const width of [1440,390]){
  const portable=process.env.TICKET_PORTABLE_DIRECTORY;
  const demo=portable?await (await import(pathToFileURL(resolve(portable,'demo.mjs')).href)).startTicketDemo(0,JSON.parse(await readFile(resolve(portable,'assets.json'),'utf8'))):await startTicketDemo();
  const ctx=await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  const page=await ctx.newPage();page.setDefaultTimeout(9000);
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Débordement horizontal '+width);
  try{
   await page.goto(demo.url);await page.getByRole('link',{name:'S’inscrire à une aventure'}).click();await fits();
   await page.getByRole('link',{name:'Voir la session'}).click();await page.getByRole('link',{name:'Réserver ma place'}).click();
   await page.getByRole('button',{name:'Continuer avec Google'}).click();
   await page.getByLabel('Votre nom civil ou usuel').fill('Lucie Démo');await page.getByRole('checkbox').check();
   await page.getByRole('button',{name:'Réserver et continuer vers le paiement'}).click();
   await page.getByRole('link',{name:'Payer mon inscription'}).click();await fits();
   await page.getByRole('button',{name:'Simuler le paiement accepté'}).click();
   await page.getByRole('link',{name:'Choisir mon personnage'}).click();await fits();
   await page.getByRole('article').filter({has:page.getByRole('heading',{name:'Nora Venn'})}).getByRole('link').click();
   await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Choisir ce personnage'}).click();
   await page.getByRole('heading',{name:'Vous incarnez Nora Venn'}).waitFor();await page.getByRole('button',{name:'Marquer les consignes comme lues'}).click();
   await page.getByText('Consignes lues.',{exact:true}).waitFor();await fits();
   await page.locator('#demo-profile').selectOption('owner');
   await page.getByRole('heading',{name:'Accueil des participants'}).waitFor();
   await page.getByText('Je confirme l’ouverture du briefing').click();
   await page.getByRole('button',{name:'Activer les personnages au briefing'}).click();
   await page.getByText('Enregistré.',{exact:true}).waitFor();
   await page.locator('#demo-profile').selectOption('new');await page.getByRole('link',{name:'Mes inscriptions'}).click();
   await page.getByRole('link',{name:'Mon personnage'}).click();await page.getByRole('link',{name:'Entrer dans mon terminal'}).click();
   await page.locator('#app').getByText(/Nora Venn/).first().waitFor();assert.match(page.url(),/#\/play\//);
   assert.deepEqual(errors,[]);console.log('Parcours complet, largeur '+width+' px, terminal natif ouvert.');
  }catch(error){console.error(page.url(),(await page.locator('body').innerText()).slice(0,1600));throw error;}
  finally{await ctx.close();await demo.close();}
 }
}finally{await browser.close();}
