(function(root){
  'use strict';
  var KEY='cmmsf_diario_v3';
  var LEGACY_KEY='cmmsf_chamada_atividades_v1';
  function clone(o){return JSON.parse(JSON.stringify(o));}
  function iso(){return new Date().toISOString();}
  function num(value,fallback){var n=Number(typeof value==='string'?value.replace(',','.'):value);return isFinite(n)?n:fallback;}
  function fill(target,defaults){var out=target&&typeof target==='object'?target:{},k;for(k in defaults)if(Object.prototype.hasOwnProperty.call(defaults,k)&&(out[k]===undefined||out[k]===null))out[k]=clone(defaults[k]);return out;}
  function slug(s){return String(s||'item').toLowerCase().normalize?String(s||'item').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''):String(s||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-');}
  function defaultUnits(count){var n=Math.max(1,Math.min(6,num(count,3))),out=[],i;for(i=1;i<=n;i++)out.push({id:'u'+i,name:i+'ª Unidade',order:i});return out;}
  function defaultOfficialTexts(){return {qualitativeLabel:'Atividades de Fixação',gradesCaption:'DIÁRIO DE CLASSE — REGISTRO DE NOTAS',frequencyCaption:'DIÁRIO DE CLASSE / LISTA DE FREQUÊNCIA',studentsPerPage:15};}
  function defaultSettings(){return {passingGrade:5,qualitativeWeight:3,maxUnit:10,decimalPlaces:1,official:defaultOfficialTexts()};}
  function fresh(){var cfg=clone(root.CMMSF_CONFIG_INICIAL||{}),classes=cfg.turmas||[];classes.forEach(function(c){c.name=c.nome||c.name;c.shift=c.turno||c.shift||'';c.teacher=c.professor||c.teacher||'';c.students=(c.alunos||c.students||[]).map(function(a){return {id:String(a.id),name:a.nome||a.name};});c.subjects=(c.disciplinas||[]).map(function(d){return {id:d.id||slug(d.nome||d.name),name:d.nome||d.name,active:d.ativa!==false};});delete c.alunos;delete c.disciplinas;});return normalize({schema:'br.edu.cmmsf.diario',version:3,school:cfg.escola||{nome:'Minha escola',anoLetivo:String(new Date().getFullYear())},settings:defaultSettings(),units:defaultUnits(3),classes:classes,context:{classId:cfg.turmaAtualId||classes[0]&&classes[0].id||'',subjectId:'',unitId:'u1'},plans:[],records:{attendance:[],qualitative:[],scored:[],deleted:[]},official:{},updatedAt:null});}
  function normalize(db){
    db=db&&typeof db==='object'?db:fresh();db.schema='br.edu.cmmsf.diario';db.version=3;
    db.units=Array.isArray(db.units)&&db.units.length?db.units.map(function(u,i){return {id:u.id||'u'+(i+1),name:u.name||((i+1)+'ª Unidade'),order:num(u.order,i+1)};}):defaultUnits(3);
    db.classes=Array.isArray(db.classes)?db.classes:[];db.context=db.context||{};db.plans=Array.isArray(db.plans)?db.plans:[];db.official=db.official&&typeof db.official==='object'?db.official:{};db.records=db.records||{};['attendance','qualitative','scored','deleted'].forEach(function(k){if(!Array.isArray(db.records[k]))db.records[k]=[];});['deletedAt','restoredAt'].forEach(function(k){if(!db.records[k]||typeof db.records[k]!=='object')db.records[k]={};});
    db.settings=fill(db.settings,defaultSettings());db.settings.official=fill(db.settings.official,defaultOfficialTexts());
    db.school=fill(db.school,{nome:'Minha escola',anoLetivo:String(new Date().getFullYear())});if(!db.school.nome&&db.school.name)db.school.nome=db.school.name;
    db.classes.forEach(function(c){c.name=c.name||c.nome||c.id;c.students=c.students||c.alunos||[];c.students=c.students.map(function(a){var s={id:String(a.id),name:a.name||a.nome};if(a.updatedAt)s.updatedAt=a.updatedAt;return s;});c.subjects=Array.isArray(c.subjects)?c.subjects:[];});
    if(!db.units.some(function(u){return u.id===db.context.unitId;}))db.context.unitId=db.units[0].id;
    return db;
  }
  function migrateLegacy(old){var db=fresh(),legacySubject={id:'nao-informada',name:'Não informada',active:true};db.classes.forEach(function(c){if(!c.subjects.length)c.subjects.push(clone(legacySubject));});db.context.subjectId='nao-informada';if(old&&old.registros){(old.registros.frequencias||[]).forEach(function(r){db.records.attendance.push({id:'att|'+r.turmaId+'|nao-informada|u1|'+r.data,classId:r.turmaId,subjectId:'nao-informada',unitId:'u1',date:r.data,absent:r.ausentes||[],createdAt:r.registradoEm||iso(),migrated:true});});(old.registros.atividades||[]).forEach(function(r){var ratings={};Object.keys(r.avaliacoes||{}).forEach(function(id){ratings[id]=r.avaliacoes[id].status;});db.records.qualitative.push({id:'qual|'+r.turmaId+'|nao-informada|u1|'+r.data+'|'+slug(r.titulo),classId:r.turmaId,subjectId:'nao-informada',unitId:'u1',date:r.data,title:r.titulo,ratings:ratings,createdAt:r.registradoEm||iso(),migrated:true});});}return db;}
  function load(){var raw=null,old=null;try{raw=localStorage.getItem(KEY);}catch(e){}if(raw){try{return normalize(JSON.parse(raw));}catch(e2){}}try{old=localStorage.getItem(LEGACY_KEY);}catch(e3){}if(old){try{return normalize(migrateLegacy(JSON.parse(old)));}catch(e4){}}return fresh();}
  function save(db){db.updatedAt=iso();localStorage.setItem(KEY,JSON.stringify(db));return db;}
  function findClass(db,id){return db.classes.filter(function(c){return c.id===id;})[0]||db.classes[0]||null;}
  function findSubject(cls,id){return cls&&(cls.subjects||[]).filter(function(s){return s.id===id;})[0]||null;}
  function planId(ctx){return [ctx.classId,ctx.subjectId,ctx.unitId].join('|');}
  function findPlan(db,ctx){var id=planId(ctx);return db.plans.filter(function(x){return x.id===id;})[0]||null;}
  function getPlan(db,ctx){var p=findPlan(db,ctx);if(!p){p={id:planId(ctx),classId:ctx.classId,subjectId:ctx.subjectId,unitId:ctx.unitId,qualitativeWeight:num(db.settings.qualitativeWeight,3),passingGrade:num(db.settings.passingGrade,5),closed:false,updatedAt:iso()};db.plans.push(p);}return p;}
  function inContext(item,ctx){return item.classId===ctx.classId&&item.subjectId===ctx.subjectId&&item.unitId===ctx.unitId;}
  function saveRecord(db,type,record){untomb(db,record.id);return upsert(db.records[type],record);}
  function deleteRecord(db,type,id){var before=db.records[type].length;db.records[type]=db.records[type].filter(function(x){return x.id!==id;});tombstone(db,id);return before-db.records[type].length;}
  function upsert(list,item){var i;for(i=0;i<list.length;i++)if(list[i].id===item.id){list[i]=item;return item;}list.push(item);return item;}
  function tombstone(db,key){if(db.records.deleted.indexOf(key)<0)db.records.deleted.push(key);db.records.deletedAt[key]=iso();delete db.records.restoredAt[key];}
  function untomb(db,key){if(db.records.deleted.indexOf(key)<0)return false;db.records.deleted=db.records.deleted.filter(function(x){return x!==key;});db.records.restoredAt[key]=iso();delete db.records.deletedAt[key];return true;}
  function hasTomb(db,key){return db.records.deleted.indexOf(key)>=0;}
  function sortStudents(cls){cls.students.sort(function(a,b){var x=parseInt(a.id,10),y=parseInt(b.id,10);if(isFinite(x)&&isFinite(y)&&x!==y)return x-y;return String(a.id).localeCompare(String(b.id));});}
  function nextStudentId(cls){var max=0,width=2;(cls.students||[]).forEach(function(s){var n=parseInt(s.id,10);if(isFinite(n)&&n>max)max=n;if(String(s.id).length>width)width=String(s.id).length;});var id=String(max+1);while(id.length<width)id='0'+id;return id;}
  function addStudent(db,cls,name){var s={id:nextStudentId(cls),name:String(name||'').trim(),updatedAt:iso()};untomb(db,'student|'+cls.id+'|'+s.id);cls.students.push(s);sortStudents(cls);return s;}
  function removeStudent(db,cls,studentId){var before=cls.students.length;cls.students=cls.students.filter(function(s){return s.id!==studentId;});if(cls.students.length!==before)tombstone(db,'student|'+cls.id+'|'+studentId);return before-cls.students.length;}
  function classRecordCount(db,classId){return ['attendance','qualitative','scored'].reduce(function(t,k){return t+db.records[k].filter(function(x){return x.classId===classId;}).length;},0);}
  function addClass(db,fields){var base=slug(fields.name),id=base,n=2;while(db.classes.some(function(c){return c.id===id;})||hasTomb(db,'class|'+id)){id=base+'-'+n;n++;}var cls={id:id,name:String(fields.name||'').trim(),shift:String(fields.shift||'').trim(),teacher:String(fields.teacher||'').trim(),students:[],subjects:[],updatedAt:iso()};db.classes.push(cls);return cls;}
  function removeClass(db,classId){var removed={records:0};db.classes=db.classes.filter(function(c){return c.id!==classId;});['attendance','qualitative','scored'].forEach(function(k){db.records[k]=db.records[k].filter(function(x){if(x.classId!==classId)return true;tombstone(db,x.id);removed.records++;return false;});});db.plans=db.plans.filter(function(p){return p.classId!==classId;});Object.keys(db.official).forEach(function(key){if(key.indexOf(classId+'|')===0)delete db.official[key];});tombstone(db,'class|'+classId);return removed;}
  function applyTombstones(db){db.records.deleted.forEach(function(key){var p=String(key).split('|');if(p[0]==='class')db.classes=db.classes.filter(function(c){return c.id!==p[1];});else if(p[0]==='student'){var cls=db.classes.filter(function(c){return c.id===p[1];})[0];if(cls)cls.students=cls.students.filter(function(s){return s.id!==p[2];});}});return db;}
  function mergeImport(db,input,opts){
    var items=input.turmas||input.classes||(input.id&&input.alunos?[input]:[]),summary={classes:0,students:0,subjects:0},respect=!!(opts&&opts.respectTombstones);
    if(!Array.isArray(items)||!items.length)throw new Error('JSON sem turmas reconhecidas.');
    items.forEach(function(src){
      var id=String(src.id||slug(src.nome||src.name)),cls=db.classes.filter(function(c){return c.id===id;})[0],incomingStamp=String(src.updatedAt||'');
      if(!cls&&respect&&hasTomb(db,'class|'+id))return;
      if(!cls){cls={id:id,name:src.nome||src.name||id,shift:src.turno||src.shift||'',teacher:src.professor||src.teacher||'',students:[],subjects:[]};if(incomingStamp)cls.updatedAt=incomingStamp;if(!respect)untomb(db,'class|'+id);db.classes.push(cls);summary.classes++;}
      else if(incomingStamp>=String(cls.updatedAt||'')){cls.name=src.nome||src.name||cls.name;cls.shift=src.turno||src.shift||cls.shift;cls.teacher=src.professor||src.teacher||cls.teacher;if(incomingStamp)cls.updatedAt=incomingStamp;}
      (src.alunos||src.students||[]).forEach(function(a){var aid=String(a.id),found=cls.students.filter(function(x){return x.id===aid;})[0],stamp=String(a.updatedAt||'');if(found){if(stamp>=String(found.updatedAt||'')){found.name=a.nome||a.name||found.name;if(stamp)found.updatedAt=stamp;}}else{if(respect&&hasTomb(db,'student|'+cls.id+'|'+aid))return;if(!respect)untomb(db,'student|'+cls.id+'|'+aid);var s={id:aid,name:a.nome||a.name||aid};if(stamp)s.updatedAt=stamp;cls.students.push(s);summary.students++;}});
      sortStudents(cls);
      (src.disciplinas||src.subjects||[]).forEach(function(s){var sid=String(s.id||slug(s.nome||s.name)),found=cls.subjects.filter(function(x){return x.id===sid;})[0],incomingActive=s.ativa!==false&&s.active!==false,incomingName=s.nome||s.name||sid,incomingUpdatedAt=String(s.updatedAt||'');if(found){if(incomingUpdatedAt>=String(found.updatedAt||'')){found.name=incomingName;found.active=incomingActive;if(incomingUpdatedAt)found.updatedAt=incomingUpdatedAt;}}else{cls.subjects.push({id:sid,name:incomingName,active:incomingActive,updatedAt:incomingUpdatedAt||undefined});summary.subjects++;}});
    });
    return summary;
  }
  root.DiarioDB={KEY:KEY,clone:clone,iso:iso,num:num,slug:slug,fresh:fresh,normalize:normalize,load:load,save:save,defaultUnits:defaultUnits,defaultSettings:defaultSettings,defaultOfficialTexts:defaultOfficialTexts,findClass:findClass,findSubject:findSubject,findPlan:findPlan,getPlan:getPlan,inContext:inContext,upsert:upsert,saveRecord:saveRecord,deleteRecord:deleteRecord,tombstone:tombstone,untomb:untomb,hasTomb:hasTomb,nextStudentId:nextStudentId,sortStudents:sortStudents,addStudent:addStudent,removeStudent:removeStudent,addClass:addClass,removeClass:removeClass,classRecordCount:classRecordCount,applyTombstones:applyTombstones,mergeImport:mergeImport};
}(this));
