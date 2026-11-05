/* Citihaus · chamados dos imóveis captados — visão da equipe (dentro da captação) */
(function(){
if(TOKEN) return;
D.capch = D.capch || [];
const ST = {aberto:['p-warn','Aberto'], atendimento:['p-info','Em atendimento'], resolvido:['p-ok','Resolvido']};
const TIPO_IC = {'Correção de valor':'💰','Redução de valor':'📉','Correção de dados':'✏️','Dúvida':'❓'};
const hora = d => new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const abertos = cid => D.capch.filter(h=>h.captacao_id===cid && h.status!=='resolvido').length;

const carregarCh = carregar;
carregar = async function(){
  await carregarCh.apply(this, arguments);
  if(!S.me) return;
  try{ D.capch = await q(sb.from('cap_chamados').select('*').order('updated_at',{ascending:false})); }catch(_){ D.capch = D.capch||[]; }
};

function boxHtml(c){
  const hs = D.capch.filter(h=>h.captacao_id===c.id);
  return `<div class="sec box" id="cap-chamados"><h3>🎫 Chamados do proprietário <span class="muted" style="font-size:12px;font-weight:500">· pedidos feitos pelo Citihaus+ ou pelo link do imóvel</span></h3>
  ${hs.length?hs.map(h=>{ const s=ST[h.status]||ST.aberto;
    return `<div style="padding:10px 12px;border:1px solid ${h.status==='resolvido'?'var(--line)':'var(--warn)'};border-radius:10px;margin-bottom:8px">
      <div class="row between" style="gap:6px;flex-wrap:wrap"><b>${TIPO_IC[h.tipo]||'🎫'} ${esc(h.tipo)}${h.valor_sugerido?` · <span style="font-family:var(--f-display)">${brl(h.valor_sugerido)}</span>`:''}</b><span class="pill ${s[0]}">${s[1]}</span></div>
      <div class="mono muted" style="font-size:11px">${esc(h.protocolo)} · aberto em ${hora(h.created_at)}</div>
      <div style="display:grid;gap:6px;margin:8px 0">${(h.conversa||[]).map(m=>`<div style="max-width:88%;${m.autor==='equipe'?'margin-left:auto;background:var(--accent-soft)':'background:var(--bg)'};border-radius:10px;padding:7px 10px;font-size:13.5px">
        <div class="muted" style="font-size:11px">${esc(m.autor==='equipe'?(m.nome||'Citihaus'):(m.nome||'Proprietário'))} · ${hora(m.em)}</div><div style="white-space:pre-line">${esc(m.texto)}</div></div>`).join('')}</div>
      <form class="capch-resp" data-id="${h.id}" style="display:grid;gap:6px">
        <textarea name="t" rows="2" placeholder="Responder ao proprietário (ele vê no Citihaus+)" style="border:1px solid var(--line);border-radius:8px;padding:7px 9px;background:var(--bg);font:inherit"></textarea>
        <div class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">
          <select name="s" style="border:1px solid var(--line);border-radius:8px;padding:5px 8px;background:var(--bg)">${Object.entries(ST).map(([k,v])=>`<option value="${k}" ${h.status===k?'selected':''}>${v[1]}</option>`).join('')}</select>
          <button class="btn sm pri" type="submit">Enviar</button></div></form></div>`; }).join('')
    :'<p class="muted" style="margin:0">Nenhum chamado. O proprietário pode pedir correção de valor ou de dados, redução de valor ou tirar dúvidas pelo Citihaus+.</p>'}</div>`;
}

const renderCh = render;
render = function(){
  renderCh.apply(this, arguments);
  if(!S.me) return;
  if(S.tab==='captacoes') document.querySelectorAll('#app button.card[data-capopen]').forEach(b=>{
    const n = abertos(b.dataset.capopen); if(!n || b.querySelector('.capch-pill')) return;
    b.insertAdjacentHTML('beforeend', `<span class="pill p-warn capch-pill" style="margin-top:6px">🎫 ${n} chamado${n>1?'s':''}</span>`); });
  const dr = document.getElementById('cap-drawer'), c = S.capOpen && (D.captacoes||[]).find(k=>k.id===S.capOpen);
  if(dr && c && !document.getElementById('cap-chamados')){
    const ref = document.getElementById('cap-comercial') || [...dr.querySelectorAll('.d-body > .sec')].find(x=>(x.querySelector('h3')||{}).textContent==='Histórico');
    if(ref) ref.insertAdjacentHTML('beforebegin', boxHtml(c)); else { const b=dr.querySelector('.d-body'); if(b) b.insertAdjacentHTML('beforeend', boxHtml(c)); }
  }
};

document.addEventListener('submit', e=>{
  const f = e.target; if(!f.classList || !f.classList.contains('capch-resp')) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const t = f.querySelector('[name=t]').value.trim(), s = f.querySelector('[name=s]').value, h = D.capch.find(x=>x.id===f.dataset.id);
  if(!t && h && s===h.status) return toast('Escreva a resposta ou mude o status');
  return acao(async()=>{ await q(sb.rpc('equipe_cap_chamado_resp', {p_id:f.dataset.id, p_texto:t||null, p_status:s})); }, t?'Resposta enviada ao proprietário ✓':'Chamado atualizado ✓');
}, true);

if(S.me) carregar().then(render).catch(()=>{});
})();
