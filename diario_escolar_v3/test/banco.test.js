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
