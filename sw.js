/* ============================================================
   Service Worker — Modo Prueba
   - index.html / navegación: NETWORK-FIRST (siempre la última
     versión si hay internet; cache solo como respaldo offline).
   - iconos y estáticos: cache-first.
   - API (workers.dev): sin intervención (siempre a la red).
   - pdf.js (CDN): cache-first para importar offline.

   ACTUALIZACIÓN CONTROLADA (v39+):
   Ya NO auto-activamos la versión nueva con skipWaiting en install.
   Cuando hay una versión nueva, el SW queda "waiting" y la app muestra
   un botón "Update". Recién cuando el usuario lo toca, la app le manda
   el mensaje {type:"SKIP_WAITING"} y ahí sí se activa y recarga. Así
   nadie pierde una carga a medias por un refresh sorpresa.
   ============================================================ */
const CACHE = "modoprueba-v4";   // subí este número en cada actualización para que aparezca el cartel "Actualizar"

const ASSETS = [
  "./",
  "./index.html",
  "./config.js",
  "./js/000-aislar.js",
  "./styles.css",
  "./configuracion.css",
  "./guia.css",
  "./js/00a-tema.js",
  "./js/00b-i18n.js",
  "./js/00c-icons.js",
  "./js/00d-i18n-fin.js",
  "./js/00e-i18n-guia.js",
  "./js/07-paises.js",
  "./js/01-core.js",
  "./js/02-engine.js",
  "./js/05-metrics.js",
  "./js/06-fpa.js",
  "./js/03-router.js",
  "./js/09-compat-select.js",
  "./js/10-view-dashboard.js",
  "./js/11-view-analisis.js",
  "./js/11b-view-pnl.js",
  "./js/11c-view-resumen.js",
  "./js/11d-view-plan.js",
  "./js/11e-drill.js",
  "./js/11f-view-gastos.js",
  "./js/12-view-investments.js",
  "./js/13-view-productos.js",
  "./js/14-view-documentos.js",
  "./js/15-view-movimientos.js",
  "./js/16-view-datos.js",
  "./js/17-view-clientes.js",
  "./js/20-modal-producto.js",
  "./js/21-modal-documento.js",
  "./js/22-ui-modales.js",
  "./js/30-pdf.js",
  "./js/31-export-pnl.js",
  "./js/31b-export-pnl-pro.js",
  "./js/32-importar-pdf.js",
  "./js/33-ficha-producto.js",
  "./js/34-datos-io.js",
  "./js/35-sku-asociados.js",
  "./js/36-cobros.js",
  "./js/37-editor.js",
  "./js/39-stock-grupo.js",
  "./js/18-papelera.js",
  "./js/19-view-guia.js",
  "./js/40-field-enhancers.js",
  "./js/41-mobile-nav.js",
  "./js/43-seguridad.js",
  "./js/44-demo.js",
  "./vendor/qrcode.js",
  "./js/42-moneda.js",
  "./js/91-onboarding.js",
  "./js/90-boot.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon.png",
  "./favicon-32.png"
];

const VENDOR = [
  "./vendor/pdf.min.js",
  "./vendor/pdf.worker.min.js",
  "./vendor/jspdf.umd.min.js",
  "./vendor/xlsx.full.min.js",
  "./vendor/exceljs.min.js"
];

const CDN = "https://cdnjs.cloudflare.com/ajax/libs/";   // pdf.js + jsPDF: cache-first offline

self.addEventListener("install", e => {
  // Precargamos el cache nuevo, pero NO llamamos skipWaiting: quedamos "waiting"
  // hasta que el usuario apriete "Update" en la app.
  // v96: las librerías de /vendor se guardan de a una: si alguna falta, no frena la instalación.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).then(() =>
    Promise.all(VENDOR.map(u => c.add(u).catch(() => {})))
  )));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      // solo las cachés de esta app (otras apps de la misma cuenta comparten dominio)
      Promise.all(keys.filter(k => k.startsWith("modoprueba-") && k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// La app pide activarse cuando el usuario toca "Update".
self.addEventListener("message", e => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
  if (e.data && e.data.type === "VERSION" && e.ports && e.ports[0]) e.ports[0].postMessage(CACHE);   // v105/v149: la app pregunta qué versión está activa
});

self.addEventListener("fetch", e => {
  const req = e.request;
  let url;
  try { url = new URL(req.url); } catch { return; }

  // API: no la tocamos, va siempre a la red
  // v111: el servidor ahora vive en el dominio del servidor; el service worker no se mete con sus pedidos.
  if (url.origin !== self.location.origin && !req.url.startsWith(CDN)) return;   // API y otros dominios: siempre a la red

  // pdf.js (CDN): cache-first, guardando copia para offline
  if (req.url.startsWith(CDN)) {
    e.respondWith(
      caches.match(req).then(hit =>
        hit || fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        }).catch(() => hit)
      )
    );
    return;
  }

  if (req.method !== "GET") return;

  // Codigo propio (js/css): network-first -> siempre la ultima al editar, con copia offline
  if (url.origin === location.origin && (url.pathname.endsWith(".js") || url.pathname.endsWith(".css"))) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Navegación / index.html: NETWORK-FIRST
  // catalog.html es una página aparte (pública): network-first con su PROPIA copia.
  // Antes toda navegación se guardaba como "./index.html" y la pisaba.
  // v129: se renombró de catalogo.html a catalog.html; catalogo.html queda como
  // redirección para los links viejos y tampoco tiene que pisar el index.
  if (url.origin === location.origin &&
      (url.pathname.endsWith("/catalog.html") || url.pathname.endsWith("/catalogo.html"))) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }
  const isNav = req.mode === "navigate" ||
                url.pathname.endsWith("/") ||
                url.pathname.endsWith("/index.html");
  if (isNav) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("./index.html").then(h => h || caches.match("./")))
    );
    return;
  }

  // Resto (iconos, manifest, etc.): cache-first con fallback a red
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
