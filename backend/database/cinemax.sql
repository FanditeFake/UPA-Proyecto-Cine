-- =============================================================
--  CineMax -- Script de base de datos
--  Proyecto: UPA-Proyecto-Cine (Sistema de compra de boletos)
--  Motor: MySQL 8
--  Autor: Equipo CineMax (parte de Base de Datos)
--
--  Este script:
--    1. Crea la base de datos y todas las tablas con sus relaciones.
--    2. Inserta datos semilla alineados con el frontend (CineMax).
--    3. Crea vistas listas para el dashboard del administrador.
-- =============================================================

-- Crear y seleccionar la base de datos
CREATE DATABASE IF NOT EXISTS cinemax_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cinemax_db;

-- =============================================================
--  DESACTIVAR CLAVES FORÁNEAS durante la carga inicial
--  (permite hacer DROP TABLE en cualquier orden sin errores)
-- =============================================================
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================
--  TABLA: usuarios
--  Guarda tanto clientes como administradores (columna rol).
--  La contraseña se almacena como hash bcrypt (la genera el backend).
-- =============================================================
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
  id          INT           NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(100)  NOT NULL,
  correo      VARCHAR(150)  NOT NULL,
  contrasena  VARCHAR(255)  NOT NULL,   -- hash bcrypt generado por el backend
  rol         ENUM('cliente','administrador') NOT NULL DEFAULT 'cliente',
  membresia   TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1 = tiene membresia (20% descuento)',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLA: peliculas
