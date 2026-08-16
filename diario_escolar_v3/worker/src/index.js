const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers':'Authorization, Content-Type',
  'Access-Control-Max-Age':'86400'
};
function response(body,status,extra){return new Response(body,{status:status||200,headers:Object.assign({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},cors,extra||{})});}
function authorized(request,env){var value=request.headers.get('Authorization')||'';return env.TABLET_TOKEN&&value==='Bearer '+env.TABLET_TOKEN;}
export default{
  async fetch(request,env){
    var url=new URL(request.url);
    if(request.method==='OPTIONS')return response('',204);
    if(url.pathname!=='/diario')return response(JSON.stringify({ok:false,error:'Rota não encontrada'}),404);
    if(!authorized(request,env))return response(JSON.stringify({ok:false,error:'Não autorizado'}),401);
    if(request.method==='GET'){
      var stored=await env.DIARIO_DADOS.get('diario:v3');
      return response(stored||'{}',200);
    }
    if(request.method==='PUT'){
      var text=await request.text();
      if(!text||text.length>1000000)return response(JSON.stringify({ok:false,error:'JSON vazio ou maior que 1 MB'}),413);
      var data;try{data=JSON.parse(text);}catch(e){return response(JSON.stringify({ok:false,error:'JSON inválido'}),400);}
      if(data.version!==3||!data.records||!Array.isArray(data.classes))return response(JSON.stringify({ok:false,error:'Banco versão 3 inválido'}),400);
      var old=await env.DIARIO_DADOS.get('diario:v3');
      if(old)await env.DIARIO_DADOS.put('backup:v3:'+Date.now(),old,{expirationTtl:7776000});
      await env.DIARIO_DADOS.put('diario:v3',JSON.stringify(data));
      return response(JSON.stringify({ok:true,updatedAt:new Date().toISOString()}),200);
    }
    return response(JSON.stringify({ok:false,error:'Método não permitido'}),405,{'Allow':'GET, PUT, OPTIONS'});
  }
};
