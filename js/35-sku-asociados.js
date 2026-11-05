/* ============================================================
   35 · SKU ASOCIADOS (códigos de otros proveedores)
   ------------------------------------------------------------
   Un mismo producto puede venir con distinto código según el
   proveedor. Acá se guardan esos códigos extra en
   producto.skusAsoc = [{ sku, prov, fecha }].

   - findProdBySku / skuEnUso / skuHay (en 01-core) ya los tienen
     en cuenta: importar una factura reconoce el código asociado y
     suma el stock al producto correcto, sin duplicarlo.
   - Ficha del producto (modal): sección para ver, agregar y quitar
     códigos asociados.
   - Importar factura: si una línea trae un código desconocido, se
     puede elegir a qué producto existente corresponde (con
     sugerencias por nombre). Al continuar, ese código queda
     asociado para las próximas facturas.
   Módulo idéntico en las dos versiones.
   ============================================================ */
(function(){
  const EN = {
    "sa.h":"Supplier codes",
    "sa.hint":"Codes other suppliers use for this same product. When you import an invoice, the app recognises them and adds the stock here instead of creating a duplicate.",
    "sa.th.code":"Code", "sa.th.prov":"Supplier",
    "sa.ph.code":"Supplier code", "sa.ph.prov":"Supplier (optional)",
    "sa.add":"Add", "sa.remove":"Remove", "sa.empty":"No associated codes yet.",
    "sa.err.empty":"Enter a code", "sa.err.main":"That is already this product's own SKU",
    "sa.err.rep":"That code is already in the list",
    "sa.err.used":"Code {sku} is already used by “{name}”",
    "sa.imp.unknown":"Unknown code — is it a product you already have?",
    "sa.imp.new":"— Create a new product —",
    "sa.imp.sug":"Suggested", "sa.imp.all":"All products",
    "sa.imp.via":"Matched by associated code",
    "sa.imp.willlink":"Code {sku} will be linked to this product",
    "sa.tt.linked":"{n} supplier code(s) linked: next time they are recognised automatically"
  };
  const ES = {
    "sa.h":"Códigos de proveedores",
    "sa.hint":"Códigos que usan otros proveedores para este mismo producto. Al importar una factura, la app los reconoce y suma el stock acá en vez de crear un producto duplicado.",
    "sa.th.code":"Código", "sa.th.prov":"Proveedor",
    "sa.ph.code":"Código del proveedor", "sa.ph.prov":"Proveedor (opcional)",
    "sa.add":"Agregar", "sa.remove":"Quitar", "sa.empty":"Todavía no hay códigos asociados.",
    "sa.err.empty":"Escribí un código", "sa.err.main":"Ese ya es el SKU propio de este producto",
    "sa.err.rep":"Ese código ya está en la lista",
    "sa.err.used":"El código {sku} ya lo usa “{name}”",
    "sa.imp.unknown":"Código desconocido — ¿es un producto que ya tenés?",
    "sa.imp.new":"— Crear producto nuevo —",
    "sa.imp.sug":"Sugeridos", "sa.imp.all":"Todos los productos",
    "sa.imp.via":"Reconocido por código asociado",
    "sa.imp.willlink":"El código {sku} se va a asociar a este producto",
    "sa.tt.linked":"{n} código(s) de proveedor asociados: la próxima vez se reconocen solos"
  };
  try{ Object.assign(I18N.en, EN); Object.assign(I18N.es, ES); }catch(e){ console.warn("sku-asociados i18n", e); }
})();

function _saHoy(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

/* ---------- Similitud por nombre (para sugerir el producto) ---------- */
const _SA_STOP = new Set(["the","de","del","la","el","los","las","y","and","of","tcg","card","game","box","booster","display","pack","packs","ct","set","x","en","con","with"]);
function _saTokens(s){
  return String(s||"").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/[^a-z0-9]+/g," ").split(" ")
    .filter(w=> w && (w.length>1 || /\d/.test(w)) && !_SA_STOP.has(w));
}
/* v103/v147 · Se asocia SOLO (sin preguntar) únicamente si es claramente el mismo producto:
   los mismos números/códigos (set, cantidad: OP-09, 10ct, 30th…) y las mismas palabras.
   Antes alcanzaba con un parecido alto y, con nombres largos de un mismo proveedor
   ("Pokémon TCG: 30th Celebration Mini Tin Display 10ct." vs "… Elite Trainer Box … 10ct."),
   asociaba el código al producto equivocado. Si no es seguro, queda como sugerencia para elegir. */