-- =============================================================
DROP TABLE IF EXISTS peliculas;
CREATE TABLE peliculas (
  id             INT            NOT NULL AUTO_INCREMENT,
  titulo         VARCHAR(150)   NOT NULL,
  sinopsis       TEXT           NULL,
  duracion       SMALLINT       NOT NULL COMMENT 'duración en minutos',
  clasificacion  ENUM('AA','A','B','B15','C','D') NOT NULL DEFAULT 'B',
  genero         VARCHAR(80)    NOT NULL,
  precio         DECIMAL(8,2)   NOT NULL COMMENT 'precio base por boleto',
  activa         TINYINT(1)     NOT NULL DEFAULT 1,

  PRIMARY KEY (id),
  CONSTRAINT chk_precio   CHECK (precio > 0),
  CONSTRAINT chk_duracion CHECK (duracion > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLA: salas
-- =============================================================
DROP TABLE IF EXISTS salas;
CREATE TABLE salas (
  id         INT          NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(80)  NOT NULL,
  capacidad  SMALLINT     NOT NULL,

  PRIMARY KEY (id),
  CONSTRAINT chk_capacidad CHECK (capacidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLA: asientos
--  Un asiento pertenece a una sala (ej: A1, B4, D5).
--  NO tiene columna "estado" global: la disponibilidad se calcula
--  por función (un asiento puede estar libre en una función y
--  ocupado en otra de la misma sala). Ver vista v_asientos_disponibles.
-- =============================================================
DROP TABLE IF EXISTS asientos;
CREATE TABLE asientos (
  id       INT         NOT NULL AUTO_INCREMENT,
  sala_id  INT         NOT NULL,
  fila     CHAR(1)     NOT NULL COMMENT 'A, B, C, D',
  numero   TINYINT     NOT NULL COMMENT '1 a 5',
  codigo   VARCHAR(10) NOT NULL COMMENT 'ej: A1, B4, D5',

  PRIMARY KEY (id),
  UNIQUE KEY uq_sala_asiento (sala_id, codigo),
  CONSTRAINT fk_asiento_sala FOREIGN KEY (sala_id)
    REFERENCES salas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLA: funciones
--  Una función = una película proyectándose en una sala a una hora.
-- =============================================================
DROP TABLE IF EXISTS funciones;
CREATE TABLE funciones (
  id           INT       NOT NULL AUTO_INCREMENT,
  pelicula_id  INT       NOT NULL,
  sala_id      INT       NOT NULL,
  horario      DATETIME  NOT NULL,

  PRIMARY KEY (id),
  CONSTRAINT fk_funcion_pelicula FOREIGN KEY (pelicula_id)
    REFERENCES peliculas(id) ON DELETE CASCADE,
  CONSTRAINT fk_funcion_sala FOREIGN KEY (sala_id)
    REFERENCES salas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLA: compras
--  Cabecera de una venta. El detalle (asientos) va en boletos.
--  Guarda el desglose para reportes: subtotal, descuento, total.
-- =============================================================
DROP TABLE IF EXISTS compras;
CREATE TABLE compras (
  id             INT            NOT NULL AUTO_INCREMENT,
  codigo         VARCHAR(20)    NOT NULL COMMENT 'ej: CMX-1234',
  usuario_id     INT            NOT NULL,
  funcion_id     INT            NOT NULL,
  cliente_nombre VARCHAR(100)   NOT NULL COMMENT 'nombre capturado en la compra',
  cantidad       TINYINT        NOT NULL COMMENT 'entre 1 y 10',
  con_membresia  TINYINT(1)     NOT NULL DEFAULT 0,
  subtotal       DECIMAL(10,2)  NOT NULL,
  descuento      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  total          DECIMAL(10,2)  NOT NULL,
  fecha          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_codigo (codigo),
  CONSTRAINT chk_cantidad  CHECK (cantidad BETWEEN 1 AND 10),
  CONSTRAINT chk_subtotal  CHECK (subtotal >= 0),
  CONSTRAINT chk_total     CHECK (total >= 0),
  CONSTRAINT chk_descuento CHECK (descuento >= 0),
  CONSTRAINT fk_compra_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id),
  CONSTRAINT fk_compra_funcion FOREIGN KEY (funcion_id)
    REFERENCES funciones(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  TABLA: boletos
--  Un boleto = un asiento dentro de una compra.
--  Una compra de 3 boletos genera 3 filas aquí.
--  UNIQUE(funcion_id, asiento_id) impide vender el mismo asiento
--  dos veces en la misma función.
-- =============================================================
DROP TABLE IF EXISTS boletos;
CREATE TABLE boletos (
  id          INT          NOT NULL AUTO_INCREMENT,
  compra_id   INT          NOT NULL,
  funcion_id  INT          NOT NULL,
  asiento_id  INT          NOT NULL,
  folio       VARCHAR(60)  NOT NULL COMMENT 'identificador único del boleto',
  codigo_qr   TEXT         NULL COMMENT 'contenido del QR (folio + datos)',

  PRIMARY KEY (id),
  UNIQUE KEY uq_folio (folio),
  UNIQUE KEY uq_funcion_asiento (funcion_id, asiento_id),
  CONSTRAINT fk_boleto_compra FOREIGN KEY (compra_id)
    REFERENCES compras(id) ON DELETE CASCADE,
  CONSTRAINT fk_boleto_funcion FOREIGN KEY (funcion_id)
    REFERENCES funciones(id),
  CONSTRAINT fk_boleto_asiento FOREIGN KEY (asiento_id)
    REFERENCES asientos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
--  REACTIVAR CLAVES FORÁNEAS
-- =============================================================
SET FOREIGN_KEY_CHECKS = 1;


-- =============================================================
--  DATOS SEMILLA
-- =============================================================

-- -------------------------------------------------------------
--  Usuarios de prueba (coinciden con el frontend CineMax)
--  CONTRASEÑAS EN TEXTO CLARO (el backend las valida por hash):
--    admin@cinemax.com    ->  123456   (administrador)
--    usuario@cinemax.com  ->  123456   (cliente, con membresía)
--
--  Los hashes siguientes fueron generados con bcryptjs (cost 10)
--  para la contraseña "123456". Si necesitas regenerarlos:
--      node database/hashear.js
-- -------------------------------------------------------------
INSERT INTO usuarios (nombre, correo, contrasena, rol, membresia) VALUES
('Administrador CineMax',
 'admin@cinemax.com',
 '$2b$10$UlV.oUcPmlwOCm19bEcyjekSqkJA3wJx9PiVqFJuyl93qakCa95Fy',
 'administrador', 0),
('Usuario Cliente',
 'usuario@cinemax.com',
 '$2b$10$pinAgArRCG7x5Xcix2j1veZxq0yJfX4DFQ0PcHIN8p75QxOGhIM5e',
 'cliente', 1);

-- -------------------------------------------------------------
--  Películas (las 3 del dashboard + estrenos extra)
-- -------------------------------------------------------------
INSERT INTO peliculas (titulo, sinopsis, duracion, clasificacion, genero, precio) VALUES
('Guardianes del Código',
 'Un grupo de programadores debe salvar una ciudad digital antes de que el sistema colapse.',
 125, 'B', 'Ciencia ficción / Acción', 85.00),
('La Sala Perdida',
 'Una sala de cine abandonada esconde un secreto que altera la realidad de quien la visita.',
 118, 'B15', 'Suspenso / Terror', 85.00),
('Backend: El Origen',
 'La historia de cómo un servidor cambió el destino de toda una red.',
 140, 'A', 'Drama / Tecnología', 90.00);

-- -------------------------------------------------------------
--  Salas (capacidad 20 = 4 filas x 5 asientos, como el frontend)
-- -------------------------------------------------------------
INSERT INTO salas (nombre, capacidad) VALUES
('Sala 1', 20),
('Sala 2', 20),
('Sala 3', 20);

-- -------------------------------------------------------------
--  Asientos: filas A-D x numeros 1-5 para cada sala (20 c/u)
--  Sala 1 -> ids 1-20 | Sala 2 -> 21-40 | Sala 3 -> 41-60
-- -------------------------------------------------------------
INSERT INTO asientos (sala_id, fila, numero, codigo) VALUES
-- Sala 1
(1,'A',1,'A1'),(1,'A',2,'A2'),(1,'A',3,'A3'),(1,'A',4,'A4'),(1,'A',5,'A5'),
(1,'B',1,'B1'),(1,'B',2,'B2'),(1,'B',3,'B3'),(1,'B',4,'B4'),(1,'B',5,'B5'),
(1,'C',1,'C1'),(1,'C',2,'C2'),(1,'C',3,'C3'),(1,'C',4,'C4'),(1,'C',5,'C5'),
(1,'D',1,'D1'),(1,'D',2,'D2'),(1,'D',3,'D3'),(1,'D',4,'D4'),(1,'D',5,'D5'),
-- Sala 2
(2,'A',1,'A1'),(2,'A',2,'A2'),(2,'A',3,'A3'),(2,'A',4,'A4'),(2,'A',5,'A5'),
(2,'B',1,'B1'),(2,'B',2,'B2'),(2,'B',3,'B3'),(2,'B',4,'B4'),(2,'B',5,'B5'),
(2,'C',1,'C1'),(2,'C',2,'C2'),(2,'C',3,'C3'),(2,'C',4,'C4'),(2,'C',5,'C5'),
(2,'D',1,'D1'),(2,'D',2,'D2'),(2,'D',3,'D3'),(2,'D',4,'D4'),(2,'D',5,'D5'),
-- Sala 3
(3,'A',1,'A1'),(3,'A',2,'A2'),(3,'A',3,'A3'),(3,'A',4,'A4'),(3,'A',5,'A5'),
(3,'B',1,'B1'),(3,'B',2,'B2'),(3,'B',3,'B3'),(3,'B',4,'B4'),(3,'B',5,'B5'),
(3,'C',1,'C1'),(3,'C',2,'C2'),(3,'C',3,'C3'),(3,'C',4,'C4'),(3,'C',5,'C5'),
(3,'D',1,'D1'),(3,'D',2,'D2'),(3,'D',3,'D3'),(3,'D',4,'D4'),(3,'D',5,'D5');

-- -------------------------------------------------------------
--  Funciones
--  "Guardianes del Código" en Sala 1 a las 19:30 (como el frontend).
-- -------------------------------------------------------------
INSERT INTO funciones (pelicula_id, sala_id, horario) VALUES
-- Guardianes del Código (Sala 1)
(1, 1, DATE_FORMAT(NOW(), '%Y-%m-%d 19:30:00')),
(1, 1, DATE_FORMAT(NOW(), '%Y-%m-%d 16:00:00')),
(1, 1, DATE_FORMAT(NOW() + INTERVAL 1 DAY, '%Y-%m-%d 19:30:00')),
-- La Sala Perdida (Sala 2)
(2, 2, DATE_FORMAT(NOW(), '%Y-%m-%d 18:00:00')),
(2, 2, DATE_FORMAT(NOW(), '%Y-%m-%d 21:00:00')),
-- Backend: El Origen (Sala 3)
(3, 3, DATE_FORMAT(NOW(), '%Y-%m-%d 17:30:00')),
(3, 3, DATE_FORMAT(NOW() + INTERVAL 1 DAY, '%Y-%m-%d 20:00:00'));

-- -------------------------------------------------------------
--  Compra de ejemplo (para que el dashboard no salga en ceros).
--  Cliente "Usuario Cliente" compra 2 boletos con membresia
--  para la función 1 (Guardianes, Sala 1, 19:30).
--  Precio 85 x 2 = 170 subtotal; 20% desc = 34; total = 136.
-- -------------------------------------------------------------
INSERT INTO compras
  (codigo, usuario_id, funcion_id, cliente_nombre, cantidad, con_membresia, subtotal, descuento, total)
VALUES
  ('CMX-1001', 2, 1, 'Usuario Cliente', 2, 1, 170.00, 34.00, 136.00);

-- Boletos de esa compra: asientos A1 y A2 de la Sala 1 (ids 1 y 2)
INSERT INTO boletos (compra_id, funcion_id, asiento_id, folio, codigo_qr) VALUES
(1, 1, 1, 'CMX-1001-A1', 'CMX-1001|Guardianes del Código|Sala 1|19:30|A1'),
(1, 1, 2, 'CMX-1001-A2', 'CMX-1001|Guardianes del Código|Sala 1|19:30|A2');


-- =============================================================
--  VISTAS ÚTILES PARA EL DASHBOARD DEL ADMINISTRADOR
-- =============================================================

-- Vista: asientos disponibles por función
-- (todos los asientos de la sala de la función que NO tienen boleto)
CREATE OR REPLACE VIEW v_asientos_disponibles AS
SELECT
  f.id      AS funcion_id,
  a.id      AS asiento_id,
  a.codigo  AS asiento,
  s.id      AS sala_id,
  s.nombre  AS sala
FROM funciones f
JOIN asientos a ON a.sala_id = f.sala_id
LEFT JOIN boletos b
  ON b.funcion_id = f.id AND b.asiento_id = a.id
JOIN salas s ON s.id = f.sala_id
WHERE b.id IS NULL;

-- Vista: resumen de ventas por película
CREATE OR REPLACE VIEW v_ventas_por_pelicula AS
SELECT
  p.id                       AS pelicula_id,
  p.titulo                   AS pelicula,
  COUNT(DISTINCT c.id)       AS num_compras,
  COALESCE(SUM(c.cantidad),0) AS boletos_vendidos,
  COALESCE(SUM(c.total),0)   AS ingresos_totales
FROM peliculas p
LEFT JOIN funciones f ON f.pelicula_id = p.id
LEFT JOIN compras   c ON c.funcion_id  = f.id
GROUP BY p.id, p.titulo
ORDER BY boletos_vendidos DESC;

-- Vista: resumen de ventas por sala
CREATE OR REPLACE VIEW v_ventas_por_sala AS
SELECT
  s.id                       AS sala_id,
  s.nombre                   AS sala,
  COALESCE(SUM(c.cantidad),0) AS boletos_vendidos,
  COALESCE(SUM(c.total),0)   AS ingresos_totales
FROM salas s
LEFT JOIN funciones f ON f.sala_id    = s.id
LEFT JOIN compras   c ON c.funcion_id = f.id
GROUP BY s.id, s.nombre;

-- Vista: ventas por día (para la gráfica del dashboard)
CREATE OR REPLACE VIEW v_ventas_por_dia AS
SELECT
  DATE(c.fecha)     AS dia,
  COUNT(c.id)       AS total_compras,
  SUM(c.cantidad)   AS total_boletos,
  SUM(c.total)      AS total_ingresos,
  SUM(c.descuento)  AS total_descuentos
FROM compras c
GROUP BY DATE(c.fecha)
ORDER BY dia DESC;

-- Vista: indicadores generales del dashboard (una sola fila)
CREATE OR REPLACE VIEW v_dashboard AS
SELECT
  (SELECT COALESCE(SUM(total),0)     FROM compras)                        AS ventas_totales,
  (SELECT COALESCE(SUM(cantidad),0)  FROM compras)                        AS boletos_vendidos,
  (SELECT COALESCE(SUM(descuento),0) FROM compras)                        AS descuentos_aplicados,
  (SELECT COUNT(*) FROM usuarios WHERE rol = 'cliente')                   AS total_clientes,
  (SELECT COUNT(*) FROM compras WHERE con_membresia = 1)                  AS compras_con_membresia,
  (SELECT COUNT(*) FROM compras WHERE con_membresia = 0)                  AS compras_sin_membresia,
  (SELECT p.pelicula
     FROM v_ventas_por_pelicula p
     ORDER BY p.boletos_vendidos DESC
     LIMIT 1)                                                             AS pelicula_mas_vendida;

-- =============================================================
--  FIN DEL SCRIPT
-- =============================================================
