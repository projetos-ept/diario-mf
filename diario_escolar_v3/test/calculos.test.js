const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../js/calculos.js');

test('paralela maior substitui a nota original',()=>{
  assert.equal(C.considered(0.3,1.1,2),1.1);
});

test('paralela menor não reduz a nota original',()=>{
  assert.equal(C.considered(1.7,1.2,2),1.7);
});

test('nota fica limitada ao valor máximo',()=>{
  assert.equal(C.considered(1,3,2),2);
});

test('componente qualitativo converte 5 de 9 para 1,7 de 3',()=>{
  const activities=[{ratings:{'01':'+'}},{ratings:{'01':'+-'}},{ratings:{'01':'NF'}}];
  assert.equal(C.qualitativeResult(activities,'01',3).grade,1.7);
});

test('plano impede ultrapassar dez pontos',()=>{
  const plan={qualitativeWeight:3};
  const scored=[{id:'teste',max:2},{id:'prova',max:5}];
  assert.equal(C.allocation(plan,scored),10);
  assert.equal(C.canAllocate(plan,scored,1).ok,false);
});

test('resultado da unidade soma qualitativo e notas consideradas',()=>{
  const activities=[{ratings:{'01':'+'}},{ratings:{'01':'+-'}},{ratings:{'01':'NF'}}];
  const scored=[{id:'teste',title:'Teste',max:2,grades:{'01':{original:0.3,recovery:1.1}}},{id:'prova',title:'Prova',max:5,grades:{'01':{original:4,recovery:null}}}];
  const r=C.studentResult('01',activities,scored,{qualitativeWeight:3,passingGrade:5});
  assert.equal(r.total,6.8);
  assert.equal(r.status,'approved');
});