function _saAutoSeguro(desc, p){
  const a=_saTokens(desc), b=_saTokens(p && p.nombre);
  const num = arr => new Set(arr.filter(w=>/\d/.test(w)));
  const pal = arr => new Set(arr.filter(w=>!/\d/.test(w)));
  const nA=num(a), nB=num(b), wA=pal(a), wB=pal(b);
  if(nA.size!==nB.size || [...nA].some(w=>!nB.has(w))) return false;
  // y las MISMAS palabras: con una sola distinta ("Binder" vs "Poster") ya es otro producto
  return wA.size===wB.size && [...wA].every(w=>wB.has(w));
}
/* Devuelve [{p, score}] ordenado. Pesa más los códigos de set (OP-09, B14, EB02…)
   y los números, que son los que distinguen un producto de otro. */
function skuAsocSugerencias(desc, n){
  const a = _saTokens(desc); if(!a.length) return [];
  const A = new Set(a);
  const peso = w => /\d/.test(w) ? 3 : 1;
  const totA = [...A].reduce((s,w)=>s+peso(w),0);
  return (db.productos||[]).map(p=>{
    const B = new Set(_saTokens(p.nombre));
    let comun=0; A.forEach(w=>{ if(B.has(w)) comun+=peso(w); });
    const totB=[...B].reduce((s,w)=>s+peso(w),0);
    const score = (totA+totB) ? (2*comun)/(totA+totB) : 0;     // Dice ponderado
    return { p, score };
  }).filter(x=>x.score>=0.3).sort((x,y)=>y.score-x.score).slice(0, n||3);
}

/* ---------- Modal de producto ---------- */
let _saDraft = [];
function skuAsocSeccionHTML(p){
  _saDraft = skusAsocDe(p).map(x=>({ sku:x.sku, prov:x.prov||"", fecha:x.fecha||"" }));
  const provs = [...new Set((db.compras||[]).map(c=>(c.contraparte||"").trim()).filter(Boolean))].sort();
  return `
    <div class="phead" style="margin:16px 0 8px;padding:0"><h3 style="font-size:var(--fs-sm,13px)">${t("sa.h")}</h3></div>
    <p class="hint" style="font-size:12px;margin:0 0 8px">${t("sa.hint")}</p>
    <div id="sa_list"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;margin:8px 0 18px">
      <input class="inp" id="sa_code" placeholder="${t("sa.ph.code")}" autocomplete="off" spellcheck="false">
      <input class="inp" id="sa_prov" placeholder="${t("sa.ph.prov")}" list="sa_provs" autocomplete="off">
      <button type="button" class="btn" id="sa_add">${ICO.plus}${t("sa.add")}</button>
    </div>
    <datalist id="sa_provs">${provs.map(v=>`<option value="${esc(v)}">`).join("")}</datalist>`;
}
function _saPaint(){
  const el=document.getElementById("sa_list"); if(!el) return;
  el.innerHTML = _saDraft.length ? `<div class="table-scroll"><table class="line-tbl"><thead><tr>
      <th>${t("sa.th.code")}</th><th>${t("sa.th.prov")}</th><th></th></tr></thead><tbody>
      ${_saDraft.map((x,i)=>`<tr><td><span class="sku">${esc(x.sku)}</span></td>
        <td>${x.prov?esc(x.prov):'<span style="color:var(--muted)">—</span>'}</td>
        <td class="r"><button type="button" class="btn ghost" data-sa-del="${i}" title="${t("sa.remove")}" aria-label="${t("sa.remove")}">✕</button></td></tr>`).join("")}
      </tbody></table></div>`
    : `<p style="font-size:12px;color:var(--muted);margin:0">${t("sa.empty")}</p>`;
  el.querySelectorAll("[data-sa-del]").forEach(b=> b.onclick=()=>{ _saDraft.splice(+b.dataset.saDel,1); _saPaint(); });
}
/* Valida un código para el producto `id` cuyo SKU propio es `mainSku`. Devuelve texto de error o "". */
function _saError(code, id, mainSku, lista){
  const s=normSku(code);
  if(!s) return t("sa.err.empty");
  if(s===normSku(mainSku)) return t("sa.err.main");
  if(lista.some(x=>normSku(x.sku)===s)) return t("sa.err.rep");
  const otro=skuEnUso(code, id);
  if(otro) return t("sa.err.used",{sku:code.trim(),name:otro.nombre||"—"});
  return "";
}
function skuAsocWire(id){
  _saPaint();
  const add=()=>{
    const c=document.getElementById("sa_code"), pv=document.getElementById("sa_prov");
    const mainSku=(document.getElementById("p_sku")||{}).value||"";
    const err=_saError(c.value, id, mainSku, _saDraft);
    if(err){ toast(err,"warn"); c.focus(); return; }
    _saDraft.push({ sku:c.value.trim(), prov:(pv.value||"").trim(), fecha:_saHoy() });
    c.value=""; _saPaint(); c.focus();
  };
  const b=document.getElementById("sa_add"); if(b) b.onclick=add;
  const c=document.getElementById("sa_code"); if(c) c.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); add(); } };
}
/* Al guardar: revalida todo (el SKU propio pudo cambiar) y devuelve {ok, lista}. */
function skuAsocLeer(id, mainSku){
  const out=[];
  for(const x of _saDraft){
    const err=_saError(x.sku, id, mainSku, out);
    if(err){ toast(err,"warn"); return { ok:false }; }
    out.push(x);
  }
  return { ok:true, lista:out };
}

