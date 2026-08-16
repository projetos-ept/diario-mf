const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function database(){
  const storage=new Map();
  const context={CMMSF_CONFIG_INICIAL:{escola:{nome:'Escola',anoLetivo:'2026'},turmaAtualId:'t1',turmas:[{id:'t1',nome:'Turma 1',alunos:[{id:'01',nome:'Aluno 1'}]}]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/banco.js','utf8'),context);
  return context.DiarioDB;
}

test('banco inicial possui três unidades e preserva alunos',()=>{
  const DB=database(),db=DB.fresh();
  assert.equal(db.units.length,3);
  assert.equal(db.classes[0].students[0].name,'Aluno 1');
  assert.deepEqual(Object.keys(db.official),[]);
});

test('importação cria turma nova sem alterar turma existente',()=>{
  const DB=database(),db=DB.fresh();
  DB.mergeImport(db,{turmas:[{id:'t2',nome:'Turma 2',disciplinas:[{id:'arte',nome:'Arte'}],alunos:[{id:'01',nome:'Novo Aluno'}]}]});
  assert.equal(db.classes.length,2);
  assert.equal(db.classes[0].id,'t1');
  assert.equal(db.classes[1].subjects[0].name,'Arte');
});

test('importação com mesmo id mescla estudantes',()=>{
  const DB=database(),db=DB.fresh();
  DB.mergeImport(db,{turmas:[{id:'t1',nome:'Turma 1',alunos:[{id:'02',nome:'Aluno 2'}]}]});
  assert.equal(db.classes[0].students.length,2);
});

test('mesclagem de disciplina preserva edição local mais recente (ativa/desativada e nome)',()=>{
  const DB=database(),db=DB.fresh();
  db.classes[0].subjects=[{id:'mat',name:'Matemática',active:false,updatedAt:'2026-01-02T00:00:00.000Z'}];
  DB.mergeImport(db,{turmas:[{id:'t1',nome:'Turma 1',disciplinas:[{id:'mat',nome:'Matemática Antiga',ativa:true}]}]});
  assert.equal(db.classes[0].subjects[0].active,false,'uma disciplina desativada localmente não pode voltar a ficar ativa por causa de uma cópia sem data');
  assert.equal(db.classes[0].subjects[0].name,'Matemática');
});

test('mesclagem de disciplina aplica alteração remota genuinamente mais recente',()=>{
  const DB=database(),db=DB.fresh();
  db.classes[0].subjects=[{id:'mat',name:'Matemática',active:true,updatedAt:'2026-01-01T00:00:00.000Z'}];
  DB.mergeImport(db,{turmas:[{id:'t1',nome:'Turma 1',disciplinas:[{id:'mat',nome:'Matemática',ativa:false,updatedAt:'2026-01-02T00:00:00.000Z'}]}]});
  assert.equal(db.classes[0].subjects[0].active,false);
});

test('exemplo de importação em Cadastros é um JSON válido para uma turma de 9º ano com 5 alunos',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const match=html.match(/<pre id="importExampleJson">([\s\S]*?)<\/pre>/);
  assert.ok(match,'bloco #importExampleJson não encontrado em index.html');
  const obj=JSON.parse(match[1]);
  const DB=database(),db=DB.fresh(),summary=DB.mergeImport(db,obj);
  assert.equal(summary.classes,1);
  assert.equal(summary.students,5);
  assert.equal(summary.subjects,1);
  const added=db.classes.filter(function(c){return c.id==='9-ano-exemplo';})[0];
  assert.ok(added,'turma 9-ano-exemplo não foi criada pelo exemplo');
  assert.equal(added.students.length,5);
});

test('exemplo de importação usa um id que não colide com nenhuma turma real dos dados iniciais',()=>{
  const initial=fs.readFileSync('js/initial-data.js','utf8'),config=JSON.parse(initial.slice(initial.indexOf('{'),initial.lastIndexOf('}')+1));
  const realIds=(config.turmas||[]).map(function(t){return t.id;});
  const html=fs.readFileSync('index.html','utf8'),match=html.match(/<pre id="importExampleJson">([\s\S]*?)<\/pre>/),obj=JSON.parse(match[1]);
  assert.ok(!realIds.includes(obj.turmas[0].id),'o id do exemplo de importação colide com uma turma real e apagaria/renomearia alunos de verdade ao ser importado sem edição');
});
