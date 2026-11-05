/* ============================================================
   CONFIGURACIÓN — lo único que hay que tocar al instalar la app
   ------------------------------------------------------------
   apiUrl: la dirección del Worker de Cloudflare (el servidor).
           La copiás del panel de Cloudflare, sin "/" al final.
           Ej: "https://modoprueba-api.tuusuario.workers.dev"
   ============================================================ */
window.APP_CONFIG = {
  apiUrl: "https://modoprueba-api.teamquinoto.workers.dev",
  demo: true   // muestra "Cargar demo" en Configuración. En la app de un cliente real: false
};
