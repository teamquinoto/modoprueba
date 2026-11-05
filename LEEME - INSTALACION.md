# Modo Prueba — instalación desde cero

La app tiene dos partes:
- **La app** (esta carpeta) → se publica gratis en **GitHub Pages**.
- **El servidor** (`servidor/worker.js`) → va en **Cloudflare** (Worker + base D1), también gratis.

---

## 1. GitHub (la app)
1. En GitHub: **New repository** → nombre (ej. `modoprueba`) → **Public** → Create.
2. **uploading an existing file** → arrastrá **todo el contenido** de esta carpeta (no la carpeta en sí) → **Commit changes**.
3. **Settings → Pages** → Source: **Deploy from a branch** → Branch **main** / **(root)** → Save.
4. Al minuto queda en `https://TUUSUARIO.github.io/modoprueba/`.

## 2. Cloudflare (el servidor)
1. **Storage & Databases → D1 → Create** → nombre `modoprueba-db`. (Las tablas se crean solas.)
2. **Workers & Pages → Create → Worker** → nombre `modoprueba-api` → Deploy.
3. **Edit code** → borrá todo, pegá `servidor/worker.js` → **Deploy**.
4. En el Worker: **Settings → Bindings → Add → D1 database** → nombre de variable **`DB`** → elegí `modoprueba-db`.
5. **Settings → Variables and Secrets** → agregá:

| Nombre | Tipo | Valor |
|---|---|---|
| `AUTH_SECRET` | Secret | cualquier texto largo al azar (40+ caracteres) |
| `ADMIN_USER` | Text | el usuario del admin (ej. `admin`) |
| `ADMIN_PASS` | Secret | su contraseña |
| `ALLOWED_ORIGINS` | Text | `https://TUUSUARIO.github.io` (sin barra ni carpeta al final) |
| `GEMINI_KEY` | Secret | *(opcional)* para leer facturas PDF con IA |

6. Copiá la dirección del Worker (arriba, tipo `https://modoprueba-api.TUUSUARIO.workers.dev`).

## 3. Conectar la app con el servidor
1. En GitHub abrí **`config.js`** → lápiz ✏️ → reemplazá `https://PEGAR-ACA-LA-URL-DEL-WORKER.workers.dev` por la dirección del paso 2.6 → **Commit**.
2. Entrá a la app, logueate con `ADMIN_USER` / `ADMIN_PASS` y creá los usuarios en **Configuración → Usuarios**.

Listo.

---

### Para cada cliente nuevo
Repetí todo con otros nombres (otro repo, otra base D1, otro Worker). Cada cliente queda con sus datos separados.

### Actualizaciones
Cuando subas cambios, en `sw.js` cambiá `modoprueba-v1` → `modoprueba-v2` (y `build v1` en `index.html`). Así a los usuarios les aparece el cartel "Actualizar".

### Datos de demostración
Con `demo: true` en `config.js` aparece en **Configuración → General** el botón **Cargar demo**: carga un año completo de datos ficticios (`demo.json`) y lo sube al servidor. Las fechas se corren solas para que terminen ayer. Se puede volver a cargar cuando quieras para dejar la demo como nueva.
En la instalación de un cliente real poné `demo: false` y no subas `demo.json`.

### Personalizar
- Nombre: buscá "Modo Prueba" en `index.html`, `manifest.json` y `js/00e-i18n-guia.js`.
- Sociedades (las que compran): `js/01-core.js`, arriba de todo (`STORES`). Cambiá solo los `name`.
- Ícono: reemplazá los `.png` con los mismos nombres y tamaños.
