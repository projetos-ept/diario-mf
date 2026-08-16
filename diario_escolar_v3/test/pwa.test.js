const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Official=require('../js/official.js');

test('service worker usa cache novo e contém todos os arquivos offline',()=>{
  const source=fs.readFileSync('sw.js','utf8');
  assert.match(source,/diario-cmmsf-v3-5/);
  assert.match(source,/request\.mode==='navigate'/);
  const files=[];
  source.replace(/'\.\/([^']*)'/g,(_,file)=>{files.push(file);return _;});
  for(const file of files){
    if(!file)continue;
    assert.equal(fs.existsSync(path.join(process.cwd(),file)),true,'arquivo ausente do precache: '+file);
  }
  for(const required of ['index.html','css/official.css','js/official.js','manifest.webmanifest']){
    assert.equal(files.includes(required),true,'arquivo não listado no precache: '+required);
  }
});

test('manifest mantém instalação e escopo relativo para GitHub Pages',()=>{
  const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
  assert.equal(manifest.start_url,'./index.html');
  assert.equal(manifest.scope,'./');
  assert.equal(manifest.display,'standalone');
});

test('exportador oficial é autônomo, salvável e não bloqueia dados incompletos',()=>{
  const source=fs.readFileSync('js/official.js','utf8');
  const exported=source.slice(source.indexOf('function exportGradeScriptEditable'),source.indexOf('function reset'));
  assert.match(exported,/Baixar HTML atualizado|saveOfficial/);
  assert.match(exported,/Imprimir \/ salvar PDF|printOfficial/);
  assert.match(exported,/document\.documentElement\.outerHTML/);
  assert.match(exported,/contenteditable/);
  assert.doesNotMatch(exported,/localStorage|DiarioDB|fetch\(/);
  assert.match(source,/showValidation\(\);\s*clone=/);
  assert.doesNotThrow(()=>new vm.Script(Official.exportStandaloneScript()));
});
