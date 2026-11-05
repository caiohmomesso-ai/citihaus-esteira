/* Citihaus · Meu Contrato — excluir contrato, contato ou imóvel (só administrador, com confirmação) */
(function(){
if(TOKEN) return;
const adm = () => S.me && S.me.papel === 'admin';
let conf = null; /* chave do item aguardando o 2º clique */
const btnDel = (k, txt, extra='') => `<button type="button" class="btn sm ghost" style="color:var(--bad)" data-excluir="${k}" ${extra}>${conf===k?'Confirmar: excluir de vez':txt}</button>`;

const drawerExOrig = drawer;
drawer = function(c){
  const h = drawerExOrig(c); if(!adm()) return h;
  const box = `<div class="sec" style="border-top:1px dashed var(--bad);padding-top:12px"><div class="row between" style="gap:8px;flex-wrap:wrap">
    <span class="muted" style="font-size:12.5px">Excluir apaga o contrato, as partes, os chamados e o histórico dele. As pessoas continuam no cadastro.</span>
    ${btnDel('ct|'+c.id, '🗑 Excluir contrato')}</div></div>`;
  const i = h.lastIndexOf('</div></aside>');
  return i > 0 ? h.slice(0, i) + box + h.slice(i) : h;
};
const modalExOrig = modalHtml;
modalHtml = function(){
  const h = modalExOrig(), m = S.modal; if(!adm() || !m || !m.id) return h;
  if(m.tipo === 'pessoa' || h.includes('id="i-st"')){
    const k = (m.tipo === 'pessoa' ? 'pe|' : 'im|') + m.id;
    return h.replace('<div class="m-f">', `<div class="m-f">${btnDel(k, m.tipo==='pessoa'?'🗑 Excluir contato':'🗑 Excluir imóvel')}<span style="flex:1"></span>`);
  }
  return h;
};
const renderExOrig = render;
render = function(){
  renderExOrig();
  if(!adm() || S.tab !== 'pessoas') return;
  document.querySelectorAll('#app td [data-editp]').forEach(b=>{ if(b.nextElementSibling && b.nextElementSibling.dataset.excluir) return; b.insertAdjacentHTML('afterend', btnDel('pe|'+b.dataset.editp, 'Excluir')); });
};

async function excluir(k){
  const [tipo, id] = k.split('|');
  const rpc = {ct:'admin_excluir_contrato', pe:'admin_excluir_pessoa', im:'admin_excluir_imovel'}[tipo];
  try{
    const r = await q(sb.rpc(rpc, {p_id:id}));
    const arqs = (r && r.arquivos) || [];
    if(arqs.length){ try{ await sb.storage.from('documentos').remove(arqs); }catch(_){} }
    conf = null; S.modal = null; if(tipo==='ct') S.open = null;
    await carregar(); render();
    toast(tipo==='ct' ? `Contrato ${r.numero} excluído` : tipo==='pe' ? `Contato ${r.nome||''} excluído` : `Imóvel ${r.titulo||''} excluído`);
  }catch(err){ conf = null; render(); falha(err); }
}
document.addEventListener('click', e=>{
  const b = e.target.closest('button[data-excluir]'); if(!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const k = b.dataset.excluir;
  if(conf !== k){ conf = k; b.textContent = 'Confirmar: excluir de vez'; clearTimeout(excluir.t); excluir.t = setTimeout(()=>{ if(conf===k){ conf=null; if(document.body.contains(b)) b.textContent = b.closest('td') ? 'Excluir' : '🗑 Excluir'; } }, 6000); return; }
  b.disabled = true; b.textContent = 'Excluindo…'; excluir(k);
}, true);
})();
