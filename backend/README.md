# Backend — CineMax

Backend del sistema de compra de boletos.
**Stack:** Node.js + Express + Sequelize + MySQL 8 (en Docker).

> La **base de datos y la capa de datos ya están listas y probadas**.
> Esta guía explica cómo arrancar el entorno y cómo usar los modelos
> desde las rutas/controladores del backend.

---

## 1. Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para la base de datos)

## 2. Puesta en marcha (primera vez)

```bash
cd backend

# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
#    (Windows PowerShell:  Copy-Item .env.example .env)
cp .env.example .env

# 3. Levantar la base de datos (crea el contenedor y carga cinemax.sql)
docker compose up -d

# 4. Comprobar que la capa de datos conecta
node test-db.js
```

Si `node test-db.js` imprime las películas y "✅ Todo funciona", el entorno está listo.

## 3. Estructura del backend

```
backend/
├── config/
│   └── db.js            ← conexión Sequelize (lee del .env)
├── database/
│   ├── cinemax.sql      ← esquema + datos + vistas (lo carga Docker)
│   ├── hashear.js       ← genera hashes bcrypt
│   └── README.md        ← detalle del modelo de datos
├── models/
│   ├── index.js         ← relaciones entre tablas + export de todos los modelos
│   ├── Usuario.js  Pelicula.js  Sala.js  Asiento.js
│   ├── Funcion.js  Compra.js    Boleto.js
├── docker-compose.yml   ← contenedor MySQL
├── .env.example         ← plantilla de variables (copiar a .env)
├── test-db.js           ← prueba de la capa de datos
└── server.js            ← punto de entrada de Express  ← AQUÍ VA EL BACKEND
```

## 4. Cómo usar la capa de datos (para rutas/controladores)

Importa los modelos desde `./models` y usa Sequelize. Ejemplos:

```js
const { Usuario, Pelicula, Funcion, Sala, Compra, Boleto, sequelize } = require('./models');

// Listar películas activas
const peliculas = await Pelicula.findAll({ where: { activa: true } });

// Cartelera: funciones con su película y sala
const cartelera = await Funcion.findAll({ include: [Pelicula, Sala] });

// Login: buscar usuario por correo (la contraseña se compara con bcrypt)
const bcrypt = require('bcryptjs');
const user = await Usuario.findOne({ where: { correo } });
const valido = user && bcrypt.compareSync(password, user.contrasena);

// Asientos disponibles de una función (usa la vista SQL)
const { QueryTypes } = require('sequelize');
const disponibles = await sequelize.query(
  'SELECT * FROM v_asientos_disponibles WHERE funcion_id = ?',
  { replacements: [funcionId], type: QueryTypes.SELECT }
);

// Indicadores del dashboard (vista SQL de una sola fila)
const [dashboard] = await sequelize.query(
  'SELECT * FROM v_dashboard',
  { type: QueryTypes.SELECT }
);
```

### Vistas disponibles para el dashboard
`v_dashboard`, `v_ventas_por_pelicula`, `v_ventas_por_sala`,
`v_ventas_por_dia`, `v_asientos_disponibles`.
(Ver detalle en `database/README.md`.)

## 5. Registrar una compra (transacción recomendada)

Una compra crea 1 fila en `compras` y N filas en `boletos`. Hazlo dentro de
una transacción para que, si algo falla, no queden datos a medias:

```js
await sequelize.transaction(async (t) => {
  const compra = await Compra.create({ /* ...datos... */ }, { transaction: t });
  for (const asientoId of asientosSeleccionados) {
    await Boleto.create({
      compra_id:  compra.id,
      funcion_id: funcionId,
      asiento_id: asientoId,
      folio:      `${compra.codigo}-${asientoId}`,
    }, { transaction: t });
  }
});
```

> El índice `UNIQUE(funcion_id, asiento_id)` en `boletos` impide vender el
> mismo asiento dos veces en la misma función: si dos personas eligen el mismo
> asiento, la segunda compra fallará automáticamente.

## 6. Usuarios de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@cinemax.com` | `123456` | administrador |
| `usuario@cinemax.com` | `123456` | cliente (con membresía) |

## 7. Comandos útiles de Docker

```bash
docker compose up -d      # levantar la BD
docker compose down       # detener (conserva los datos)
docker compose down -v    # detener y BORRAR datos (recarga cinemax.sql al subir)
```

## 8. Variables de entorno (`.env`)

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PORT` | Puerto del servidor Express | `4000` |
| `DB_HOST` / `DB_PORT` | Host y puerto de MySQL | `localhost` / `3306` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Credenciales de la BD | `cinemax_db` / `cinemax_user` / `cinemax_pass` |
| `JWT_SECRET` | Clave para firmar los tokens JWT | *(cámbiala)* |
| `JWT_EXPIRES_IN` | Duración del token | `8h` |
