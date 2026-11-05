/* ============================================================
   000 · AISLAR LOS DATOS DE ESTA INSTALACIÓN
   ------------------------------------------------------------
   En GitHub Pages todas las apps de una misma cuenta comparten
   dominio (usuario.github.io), y el navegador comparte el
   localStorage entre ellas. Sin esto, esta app leía la sesión y
   los datos de OTRA app de la misma cuenta.
   Acá cada instalación guarda todo con un prefijo propio según su
   carpeta (ej. "/modoprueba/"), así dos repos nunca se mezclan.
   Tiene que cargarse ANTES que cualquier otro script.
   ============================================================ */
(function(){
  try{
    var base = location.pathname.replace(/[^\/]*$/, "");   // "/modoprueba/"
    var NS = "app@" + base + "|";
    var P = Storage.prototype, g = P.getItem, s = P.setItem, r = P.removeItem;
    var LS = window.localStorage;
    P.getItem    = function(k){ return this === LS ? g.call(this, NS + k) : g.call(this, k); };
    P.setItem    = function(k, v){ return this === LS ? s.call(this, NS + k, v) : s.call(this, k, v); };
    P.removeItem = function(k){ return this === LS ? r.call(this, NS + k) : r.call(this, k); };
    window.APP_BASE = location.origin + base;
  }catch(e){ /* navegador sin localStorage: la app sigue igual */ }
})();
