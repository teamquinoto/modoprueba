/* ============================================================
   44 · DATOS DE DEMOSTRACIÓN (solo si config.js tiene demo:true)
   ------------------------------------------------------------
   Configuración → General → "Datos de demostración": reemplaza todo
   por un año completo de datos FICTICIOS (demo.json) y lo sube al
   servidor. Sirve para mostrar la app a clientes y para dejarla
   "como nueva" después de una demo (se puede cargar cuantas veces
   quieras). Lo que se reemplaza queda en la papelera del servidor.
   En la instalación de un cliente real: demo:false (o sin la línea).
   ============================================================ */
function demoHabilitada(){ return !!(window.APP_CONFIG && window.APP_CONFIG.demo); }
function demoRowHTML(row){
  if(!demoHabilitada() || !isAdmin() || !session) return "";
  return row(msgLoc({es:"Datos de demostración", en:"Demo data"}),
    msgLoc({es:"Carga un año completo de datos ficticios (ventas, compras, clientes, gastos, plan…) para mostrar la app. Reemplaza todo lo que haya.",
            en:"Loads a full year of fictitious data (sales, purchases, customers, expenses, plan…) to showcase the app. Replaces everything."}),
    `<button class="btn sm" data-demo>${ICO.download||""}${msgLoc({es:"Cargar demo", en:"Load demo"})}</button>`);
}
/* La demo se generó hasta una fecha fija (demo._demoHasta). Al cargarla, TODAS las fechas se
   corren para que el último día con datos sea AYER: así la demo nunca "envejece" y el mes en
   curso siempre tiene movimiento. Fechas de día se corren N días; los meses (gastos, plan) se
   corren los meses equivalentes. Las fotos de stock se recalculan después. */
function demoCorrerFechas(d){
  const hastaTxt = d && d._demoHasta; if(d) delete d._demoHasta;
  if(!hastaTxt) return d;
  const hasta = new Date(hastaTxt+"T12:00:00Z");
  const ayer = new Date(); ayer.setDate(ayer.getDate()-1);
  const ayerUTC = new Date(Date.UTC(ayer.getFullYear(), ayer.getMonth(), ayer.getDate(), 12));
  const D = Math.round((ayerUTC - hasta)/86400000);
  if(D <= 0) return d;
  const M = (ayer.getFullYear()*12+ayer.getMonth()) - (hasta.getUTCFullYear()*12+hasta.getUTCMonth()), ms = D*86400000;   // el último mes con datos pasa a ser el mes en curso
  const RE_DIA = /^\d{4}-\d{2}-\d{2}$/, RE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, RE_MES = /^\d{4}-\d{2}$/;
  const dia = s=> new Date(new Date(s+"T12:00:00Z").getTime()+ms).toISOString().slice(0,10);
  const iso = s=> new Date(new Date(s).getTime()+ms).toISOString();
  const mes = s=>{ let y=+s.slice(0,4), m=+s.slice(5,7)+M; y+=Math.floor((m-1)/12); m=((m-1)%12+12)%12+1; return y+"-"+String(m).padStart(2,"0"); };
  const walk = (o)=>{
    if(Array.isArray(o)){ o.forEach((v,i)=>{ if(typeof v==="string") o[i]=conv(null,v); else if(v && typeof v==="object") walk(v); }); return; }
    Object.keys(o).forEach(k=>{ const v=o[k]; if(typeof v==="string") o[k]=conv(k,v); else if(v && typeof v==="object") walk(v); });
  };
  const conv = (k,v)=> (RE_MES.test(v) && (k==="mes"||k==="desde"||k==="hasta")) ? mes(v) : RE_DIA.test(v) ? dia(v) : RE_ISO.test(v) ? iso(v) : v;
  const snaps = d.stockSnaps; d.stockSnaps = {};
  walk(d);
  d._demoRecalcSnaps = !!snaps;
  return d;
}
async function demoCargar(){
  if(!demoHabilitada() || !isAdmin() || !session) return;
  if(!confirm(msgLoc({es:"Esto REEMPLAZA todos los datos por un año de datos de demostración (ficticios).\n\n¿Seguir?",
                      en:"This REPLACES all data with one year of (fictitious) demo data.\n\nContinue?"}))) return;
  toast(msgLoc({es:"Cargando datos de demostración…", en:"Loading demo data…"}));
  try{
    const r = await fetch("demo.json?_="+Date.now(), { cache:"no-store" });
    if(!r.ok) throw new Error("HTTP "+r.status);
    const j = await r.json();
    if(!j || !Array.isArray(j.productos)) throw new Error("demo.json");
    db = migrate(demoCorrerFechas(j));
    if(db._demoRecalcSnaps){ delete db._demoRecalcSnaps; if(typeof finFreezeStockSnaps==="function") finFreezeStockSnaps(true); }
    persistLocal();
    syncMeta.dirty = true; saveSyncMeta();
    activeStore = "all"; render();
    await pushNow(true);   // forzado: el servidor acepta el reemplazo completo (lo anterior va a la papelera)
    render();
    toast(msgLoc({es:"Listo: datos de demostración cargados", en:"Done: demo data loaded"}), "up");
  }catch(e){
    console.error("[demo]", e);
    toast(msgLoc({es:"No se pudo cargar la demo ("+(e&&e.message||e)+")", en:"Couldn't load the demo ("+(e&&e.message||e)+")"}), "warn");
  }
}
