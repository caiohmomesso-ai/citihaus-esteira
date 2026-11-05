/* Citihaus · Meu Contrato — guarda da sessão da equipe.
   Se o login da equipe expirar com a tela aberta, o banco passa a recusar gravações
   ("row-level security"). Aqui a sessão é renovada sozinha e, se não der, pede para entrar de novo. */
(function(){
if(TOKEN) return;
const RLS = /row-level security|JWT expired|JWT|permission denied|42501|PGRST301/i;
let tratando = false;

async function sessaoOk(){
  try{
    let {data:{session}} = await sb.auth.getSession();
    if(session && session.expires_at*1000 - Date.now() < 120000){ const r = await sb.auth.refreshSession(); session = r.data && r.data.session; }
    return !!session;
  }catch(_){ return false; }
}
async function expirou(msgOrig){
  if(tratando || !S.me) return; tratando = true;
  if(await sessaoOk()){ tratando = false; toastOrig(msgOrig ? msgOrig : 'Conexão renovada. Tente de novo.'); return; }
  S.me = null; S.modal = null; S.open = null; S.chTeam = null;
  tratando = false;
  loginRender('Seu acesso expirou por segurança. Entre de novo com seu celular e senha — o que já estava salvo continua lá.');
}

const toastOrig = toast;
toast = function(t){
  if(S.me && RLS.test(String(t||''))) return expirou(String(t).replace(/row-level security.*/i,'sem permissão para gravar. Tente de novo.'));
  return toastOrig.apply(this, arguments);
};
const falhaOrig = falha;
falha = function(e){
  const m = e && (e.message||e.error_description||e.erro||e.code) || e;
  if(S.me && RLS.test(String(m)+' '+(e&&e.code||''))){ console.warn(e); return expirou('Erro: '+String(m).replace(/new row violates row-level security.*/i,'sem permissão para gravar. Tente de novo.')); }
  return falhaOrig.apply(this, arguments);
};

/* renova antes de expirar e percebe quando a sessão cai (aba parada, computador dormindo) */
try{ sb.auth.onAuthStateChange((ev)=>{ if(ev==='SIGNED_OUT' && S.me) expirou(); }); }catch(_){}
const checar = ()=>{ if(S.me && document.visibilityState==='visible') sessaoOk().then(ok=>{ if(!ok) expirou(); }); };
document.addEventListener('visibilitychange', checar);
setInterval(checar, 5*60000);
})();
