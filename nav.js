/* Citihaus · navegação por área de trabalho: uma esteira por tela, sub-abas no topo */
(function(){
if(TOKEN) return;
const G = [
  {k:'inicio', n:'🏠 Início',      subs:[{t:'agenda'}]},
  {k:'dash',   n:'📊 Dashboard',   subs:[{t:'dashboard'}]},
  {k:'com',    n:'🤝 Comercial',   subs:[{t:'captacoes',n:'🏠 Captação'},{t:'contratos',sec:'comercial',n:'🤝 Negócios'},{t:'imoveis',n:'🏢 Imóveis'},{t:'lancamentos',n:'🏗️ Lançamentos'}]},
  {k:'loc',    n:'📄 Locação',     subs:[{t:'contratos',sec:'contratos',n:'📄 Contratos em andamento'},{t:'contratos',sec:'ativos',n:'🔑 Imóveis ativos'},{t:'contratos',sec:'desoc',n:'🚚 Desocupação'}]},
  {k:'at',     n:'🎫 Atendimento', subs:[{t:'contratos',sec:'chamados'}]},
  {k:'docs',   n:'📚 Documentos',  subs:[{t:'docs'}]},
  {k:'cad',    n:'👥 Cadastros',   subs:[{t:'pessoas',n:'👥 Pessoas'},{t:'mensagens',n:'✉️ Mensagens'},{t:'whatsapp',n:'💬 WhatsApp'},{t:'acessos',n:'⚙ Configuração'}]}];
const SEC = ['chamados','comercial','contratos','desoc','ativos'];
S.navLast = S.navLast || {};
const igual = (s) => s.t===S.tab && (s.t!=='contratos' || s.sec===S.sec);
const grupoAtual = () => G.find(g=>g.subs.some(igual)) || G[0];
let primeira = true;

window.irPara = function(t, sec){ S.tab=t; S.sec=sec||null; S.open=null; S.chTeam=null; S.capOpen=null; S.imvOpen=null; S.negOpen=null;
  try{ history.replaceState(null,'','#'+t+(sec?':'+sec:'')); }catch(_){ } render(); window.scrollTo(0,0); };

const renderNav = render;
render = function(){
  if(primeira && S.me){ const h=(location.hash||'').slice(1); if(h){ const [t,s]=h.split(':'); if(t) { S.tab=t; S.sec=s||null; } } }
  if(S.tab==='contratos' && !SEC.includes(S.sec)) S.sec='contratos';
  renderNav.apply(this, arguments);
  if(!S.me) return;
  if(primeira){ primeira=false; if(!(location.hash||'').slice(1) && S.tab!=='agenda'){ S.tab='agenda'; return render(); } }
  const nav=document.querySelector('#app nav.sub'); if(!nav) return;
  /* abas que a pessoa pode ver (as camadas anteriores já tiraram as bloqueadas) */
  const ok=new Set([...nav.querySelectorAll('[data-tab]')].map(b=>b.dataset.tab)); ok.add('agenda'); ok.add('docs'); ok.add('lancamentos');
  const badge = t => { const b=nav.querySelector(`[data-tab="${t}"] .tabn`); return b?Number(b.textContent)||0:0; };
  const nCh = D.chamados.filter(h=>h.status!=='resolvido' && !h.arquivado_em).length;
  const gBadge = {inicio:badge('agenda'), com:badge('captacoes'), at:nCh, cad:badge('whatsapp')};
  const grupos=G.map(g=>Object.assign({}, g, {subs:g.subs.filter(s=>ok.has(s.t))})).filter(g=>g.subs.length);
  const ga=grupoAtual();
  nav.innerHTML = grupos.map(g=>`<button data-navg="${g.k}" aria-pressed="${g.k===ga.k}">${g.n}${gBadge[g.k]?`<span class="tabn">${gBadge[g.k]}</span>`:''}</button>`).join('');
  const w=nav.parentElement; let sub=w.querySelector('.subnav'); if(sub) sub.remove();
  const gv=grupos.find(g=>g.k===ga.k);
  if(gv && gv.subs.length>1) nav.insertAdjacentHTML('afterend', `<div class="subnav seg-b" style="margin:4px 0 14px;flex-wrap:wrap">${gv.subs.map(s=>`<button data-navs="${gv.k}|${s.t}|${s.sec||''}" aria-pressed="${igual(s)}">${s.n}</button>`).join('')}</div>`);
  /* aba Contratos: mostra só a esteira escolhida */
  if(S.tab==='contratos'){
    SEC.forEach(k=>{ const el=document.getElementById('sec-'+k); if(el){ el.style.display = k===S.sec ? '' : 'none'; el.style.borderTop='0'; } });
    w.querySelectorAll('[data-dscroll]').forEach(b=>b.remove());
    const acoes=[...w.children].find(x=>x.querySelector && x.querySelector('[data-dativo]') && !x.id); if(acoes) acoes.style.display = (S.sec==='contratos'||S.sec==='ativos') ? '' : 'none';
  }
};

document.addEventListener('click', e=>{
  if(!S.me) return; const b=e.target.closest('button,a'); if(!b) return; const d=b.dataset;
  if(d.navg){ e.stopImmediatePropagation(); const g=G.find(x=>x.k===d.navg); const s=S.navLast[g.k] || g.subs[0]; return irPara(s.t, s.sec); }
  if(d.navs){ e.stopImmediatePropagation(); const [gk,t,sec]=d.navs.split('|'); S.navLast[gk]={t, sec:sec||null}; return irPara(t, sec||null); }
  if(d.navgo){ e.stopImmediatePropagation(); const [t,s]=d.navgo.split('|'); return irPara(t, s||null); }
  if(d.tab && d.sec){ e.stopImmediatePropagation(); return irPara(d.tab, d.sec); }
}, true);
})();
