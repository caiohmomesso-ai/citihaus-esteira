/* Citihaus · Meu Contrato — portal do cliente: status do imóvel/contrato e resumo recolhível */
(function(){
if(!TOKEN) return;
const DE = ['Aviso de saída','Vistoria de saída','Reparos e acerto','Entrega das chaves'];
let resumoAberto = false;

function status(d){
  const c=d.contrato||{}, sit=c.situacao||{}, ds=sit.desocupacao;
  if(ds && ds.etapa>=4) return {i:3, ic:'🏁', cor:'var(--muted)', bg:'var(--surface-2)', tit:'Imóvel desocupado', det:'Contrato encerrado'+(ds.encerrado_em?' em '+dataBR(ds.encerrado_em):'')+'. Obrigado pela parceria!'};
  if(ds) return {i:2, ic:'🚚', cor:'var(--warn)', bg:'var(--warn-soft)', tit:'Em desocupação', det:'Etapa: '+DE[ds.etapa]+(ds.saida_prevista?' · saída prevista '+dataBR(ds.saida_prevista):'')+(ds.etapa===1&&ds.vistoria?' · vistoria '+dataBR(ds.vistoria):'')};
  if(c.etapa===6) return {i:1, ic:'✅', cor:'var(--ok)', bg:'var(--ok-soft)', tit:'Contrato ativo', det:(c.entrada?'Em vigor desde '+dataBR(c.entrada)+'. ':'')+'Precisa de algo? Abra um chamado aqui embaixo.'};
  const ce=CLIENTE_ETAPAS[c.etapa]||['Em andamento',''];
  return {i:0, ic:'📝', cor:'var(--info)', bg:'var(--info-soft)', tit:'Em contrato', det:'Etapa '+(c.etapa+1)+' de 6 · '+ce[0]+(ce[1]?' — '+ce[1]:'')};
}
function statusHtml(d){
  const s=status(d), passos=['Em contrato','Contrato ativo','Em desocupação','Desocupado'];
  return `<div class="box status-imv" style="background:${s.bg};border-color:transparent">
    <div style="display:flex;gap:12px;align-items:center"><div style="font-size:30px;line-height:1">${s.ic}</div>
      <div style="min-width:0"><div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${s.cor}">Status do imóvel</div>
      <div style="font-family:var(--f-display);font-size:19px;font-weight:700">${esc(s.tit)}</div>
      <div class="muted" style="font-size:13px">${esc(s.det)}</div></div></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px">${passos.map((p,i)=>`<div><div style="height:6px;border-radius:99px;background:${i<s.i?'var(--ok)':i===s.i?s.cor:'var(--line)'}"></div><div style="font-size:11px;margin-top:4px;color:${i===s.i?'var(--fg)':'var(--muted)'};font-weight:${i===s.i?700:500}">${p}</div></div>`).join('')}</div>
  </div>`;
}
function ajustar(){
  const portal=document.querySelector('.portal'); if(!portal || !PS.d) return;
  if(!portal.querySelector('.status-imv')){
    const hello=portal.querySelector('.hello');
    if(hello) hello.insertAdjacentHTML('afterend', statusHtml(PS.d)); else portal.insertAdjacentHTML('afterbegin', statusHtml(PS.d));
  }
  const r=portal.querySelector('.resumo');
  if(r && !r.dataset.rec){
    r.dataset.rec='1';
    const head=r.firstElementChild, corpo=head && head.nextElementSibling;
    if(head && corpo){
      head.style.cursor='pointer'; head.style.marginBottom='0'; head.setAttribute('role','button'); head.setAttribute('tabindex','0'); head.setAttribute('aria-expanded', resumoAberto);
      head.insertAdjacentHTML('beforeend', `<span class="seta" style="margin-left:8px;font-size:13px;color:var(--muted);font-weight:600">${resumoAberto?'Fechar ▴':'Ver ▾'}</span>`);
      corpo.style.marginTop='12px'; corpo.hidden=!resumoAberto;
      const tg=()=>{ resumoAberto=!resumoAberto; corpo.hidden=!resumoAberto; head.setAttribute('aria-expanded', resumoAberto); head.querySelector('.seta').textContent=resumoAberto?'Fechar ▴':'Ver ▾'; };
      head.addEventListener('click', tg); head.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); tg(); } });
    }
  }
}
const portalRenderOrig = portalRender;
portalRender = function(){ portalRenderOrig(); try{ ajustar(); }catch(e){ console.warn(e); } };
let ag=false;
new MutationObserver(()=>{ if(ag) return; ag=true; requestAnimationFrame(()=>{ ag=false; try{ ajustar(); }catch(_){} }); })
  .observe(document.getElementById('app'), {childList:true, subtree:true});
if(PS.d) portalRender();
})();
