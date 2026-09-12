const test=require('node:test');
const assert=require('node:assert/strict');
const Official=require('../js/official.js');

test('mapeia até três componentes e agrupa os excedentes na terceira coluna',()=>{
  const components=[
    {id:'q',label:'Qualitativas',max:2,date:'2026-01-01'},
    {id:'a',label:'Atividade',max:2,date:'2026-01-02'},
    {id:'t',label:'Teste',max:2,date:'2026-01-03'},
    {id:'p',label:'Prova',max:4,date:'2026-01-04'}
  ];
  const slots=Official.autoSlots(components);
  assert.equal(slots.length,3);
  assert.deepEqual(slots[2].componentIds,['t','p']);
  assert.equal(slots[2].max,6);
});

test('valida que cada unidade distribui exatamente dez pontos',()=>{
  const units={u1:{slots:[{max:2},{max:3},{max:5}]},u2:{slots:[{max:3},{max:2},{max:5}]},u3:{slots:[{max:1},{max:4},{max:5}]}};
  assert.deepEqual(Official.validateWeights(units),[]);
  units.u2.slots[0].max=2;
  assert.match(Official.validateWeights(units)[0],/2ª unidade/);
});

test('modelo oficial usa a recuperação maior em M sem criar coluna paralela',()=>{
  const db={
    school:{nome:'Escola',anoLetivo:'2026'},official:{},
    classes:[{id:'t',name:'6º A',shift:'Matutino',teacher:'Professor',subjects:[{id:'mat',name:'Matemática'}],students:[{id:'01',name:'Ana'}]}],
    plans:[{classId:'t',subjectId:'mat',unitId:'u1',qualitativeWeight:2,passingGrade:5}],
    records:{
      qualitative:[
        {classId:'t',subjectId:'mat',unitId:'u1',date:'2026-01-01',ratings:{'01':'+'}},
        {classId:'t',subjectId:'mat',unitId:'u1',date:'2026-01-02',ratings:{'01':'+-'}},
        {classId:'t',subjectId:'mat',unitId:'u1',date:'2026-01-03',ratings:{'01':'NF'}}
      ],
      scored:[
        {id:'teste',classId:'t',subjectId:'mat',unitId:'u1',title:'Teste',date:'2026-01-04',max:3,grades:{'01':{original:1.5,recovery:2}}},
        {id:'prova',classId:'t',subjectId:'mat',unitId:'u1',title:'Prova',date:'2026-01-05',max:5,grades:{'01':{original:4,recovery:null}}}
      ],attendance:[]
    }
  };
  const academicBefore=JSON.stringify(db.records);
  const model=Official.buildModel(db,'t','mat');
  assert.deepEqual(model.students[0].units.u1.slots,[1.1,1.5,4]);
  assert.equal(model.students[0].units.u1.media,7.1);
  assert.deepEqual(model.cfg.units.u1.slots.map(x=>x.max),[2,3,5]);
  assert.equal(model.cfg.units.u1.slots[0].label,'Atividades de Fixação');
  assert.equal(model.cfg.units.u1.slots[0].date,'De 01/01 a 03/01');
  assert.equal(model.cfg.units.u1.slots[1].date,'04/01');
  const html=Official.renderHtml(model,'complete');
  assert.match(html,/official-grade-sheet/);
  assert.match(html,/official-frequency-sheet/);
  assert.match(html,/TP = TOTAL PONTOS/);
  assert.match(html,/official-media-entry/);
  assert.doesNotMatch(html,/RECUPERAÇÃO PARALELA|official-recovery-entry/);

  const thead=html.match(/<thead>[\s\S]*?<\/thead>/)[0];
  assert.equal((thead.match(/<tr>/g)||[]).length,5,'as três linhas de categoria (1ª/2ª/3ª) precisam de <tr> próprio, senão os rótulos se sobrepõem em navegadores móveis');

  model.cfg.overrides['u2|01|media']='6,5';
  const rebuilt=Official.buildModel(db,'t','mat');
  assert.equal(rebuilt.students[0].units.u2.media,'6,5');
  assert.equal(rebuilt.students[0].units.u2.mediaManual,true);
  assert.equal(JSON.stringify(db.records),academicBefore);
});

