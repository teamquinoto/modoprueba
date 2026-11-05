/* ============================================================
   37 · PERFIL EDITOR — textos y detalles visuales
   ------------------------------------------------------------
   El editor carga compras (también importando la factura) y mantiene
   productos y sus códigos de proveedor. No ve ventas, finanzas,
   configuración ni usuarios, y no puede borrar documentos.
   Los permisos reales los aplica el servidor; esto es la cara visible.
   Módulo idéntico en las dos versiones.
   ============================================================ */
(function(){
  const EN = { "role.editor":"Editor", "usr.role.editor":"Editor (purchases)",
    "ed.err.nodelete":"The Editor profile can't delete documents. Ask an admin.",
    "ed.err.nosale":"The Editor profile loads purchases, not sales." };
  const ES = { "role.editor":"Editor", "usr.role.editor":"Editor (compras)",
    "ed.err.nodelete":"El perfil Editor no puede borrar documentos. Pedíselo a un admin.",
    "ed.err.nosale":"El perfil Editor carga compras, no ventas." };
  try{ Object.assign(I18N.en, EN); Object.assign(I18N.es, ES); }catch(e){ console.warn("editor i18n", e); }
  // Sin botones de venta para el editor (panel, barra superior y botón flotante del celular)
  try{
    const st=document.createElement("style");
    st.textContent='body.role-editor [data-open="venta"], body.role-editor #fabVenta, body.role-editor [data-newsale]{display:none !important}';
    document.head.appendChild(st);
  }catch(e){}
})();
