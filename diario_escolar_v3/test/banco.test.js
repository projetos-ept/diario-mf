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

test('configurações e escola recebem valores padrão em bancos antigos sem esses campos',()=>{
  const DB=database();
  const db=DB.normalize({schema:'br.edu.cmmsf.diario',version:3,classes:[],records:{attendance:[],qualitative:[],scored:[],deleted:[]}});
  assert.equal(db.settings.passingGrade,5);
  assert.equal(db.settings.qualitativeWeight,3);
  assert.equal(db.settings.official.qualitativeLabel,'Atividades de Fixação');
  assert.equal(db.units.length,3);
  assert.equal(db.context.unitId,'u1');
  assert.ok(db.school.nome);
  assert.equal(Object.keys(db.records.deletedAt).length,0);
});

test('plano novo usa os padrões de avaliação configurados na escola',()=>{
  const DB=database(),db=DB.fresh();
  db.settings.passingGrade=6;db.settings.qualitativeWeight=2;
  const p=DB.getPlan(db,{classId:'t1',subjectId:'mat',unitId:'u1'});
  assert.equal(p.passingGrade,6);
  assert.equal(p.qualitativeWeight,2);
  assert.ok(p.updatedAt);
});

test('cadastro de alunos gera o próximo número com zero à esquerda e mantém a ordem',()=>{
  const DB=database(),db=DB.fresh(),cls=db.classes[0];
  const s=DB.addStudent(db,cls,'Aluno Novo');
  assert.equal(s.id,'02');
  cls.students.push({id:'10',name:'Dez'});
  assert.equal(DB.nextStudentId(cls),'11');
  DB.removeStudent(db,cls,'02');
  assert.equal(cls.students.length,2);
  assert.equal(DB.hasTomb(db,'student|t1|02'),true);
  assert.ok(db.records.deletedAt['student|t1|02']);
  DB.mergeImport(db,{turmas:[{id:'t1',alunos:[{id:'02',nome:'Voltou pela nuvem'}]}]},{respectTombstones:true});
  assert.equal(cls.students.some(x=>x.id==='02'),false,'a sincronização não pode ressuscitar um aluno removido');
  DB.mergeImport(db,{turmas:[{id:'t1',alunos:[{id:'02',nome:'Voltou por importação manual'}]}]});
  assert.equal(cls.students.some(x=>x.id==='02'),true,'a importação manual é intenção explícita e restaura o aluno');
  assert.equal(DB.hasTomb(db,'student|t1|02'),false);
  assert.ok(db.records.restoredAt['student|t1|02']);
});

test('excluir turma apaga registros com lápides e um id igual não é reaproveitado por engano',()=>{
  const DB=database(),db=DB.fresh();
  db.records.attendance.push({id:'att|t1|mat|u1|2026-01-01',classId:'t1',subjectId:'mat',unitId:'u1',date:'2026-01-01',absent:[],createdAt:'2026-01-01T00:00:00.000Z'});
  db.plans.push({id:'t1|mat|u1',classId:'t1',subjectId:'mat',unitId:'u1'});
  db.official['t1|mat']={units:{}};
  assert.equal(DB.classRecordCount(db,'t1'),1);
  const removed=DB.removeClass(db,'t1');
  assert.equal(removed.records,1);
  assert.equal(db.classes.length,0);
  assert.equal(db.records.attendance.length,0);
  assert.equal(db.plans.length,0);
  assert.deepEqual(Object.keys(db.official),[]);
  assert.ok(db.records.deleted.includes('class|t1'));
  assert.ok(db.records.deleted.includes('att|t1|mat|u1|2026-01-01'));
  const again=DB.addClass(db,{name:'T1'});
  assert.notEqual(again.id,'t1','uma turma nova não pode herdar o id de uma turma excluída, senão a lápide a apagaria na sincronização');
});

test('salvar de novo um registro excluído (mesma data/título) remove a lápide',()=>{
  const DB=database(),db=DB.fresh(),rec={id:'qual|t1|mat|u1|2026-02-02|atividade-1',classId:'t1',subjectId:'mat',unitId:'u1',date:'2026-02-02',title:'Atividade 1',ratings:{'01':'+'},createdAt:'2026-02-02T00:00:00.000Z'};
  DB.saveRecord(db,'qualitative',rec);
  DB.deleteRecord(db,'qualitative',rec.id);
  assert.equal(db.records.qualitative.length,0);
  assert.ok(DB.hasTomb(db,rec.id));
  DB.saveRecord(db,'qualitative',Object.assign({},rec,{createdAt:'2026-02-03T00:00:00.000Z'}));
  assert.equal(db.records.qualitative.length,1);
  assert.equal(DB.hasTomb(db,rec.id),false);
});

test('turma editada mais recentemente vence na mesclagem',()=>{
  const DB=database(),db=DB.fresh();
  db.classes[0].name='Nome local novo';db.classes[0].updatedAt='2026-01-05T00:00:00.000Z';
  DB.mergeImport(db,{turmas:[{id:'t1',nome:'Nome remoto velho',updatedAt:'2026-01-01T00:00:00.000Z',alunos:[]}]});
  assert.equal(db.classes[0].name,'Nome local novo');
  DB.mergeImport(db,{turmas:[{id:'t1',nome:'Nome remoto novo',updatedAt:'2026-01-09T00:00:00.000Z',alunos:[]}]});
  assert.equal(db.classes[0].name,'Nome remoto novo');
});