function fourUnitDb(){
  return {
    school:{nome:'Escola',anoLetivo:'2026'},official:{},
    units:[{id:'u1',name:'1º Bimestre'},{id:'u2',name:'2º Bimestre'},{id:'u3',name:'3º Bimestre'},{id:'u4',name:'4º Bimestre'}],
    settings:{passingGrade:6,qualitativeWeight:4,official:{qualitativeLabel:'Participação',gradesCaption:'MAPA DE NOTAS',frequencyCaption:'FREQUÊNCIA MENSAL',studentsPerPage:2}},
    classes:[{id:'t',name:'6º A',shift:'Matutino',teacher:'Professor',subjects:[{id:'mat',name:'Matemática'}],students:[{id:'01',name:'Ana'},{id:'02',name:'Bia'},{id:'03',name:'Caio'}]}],
    plans:[],
    records:{qualitative:[{classId:'t',subjectId:'mat',unitId:'u4',date:'2026-10-01',ratings:{'01':'+'}}],scored:[],attendance:[{classId:'t',subjectId:'mat',unitId:'u1',date:'2026-02-03',absent:['02']},{classId:'t',subjectId:'mat',unitId:'u1',date:'2026-02-10',absent:[]}]}
  };
}

test('diário oficial com três unidades mantém a estrutura legada de colunas',()=>{
  const db={school:{nome:'Escola',anoLetivo:'2026'},official:{},classes:[{id:'t',name:'6º A',subjects:[{id:'mat',name:'Matemática'}],students:[{id:'01',name:'Ana'}]}],plans:[],records:{qualitative:[],scored:[],attendance:[]}};
  const html=Official.renderHtml(Official.buildModel(db,'t','mat'),'grades');
  assert.match(html,/<colgroup><col style="width:2\.6%"><col style="width:20%">(<col style="width:4\.4%"><col style="width:5\.6%"><col style="width:5\.6%"><col style="width:4\.7%">){3}<col style="width:5\.5%"><col style="width:5\.5%"><col style="width:5\.5%"><\/colgroup>/);
  assert.match(html,/1ª UNIDADE/);
  assert.match(html,/3ª UNIDADE/);
  assert.doesNotMatch(html,/4ª UNIDADE/);
});

test('diário oficial acompanha a quantidade e os nomes de unidades e os textos configurados',()=>{
  const db=fourUnitDb();
  const model=Official.buildModel(db,'t','mat');
  assert.deepEqual(model.unitIds,['u1','u2','u3','u4']);
  assert.equal(model.cfg.units.u4.slots[0].label,'Participação');
  assert.equal(model.cfg.units.u4.slots[0].max,4,'o peso qualitativo padrão vem das configurações da escola quando a unidade não tem plano');
  const html=Official.renderHtml(model,'complete');
  assert.match(html,/4º BIMESTRE/);
  assert.match(html,/MAPA DE NOTAS/);
  assert.match(html,/FREQUÊNCIA MENSAL/);
  assert.match(html,/De 03\/02\/2026 a 10\/02\/2026/);
  assert.equal((html.match(/official-grade-sheet/g)||[]).length,2,'2 alunos por página => 3 alunos ocupam 2 folhas');
  const thead=html.match(/<thead>[\s\S]*?<\/thead>/)[0],rows=thead.match(/<tr>[\s\S]*?<\/tr>/g);
  assert.equal(rows.length,5);
  assert.equal((rows[0].match(/<th/g)||[]).length,7);
  assert.equal((rows[1].match(/<th/g)||[]).length,13);
  assert.equal((rows[4].match(/<th/g)||[]).length,19);
  const colgroup=html.match(/<table class="official-gradebook"><colgroup>([\s\S]*?)<\/colgroup>/)[1];
  assert.equal((colgroup.match(/<col /g)||[]).length,2+4*4+3,'2 colunas fixas + 4 por unidade + 3 de resultado final');
  const total=(colgroup.match(/width:([\d.]+)%/g)||[]).reduce((t,x)=>t+Number(x.replace('width:','').replace('%','')),0);
  assert.ok(Math.abs(total-100)<0.5,'larguras somam ~100%: '+total);
  assert.deepEqual(Official.validateWeights({u1:{slots:[{max:10}]},u2:{slots:[{max:5}]}}),['2ª unidade: os pesos somam 5,0; devem somar 10,0.']);
  const script=Official.exportStandaloneScript();
  assert.doesNotMatch(script,/\['u1','u2','u3'\]/,'o exportador autônomo precisa descobrir as unidades pelo próprio HTML');
});
