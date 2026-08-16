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

  model.cfg.overrides['u2|01|media']='6,5';
  const rebuilt=Official.buildModel(db,'t','mat');
  assert.equal(rebuilt.students[0].units.u2.media,'6,5');
  assert.equal(rebuilt.students[0].units.u2.mediaManual,true);
  assert.equal(JSON.stringify(db.records),academicBefore);
});
