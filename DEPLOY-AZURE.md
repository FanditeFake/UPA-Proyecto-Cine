# Despliegue en Azure (CineMax)

Guía para publicar el proyecto en **Azure for Students**, desplegando **desde GitHub**.

Arquitectura en la nube:

```
GitHub (este repo)
   ├─ frontend/  ──▶  Azure Static Web Apps   (gratis)      → sitio React
   └─ backend/   ──▶  Azure App Service (F1)   (gratis)      → API Node/Express
                          │
                          └──▶ Azure Database for MySQL Flexible Server  (crédito estudiante)
```

> **Nota:** desplegar desde GitHub **sube cambios al repo del equipo** (Azure agrega
> archivos de workflow en `.github/workflows/`). Avisa a tus compañeros.

Antes de empezar, sube a GitHub los cambios de preparación (build de producción, SSL,
`staticwebapp.config.json`):

```bash
git add backend/.env.example backend/config/db.js frontend/package.json frontend/staticwebapp.config.json DEPLOY-AZURE.md
git commit -m "Prepara despliegue en Azure (build prod, SSL MySQL, SPA config)"
git push origin main
```

---

## Paso 1 — Grupo de recursos

1. Entra a <https://portal.azure.com> con tu cuenta **Azure for Students**.
2. Busca **"Grupos de recursos"** → **Crear**.
   - Nombre: `rg-cinemax`
   - Región: `East US 2` (o la más cercana con capacidad para estudiantes).

## Paso 2 — Base de datos MySQL

1. Busca **"Azure Database for MySQL Flexible Server"** → **Crear**.
2. Configuración:
   - Grupo de recursos: `rg-cinemax`
   - Nombre del servidor: `cinemax-mysql-<tusiniciales>` (debe ser único)
   - Región: la misma del grupo
   - Versión de MySQL: **8.0**
   - Tipo de carga de trabajo: **Development** (barato: `Burstable B1ms`)
   - Autenticación: **MySQL authentication**
   - Usuario administrador: `cinemaxadmin`  ·  Contraseña: (una fuerte, guárdala)
3. Pestaña **Redes (Networking)**:
   - Conectividad: **Public access**
   - ✅ Marca **"Allow public access from any Azure service within Azure to this server"**
   - Agrega una **regla de firewall** con tu IP actual (botón "Add current client IP") para poder cargar el esquema desde tu PC.
4. **Crear** y espera a que termine (~5 min).

### Cargar el esquema (cinemax.sql)

Opción A — desde tu PC (necesitas el cliente `mysql` instalado):

```bash
mysql -h cinemax-mysql-<tusiniciales>.mysql.database.azure.com \
      -u cinemaxadmin -p --ssl-mode=REQUIRED < backend/database/cinemax.sql
```

Opción B — desde **Azure Cloud Shell** (portal, ícono `>_` arriba): sube el archivo
`backend/database/cinemax.sql` y corre el mismo comando.

> El script crea la base `cinemax_db`, las tablas, los datos semilla y las vistas.

## Paso 3 — Backend en App Service

1. Busca **"App Service"** → **Crear** → **Web App**.
   - Grupo: `rg-cinemax`  ·  Nombre: `cinemax-api-<tusiniciales>`
   - Publicar: **Code**  ·  Runtime: **Node 20 LTS**  ·  SO: **Linux**
   - Plan: **F1 (Free)**
2. **Crear**. Al terminar, abre el recurso.
3. **Configuración → App settings** (Settings → Environment variables) — agrega:

   | Nombre | Valor |
   |---|---|
   | `DB_HOST` | `cinemax-mysql-<...>.mysql.database.azure.com` |
   | `DB_PORT` | `3306` |
   | `DB_NAME` | `cinemax_db` |
   | `DB_USER` | `cinemaxadmin` |
   | `DB_PASSWORD` | *(tu contraseña)* |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | *(cadena larga y única)* |
   | `JWT_EXPIRES_IN` | `8h` |
   | `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
   | `WEBSITE_RUN_FROM_PACKAGE` | `0` |

4. **Configuración → General → Startup Command**: `node server.js`
5. **Deployment Center**:
   - Origen: **GitHub** → autoriza → selecciona el repo `UPA-Proyecto-Cine`, rama `main`.
   - Azure genera un workflow. **Como el backend está en la subcarpeta `backend/`**, edita el
     archivo `.github/workflows/*.yml` que creó y ajusta la ruta de trabajo: en el job de
     build, antes de `npm install`/`zip`, agrega `working-directory: backend`, y en el paso de
     deploy pon `package: backend`. (Ver plantilla al final de esta guía.)

## Paso 4 — Frontend en Static Web Apps

1. **Importante:** primero necesitas la URL del backend (Paso 3), será
   `https://cinemax-api-<...>.azurewebsites.net`. Crea el archivo
   **`frontend/.env.production`** con:

   ```
   VITE_API_URL=https://cinemax-api-<...>.azurewebsites.net/api
   ```
   y súbelo:
   ```bash
   git add frontend/.env.production
   git commit -m "Frontend: apunta a la API de Azure"
   git push origin main
   ```

2. Busca **"Static Web Apps"** → **Crear**.
   - Grupo: `rg-cinemax`  ·  Nombre: `cinemax-web-<tusiniciales>`  ·  Plan: **Free**
   - Origen: **GitHub** → autoriza → repo `UPA-Proyecto-Cine`, rama `main`
   - **Build presets:** `Custom`
     - **App location:** `frontend`
     - **Api location:** *(vacío)*
     - **Output location:** `dist`
3. **Crear**. Azure agrega un workflow y despliega. En unos minutos tendrás la URL pública
   `https://<algo>.azurestaticapps.net`.

## Paso 5 — Verificar

1. Abre la URL de la Static Web App.
2. Inicia sesión con `admin@cinemax.com` / `123456`.
3. Si el login o la cartelera fallan, revisa:
   - **Logs del backend:** App Service → *Log stream*.
   - **CORS:** el backend ya usa `cors()` abierto; no debería bloquear.
   - **MySQL:** que el firewall permita "Azure services" y que `DB_SSL=true`.

---

## Plantilla: ajuste del workflow del backend (monorepo)

En el `.github/workflows/*_cinemax-api-*.yml` que genera Azure, el job de build debe operar
sobre `backend/`. El patrón es:

```yaml
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
      - name: npm install & build
        working-directory: backend        # ← clave: entra a la subcarpeta
        run: |
          npm install
      # ...paso de zip/artifact usando backend...
      # En el job de deploy:
      - uses: azure/webapps-deploy@v3
        with:
          app-name: 'cinemax-api-<...>'
          package: backend                 # ← despliega solo el backend
```

> Alternativa sin editar YAML: en el App Service, App settings, agrega `PROJECT=backend`
> y deja que Oryx construya esa subcarpeta.

## Costos

- **Static Web Apps (Free)** y **App Service (F1)**: gratis.
- **MySQL Flexible B1ms**: de pago, pero lo cubre el crédito de **Azure for Students**.
  Para no gastar de más cuando no lo uses, puedes **detener** el servidor MySQL desde el portal.
