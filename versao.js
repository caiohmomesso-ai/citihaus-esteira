/* Citihaus · avisa quando sai versão nova do site e atualiza sem precisar limpar o cache */
(function(){
const sig = html => (html.match(/<script src="[^"]+"/g)||[]).join('|');
const atual = sig(document.documentElement.outerHTML);
let mostrou = false;
async function checar(){
  if(mostrou || document.visibilityState!=='visible') return;
  try{
    const r = await fetch('index.html?_=' + Date.now(), {cache:'no-store'}); if(!r.ok) return;
    const nova = sig(await r.text()); if(!nova || nova===atual) return;
    mostrou = true;
    const b = document.createElement('div');
    b.setAttribute('role','status');
    b.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;background:#E85D24;color:#fff;border-radius:999px;padding:10px 12px 10px 18px;display:flex;gap:12px;align-items:center;box-shadow:0 8px 28px rgba(0,0,0,.22);font:600 14px/1.2 system-ui,sans-serif;max-width:calc(100vw - 32px)';
    b.innerHTML = '<span>🔄 Saiu uma versão nova do sistema</span><button type="button" style="background:#fff;color:#B8410F;border:0;border-radius:999px;padding:8px 14px;font:700 13px system-ui,sans-serif;cursor:pointer">Atualizar agora</button>';
    b.querySelector('button').onclick = () => { const u = new URL(location.href); u.searchParams.set('_v', Date.now().toString(36)); location.replace(u.toString()); };
    document.body.appendChild(b);
  }catch(_){ }
}
setTimeout(checar, 4000);
setInterval(checar, 2*60000);
document.addEventListener('visibilitychange', checar);
})();