/* ---------- Importar factura ---------- */
/* Selector para una línea con código desconocido: sugeridos + todos + crear nuevo. */
function skuAsocSelectHTML(c, i){
  const sugIds=new Set((c.sug||[]).map(x=>x.p.id));
  const op=p=>`<option value="${p.id}" ${p.id===c.productoId?"selected":""}>${esc(p.sku?("["+p.sku+"] "):"")}${esc(p.nombre||"—")}</option>`;
  const resto=(db.productos||[]).filter(p=>!sugIds.has(p.id))
    .sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||""),"es",{numeric:true}));
  return `<div style="font-size:12px;margin-top:8px;color:var(--warn-text,var(--muted))">${t("sa.imp.unknown")}</div>
    <select class="inp" data-sa-imp="${i}" style="max-width:100%;margin-top:6px">
      <option value="__new" ${c.crear?"selected":""}>${t("sa.imp.new")}</option>
      ${(c.sug||[]).length?`<optgroup label="${t("sa.imp.sug")}">${c.sug.map(x=>op(x.p)).join("")}</optgroup>`:""}
      <optgroup label="${t("sa.imp.all")}">${resto.map(op).join("")}</optgroup>
    </select>
    <div data-sa-note="${i}" style="font-size:12px;color:var(--muted);margin-top:6px">${(!c.crear&&c.asociar)?t("sa.imp.willlink",{sku:esc(c.sku)}):""}</div>`;
}
/* Prepara cada ítem importado: marca si vino por código asociado y, si el código
   es desconocido, calcula sugerencias (la mejor queda preseleccionada si es muy parecida). */
function skuAsocPrepararItems(items){
  items.forEach(c=>{
    c.viaAsoc=false; c.desconocido=false; c.asociar=false; c.sug=[];
    if(!c.sku) return;
    const p=findProdBySku(c.sku);
    if(p){ c.viaAsoc = normSku(p.sku)!==normSku(c.sku); return; }
    c.desconocido=true;
    c.sug=skuAsocSugerencias(c.desc, 3);
    // si el emparejamiento por nombre ya eligió un producto, lo respetamos y proponemos asociarlo
    if(c.productoId){ c.asociar=true; c.crear=false; return; }
    const best=c.sug[0];
    if(best && best.score>=0.75 && _saAutoSeguro(c.desc, best.p)){ c.productoId=best.p.id; c.crear=false; c.nombre=best.p.nombre; c.asociar=true; }
  });
}
/* Texto extra debajo de la descripción de la línea. */
function skuAsocCeldaExtra(c, i){
  if(c.viaAsoc){ const p=prodById(c.productoId); return `<div style="font-size:12px;color:var(--muted);margin-top:6px">🔗 ${t("sa.imp.via")}: ${esc(p?p.nombre:"")}</div>`; }
  if(c.desconocido) return skuAsocSelectHTML(c, i);
  return "";
}
function skuAsocWireImport(root, items){
  root.querySelectorAll("[data-sa-imp]").forEach(sel=>{
    sel.onchange=()=>{
      const i=+sel.dataset.saImp, c=items[i];
      if(sel.value==="__new"){ c.crear=true; c.productoId=""; c.asociar=false; c.nombre=c.desc; }
      else { const p=prodById(sel.value); c.crear=false; c.productoId=sel.value; c.asociar=true; if(p) c.nombre=p.nombre; }
      const note=root.querySelector(`[data-sa-note="${i}"]`);
      if(note) note.textContent = c.asociar ? t("sa.imp.willlink",{sku:c.sku}) : "";
    };
  });
}
/* Al continuar: guarda los códigos nuevos en sus productos. Devuelve cuántos se asociaron. */
function skuAsocAplicar(items, proveedor){
  let n=0;
  items.forEach(c=>{
    if(!c.sel || !c.asociar || !c.sku || !c.productoId) return;
    const p=prodById(c.productoId); if(!p) return;
    if(normSku(p.sku)===normSku(c.sku)) return;
    if(skusAsocDe(p).some(x=>normSku(x.sku)===normSku(c.sku))) return;
    if(skuEnUso(c.sku, p.id)) return;                      // otro producto ya lo tiene: no pisamos
    if(!Array.isArray(p.skusAsoc)) p.skusAsoc=[];
    p.skusAsoc.push({ sku:c.sku.trim(), prov:(proveedor||"").trim(), fecha:_saHoy() });
    n++;
  });
  if(n){ save(); toast(t("sa.tt.linked",{n})); }
  return n;
}
