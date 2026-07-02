# Base de datos — CineMax

Parte de **Base de Datos** del proyecto UPA-Proyecto-Cine.
Motor: **MySQL 8** ejecutándose en **Docker**.

## Archivos

| Archivo | Descripción |
|---|---|
| `cinemax.sql` | Script completo: crea la BD, tablas, relaciones, datos semilla y vistas del dashboard. |
| `hashear.js` | Genera hashes bcrypt para las contraseñas de prueba. |
| `../docker-compose.yml` | Levanta el contenedor MySQL y carga `cinemax.sql` automáticamente. |
| `../.env.example` | Variables de entorno de ejemplo (copiar a `.env`). |

## Modelo de datos

```
usuarios ──< compras >── funciones ──> peliculas
                │             │
                │             └──> salas ──< asientos
                │
                └──< boletos >── asientos
```

- **usuarios**: clientes y administradores (columna `rol`). `membresia` = 20% de descuento.
- **peliculas / salas / asientos**: catálogo. Cada sala tiene 20 asientos (A–D × 1–5).
- **funciones**: una película en una sala a una hora.
- **compras**: cabecera de venta (código `CMX-XXXX`, subtotal, descuento, total).
- **boletos**: un asiento por fila; `UNIQUE(funcion_id, asiento_id)` evita vender el mismo asiento dos veces en la misma función.

### Disponibilidad de asientos
No existe una columna "ocupado" global: un asiento puede estar libre en una función
y ocupado en otra. La disponibilidad se calcula por función con la vista
`v_asientos_disponibles`.

## Vistas para el dashboard

| Vista | Para qué sirve |
|---|---|
| `v_dashboard` | Indicadores generales (ventas, boletos, descuentos, película más vendida). |
| `v_ventas_por_pelicula` | Tabla "resumen de películas". |
| `v_ventas_por_sala` | Ocupación / ingresos por sala. |
| `v_ventas_por_dia` | Datos para la gráfica de ventas por día. |
| `v_asientos_disponibles` | Asientos libres por función. |

## Cómo levantar la base de datos

Requisito: **Docker Desktop** corriendo.

```bash
cd backend
docker compose up -d          # crea el contenedor y carga cinemax.sql
```

Verificar que cargó:

```bash
docker exec -it cinemax_mysql mysql -ucinemax_user -pcinemax_pass cinemax_db -e "SHOW TABLES; SELECT * FROM v_dashboard;"
```

Para reiniciar desde cero (borra los datos y vuelve a cargar el script):

```bash
docker compose down -v
docker compose up -d
```

## Usuarios de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@cinemax.com` | `123456` | administrador |
| `usuario@cinemax.com` | `123456` | cliente (con membresía) |

> Las contraseñas se guardan como hash **bcrypt**. Si las cambias, regenera los
> hashes con `node database/hashear.js` y actualiza el `INSERT` en `cinemax.sql`.
