const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function env(){
  const storage=new Map();
  const context={CMMSF_CONFIG_INICIAL:{escola:{nome:'Escola',anoLetivo:'2026'},turmaAtualId:'t1',turmas:[{id:'t1',nome:'Turma 1',alunos:[{id:'01',nome:'Aluno 1'}]}]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/banco.js','utf8'),context);
  vm.runInContext(fs.readFileSync('js/sync.js','utf8'),context);
  return {DB:context.DiarioDB,Sync:context.DiarioSync};
}

test('sincronização não deixa um plano remoto desatualizado apagar uma edição local mais recente',()=>{
  const {DB,Sync}=env();
  const local=DB.fresh();
  local.plans.push({id:'t1||u1',classId:'t1',subjectId:'',unitId:'u1',qualitativeWeight:2,passingGrade:5,closed:false,updatedAt:'2026-01-02T00:00:00.000Z'});
  const remote=DB.clone(local);
  remote.plans[0]=Object.assign({},remote.plans[0],{qualitativeWeight:3,updatedAt:'2026-01-01T00:00:00.000Z'});
  const merged=Sync.merge(local,remote);
  assert.equal(merged.plans[0].qualitativeWeight,2,'a edição local mais recente (peso qualitativo 2) não pode voltar para o valor remoto desatualizado (3)');
});

test('sincronização aplica um plano remoto quando ele é mais recente que o local',()=>{
  const {DB,Sync}=env();
  const local=DB.fresh();
  local.plans.push({id:'t1||u1',classId:'t1',subjectId:'',unitId:'u1',qualitativeWeight:3,passingGrade:5,closed:false,updatedAt:'2026-01-01T00:00:00.000Z'});
  const remote=DB.clone(local);
  remote.plans[0]=Object.assign({},remote.plans[0],{qualitativeWeight:2,updatedAt:'2026-01-02T00:00:00.000Z'});
  const merged=Sync.merge(local,remote);
  assert.equal(merged.plans[0].qualitativeWeight,2,'um plano remoto genuinamente mais recente deve prevalecer');
});
