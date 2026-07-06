# Backend — CineMax

API REST del sistema de compra de boletos.
**Stack:** Node.js + Express + Sequelize + MySQL 8 (en Docker) + JWT.

> El backend está **completo y probado** (18/18 pruebas de la API pasan).
> Esta guía explica cómo arrancarlo, los endpoints disponibles y cómo usarlo.

---

## 1. Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para la base de datos)

## 2. Puesta en marcha

```bash
cd backend

# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
#    (Windows PowerShell:  Copy-Item .env.example .env)
cp .env.example .env

# 3. Levantar la base de datos (crea el contenedor y carga cinemax.sql)
docker compose up -d

# 4. Arrancar el servidor
npm start
```

El servidor queda en **http://localhost:4000**.
Prueba rápida: abre esa URL y debe responder `{ "ok": true, "mensaje": "API CineMax funcionando" }`.

## 3. Probar la API

Con el servidor corriendo, en otra terminal:

```bash
node test-api.js     # ejecuta 18 pruebas del flujo completo
node test-db.js      # prueba solo la capa de datos
```

## 4. Endpoints

Todas las respuestas son JSON con la forma `{ ok: true/false, ... }`.
Las rutas protegidas requieren el header `Authorization: Bearer <token>`.

### Autenticación
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | Público | Registra un cliente. Body: `{ nombre, correo, password }` |
| POST | `/api/auth/login` | Público | Devuelve `{ usuario, token }`. Body: `{ correo, password }` |
| GET | `/api/auth/me` | Token | Perfil del usuario autenticado |

### Catálogo (público)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/peliculas` | Lista de películas activas |
| GET | `/api/peliculas/:id` | Una película |
| GET | `/api/funciones` | Cartelera (funciones con película y sala) |
| GET | `/api/funciones/:id` | Una función |
| GET | `/api/funciones/:id/asientos` | Asientos de la función con `ocupado` (0/1) |

### Compras (requieren token)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/compras` | Crea una compra. Body: `{ funcion_id, asientos:[id], cliente_nombre }` |
| GET | `/api/compras/mias` | Compras del usuario |
| GET | `/api/compras/:id` | Detalle de una compra (solo el dueño) |

### Administración (requieren token + rol administrador)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/dashboard` | Indicadores + tablas resumen + **datos de las gráficas** |
| GET | `/api/admin/ventas` | Listado de ventas. Filtro opcional `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` |

**Datos de gráficas** — `/api/admin/dashboard` devuelve un objeto `graficas`
listo para Chart.js (cada gráfica trae `labels` + arreglos numéricos):

```json
{
  "graficas": {
    "ventasPorDia":     { "labels": ["2026-07-06"], "ingresos": [136], "boletos": [2] },
    "ventasPorPelicula":{ "labels": ["Guardianes del Código"], "boletos": [2], "ingresos": [136] },
    "ventasPorSala":    { "labels": ["Sala 1"], "boletos": [2], "ingresos": [136] }
  }
}
```

Ejemplo de uso en el frontend (Chart.js):

```js
const { graficas } = await (await fetch('/api/admin/dashboard', { headers:{ Authorization:`Bearer ${token}` } })).json();
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: graficas.ventasPorDia.labels,
    datasets: [{ label: 'Ingresos por día', data: graficas.ventasPorDia.ingresos }],
  },
});
```

### Ejemplo con curl

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"usuario@cinemax.com","password":"123456"}' | jq -r .token)

# Comprar 2 asientos de la función 1
curl -X POST http://localhost:4000/api/compras \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"funcion_id":1,"asientos":[3,4],"cliente_nombre":"Juan"}'
```

## 5. Arquitectura (patrón MVC en capas)

```
Petición HTTP
   │
   ▼
routes/        → define la URL y aplica middlewares (auth, soloAdmin)
   │
   ▼
controllers/   → recibe req/res, llama al servicio, responde JSON
   │
   ▼
services/      → lógica de negocio (validaciones, cálculos, transacciones)
   │
   ▼
models/        → Sequelize; mapea las tablas y relaciones
   │
   ▼
config/db.js   → conexión MySQL
```

```
backend/
├── config/db.js            conexión Sequelize
├── models/                 7 modelos + relaciones (index.js)
├── middlewares/
│   ├── auth.js             verifica JWT → req.usuario
│   ├── soloAdmin.js        autoriza solo administradores
│   └── errorHandler.js     respuestas de error uniformes
├── utils/
│   ├── jwt.js              firmar/verificar tokens
│   ├── asyncHandler.js     captura errores async
│   ├── errores.js          ErrorApp (error con código HTTP)
│   └── folio.js            genera CMX-XXXX, folios y QR
├── services/               lógica de negocio
├── controllers/            capa HTTP
├── routes/                 endpoints + seguridad
├── database/               cinemax.sql, hashear.js (base de datos)
├── docker-compose.yml      contenedor MySQL
├── server.js               punto de entrada
├── test-api.js             pruebas de la API
└── test-db.js              prueba de la capa de datos
```

## 6. Reglas de negocio implementadas

- **Login por rol:** el token incluye el rol; el frontend redirige a cliente o admin.
- **Descuento por membresía (20%):** se aplica según la membresía **real** del
  usuario en la BD (no se puede falsificar desde el cliente).
- **Asientos:** una compra crea 1 fila en `compras` y N en `boletos`, dentro de
  una **transacción**. El índice `UNIQUE(funcion_id, asiento_id)` impide vender
  el mismo asiento dos veces en la misma función (responde `409`).
- **Máximo 10 boletos** por compra.
- **Manejo de fechas sin confusión:** las fechas se leen de MySQL como texto
  (`dateStrings`) con zona horaria fija (`-06:00`), así el horario guardado es
  el que se muestra, sin que JavaScript lo "corra" a UTC. Los reportes por día
  se formatean en SQL como `YYYY-MM-DD`.
- **Validación de fechas:** el filtro `?desde&hasta` de `/api/admin/ventas`
  valida el formato (`YYYY-MM-DD`), que la fecha exista en el calendario
  (rechaza `2026-13-40`) y que `desde` no sea posterior a `hasta` (responde `400`).

## 7. Usuarios de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@cinemax.com` | `123456` | administrador |
| `usuario@cinemax.com` | `123456` | cliente (con membresía) |

## 8. Comandos de Docker

```bash
docker compose up -d      # levantar la BD
docker compose down       # detener (conserva los datos)
docker compose down -v    # detener y BORRAR datos (recarga cinemax.sql al subir)
```

## 9. Variables de entorno (`.env`)

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `4000` |
| `DB_HOST` / `DB_PORT` | Host y puerto de MySQL | `localhost` / `3306` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Credenciales de la BD | `cinemax_db` / `cinemax_user` / `cinemax_pass` |
| `JWT_SECRET` | Clave para firmar los tokens JWT | *(cámbiala)* |
| `JWT_EXPIRES_IN` | Duración del token | `8h` |
