import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,data)=>{const target=path.join(root,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);};
const config=JSON.parse(read('data/config.json'));
const initial='window.CMMSF_CONFIG_INICIAL = '+JSON.stringify(config)+';\n';
write('js/initial-data.js',initial);

const scripts=['js/initial-data.js','js/calculos.js','js/banco.js','js/sync.js','js/official.js','js/app.js'];
let html=read('index.html');
html=html.replace(/\s*<link rel="manifest"[^>]*>/,'').replace(/\s*<link rel="icon"[^>]*>/,'');
html=html.replace('<link rel="stylesheet" href="css/app.css">','<style>\n'+read('css/app.css')+'\n</style>');
html=html.replace('<link rel="stylesheet" href="css/mobile.css">','<style>\n'+read('css/mobile.css')+'\n</style>');
html=html.replace('<link rel="stylesheet" href="css/official.css">','<style>\n'+read('css/official.css')+'\n</style>');
html=html.replace('<script src="js/initial-data.js"></script>','<script>window.DIARIO_STANDALONE=true;</script>');
for(const script of scripts){if(script==='js/initial-data.js')continue;html=html.replace('<script src="'+script+'"></script>','<script>\n'+(script==='js/calculos.js'?initial:'')+read(script)+'\n</script>');}
write('dist/diario-escolar-offline.html',html);

const pwaFiles=['index.html','manifest.webmanifest','sw.js','css/app.css','css/mobile.css','css/official.css','assets/icon.svg',...scripts];
for(const file of pwaFiles){const target=path.join(root,'dist/pwa',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);}
console.log('Build concluído: dist/diario-escolar-offline.html e dist/pwa/');
