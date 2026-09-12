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

test('sincronização mescla escola, padrões e unidades pelo carimbo mais recente',()=>{
  const {DB,Sync}=env();
  const local=DB.fresh();
  local.school={nome:'Escola Local',anoLetivo:'2026',updatedAt:'2026-01-05T00:00:00.000Z'};
  local.settings.passingGrade=6;local.settings.updatedAt='2026-01-01T00:00:00.000Z';
  local.units=DB.defaultUnits(4);local.unitsUpdatedAt='2026-01-02T00:00:00.000Z';
  const remote=DB.clone(local);
  remote.school={nome:'Escola Remota Velha',anoLetivo:'2025',updatedAt:'2026-01-01T00:00:00.000Z'};
  remote.settings=Object.assign({},remote.settings,{passingGrade:7,updatedAt:'2026-01-09T00:00:00.000Z'});
  remote.units=DB.defaultUnits(2);remote.unitsUpdatedAt='2026-01-01T00:00:00.000Z';
  const merged=Sync.merge(local,remote);
  assert.equal(merged.school.nome,'Escola Local');
  assert.equal(merged.settings.passingGrade,7);
  assert.equal(merged.settings.official.qualitativeLabel,'Atividades de Fixação','padrões ausentes na cópia remota precisam ser preenchidos');
  assert.equal(merged.units.length,4);
});

test('sincronização respeita turma excluída localmente e registro restaurado depois da exclusão remota',()=>{
  const {DB,Sync}=env();
  const local=DB.fresh();
  const remote=DB.clone(local);
  remote.classes.push({id:'t2',name:'Turma 2',students:[],subjects:[]});
  DB.removeClass(local,'t2');
  let merged=Sync.merge(local,remote);
  assert.equal(merged.classes.some(c=>c.id==='t2'),false,'turma excluída neste aparelho não pode voltar da nuvem');
  const rec={id:'att|t1|mat|u1|2026-03-01',classId:'t1',subjectId:'mat',unitId:'u1',date:'2026-03-01',absent:[],createdAt:'2026-03-02T00:00:00.000Z'};
  const remote2=DB.clone(local);
  remote2.records.deleted.push(rec.id);remote2.records.deletedAt[rec.id]='2026-03-01T10:00:00.000Z';
  DB.saveRecord(local,'attendance',rec);
  local.records.restoredAt[rec.id]='2026-03-01T12:00:00.000Z';
  merged=Sync.merge(local,remote2);
  assert.equal(merged.records.attendance.length,1,'um registro salvo de novo depois da exclusão remota deve permanecer');
  remote2.records.deletedAt[rec.id]='2026-03-01T14:00:00.000Z';
  merged=Sync.merge(local,remote2);
  assert.equal(merged.records.attendance.length,0,'uma exclusão remota posterior à restauração deve prevalecer');
});
