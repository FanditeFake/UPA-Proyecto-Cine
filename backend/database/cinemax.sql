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

-- Fija la codificación de la sesión a utf8mb4 para que los acentos y la ñ
-- se carguen correctamente sin importar el cliente que ejecute el script.
SET NAMES utf8mb4;

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
  poster_url     VARCHAR(500)   NULL COMMENT 'URL del póster; NULL usa placeholder en el frontend',
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
--  Películas (catálogo de la cartelera)
-- -------------------------------------------------------------
INSERT INTO peliculas (titulo, sinopsis, duracion, clasificacion, genero, precio) VALUES
('Spider-Man: Brand New Day',
 'Peter Parker enfrenta una nueva etapa como héroe cuando amenazas inéditas ponen a prueba su identidad.',
 130, 'B', 'Acción / Aventura', 110.00),
('Avatar: Fuego y Cenizas',
 'Jake y Neytiri conocen a nuevos clanes Na''vi mientras el fuego amenaza el equilibrio de Pandora.',
 190, 'B', 'Ciencia ficción / Aventura', 120.00),
('Jurassic World: Rebirth',
 'Un equipo se adentra en una isla remota donde los dinosaurios más peligrosos aún dominan.',
 134, 'B', 'Ciencia ficción / Aventura', 110.00),
('Dune: Parte Dos',
 'Paul Atreides se une a los Fremen para vengar a su familia y liberar Arrakis.',
 166, 'B', 'Ciencia ficción / Aventura', 100.00),
('Oppenheimer',
 'La historia del físico que dirigió el desarrollo de la primera bomba atómica.',
 180, 'B15', 'Drama / Historia', 95.00),
('Intensa-Mente 2',
 'Riley entra en la adolescencia y nuevas emociones llegan a su mente.',
 96, 'AA', 'Animación / Familiar', 85.00),
('Deadpool & Wolverine',
 'Dos antihéroes unen fuerzas en una aventura tan violenta como cómica.',
 128, 'C', 'Acción / Comedia', 110.00),
('El Planeta de los Simios: Nuevo Reino',
 'Generaciones después, un joven simio cuestiona todo lo que conoce sobre el pasado.',
 145, 'B', 'Ciencia ficción / Aventura', 95.00),
('Kung Fu Panda 4',
 'Po debe encontrar y entrenar al próximo Guerrero Dragón.',
 94, 'AA', 'Animación / Familiar', 80.00),
('Godzilla y Kong: El Nuevo Imperio',
 'Los dos titanes se enfrentan a una amenaza colosal escondida en la Tierra.',
 115, 'B', 'Acción / Ciencia ficción', 100.00),
('Bad Boys: Hasta la Muerte',
 'Los detectives Mike y Marcus limpian el nombre de su capitán caído.',
 115, 'B15', 'Acción / Comedia', 95.00),
('Rivales',
 'Un triángulo amoroso se tensa dentro y fuera de las canchas de tenis.',
 131, 'C', 'Drama / Romance', 90.00);

-- -------------------------------------------------------------
--  Pósters de las películas (imágenes de Wikipedia).
--  Si una película no tuviera poster_url, el frontend le genera
--  un cartel placeholder con la marca CineMax.
-- -------------------------------------------------------------
UPDATE peliculas SET poster_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Spider-Man_Brand_New_Day_poster.jpg/250px-Spider-Man_Brand_New_Day_poster.jpg' WHERE titulo = 'Spider-Man: Brand New Day';
UPDATE peliculas SET poster_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/9/95/Avatar_Fire_and_Ash_poster.jpeg/250px-Avatar_Fire_and_Ash_poster.jpeg'         WHERE titulo = 'Avatar: Fuego y Cenizas';
UPDATE peliculas SET poster_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a5/Jurassic_World_Rebirth_poster.jpg/250px-Jurassic_World_Rebirth_poster.jpg'       WHERE titulo = 'Jurassic World: Rebirth';
UPDATE peliculas SET poster_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/5/52/Dune_Part_Two_poster.jpeg/250px-Dune_Part_Two_poster.jpeg'                         WHERE titulo = 'Dune: Parte Dos';
UPDATE peliculas SET poster_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Oppenheimer_%28film%29.jpg/250px-Oppenheimer_%28film%29.jpg'                       WHERE titulo = 'Oppenheimer';
UPDATE peliculas SET poster_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f7/Inside_Out_2_poster.jpg/250px-Inside_Out_2_poster.jpg'                             WHERE titulo = 'Intensa-Mente 2';
UPDATE peliculas SET poster_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Deadpool_%26_Wolverine_poster.jpg/250px-Deadpool_%26_Wolverine_poster.jpg'         WHERE titulo = 'Deadpool & Wolverine';
UPDATE peliculas SET poster_url = 'https://upload.wikimedia.org/wikipedia/en/c/cf/Kingdom_of_the_Planet_of_the_Apes_poster.jpg'                                            WHERE titulo = 'El Planeta de los Simios: Nuevo Reino';
UPDATE peliculas SET poster_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7f/Kung_Fu_Panda_4_poster.jpg/250px-Kung_Fu_Panda_4_poster.jpg'                       WHERE titulo = 'Kung Fu Panda 4';
UPDATE peliculas SET poster_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/b/be/Godzilla_x_kong_the_new_empire_poster.jpg/250px-Godzilla_x_kong_the_new_empire_poster.jpg' WHERE titulo = 'Godzilla y Kong: El Nuevo Imperio';
UPDATE peliculas SET poster_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8b/Bad_Boys_Ride_or_Die_%282024%29_poster.jpg/250px-Bad_Boys_Ride_or_Die_%282024%29_poster.jpg' WHERE titulo = 'Bad Boys: Hasta la Muerte';
UPDATE peliculas SET poster_url = 'https://upload.wikimedia.org/wikipedia/en/b/b4/Challengers_2024_poster.jpeg'                                                            WHERE titulo = 'Rivales';

-- -------------------------------------------------------------
--  Salas (capacidad 20 = 4 filas x 5 asientos, como el frontend)
-- -------------------------------------------------------------
INSERT INTO salas (nombre, capacidad) VALUES
('Sala 1', 20),
('Sala 2', 20),
('Sala 3', 20),
('Sala 4', 20),
('Sala 5', 20),
('Sala 6', 20),
('Sala 7', 20),
('Sala 8', 20);

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

-- Salas 4 a 8 (mismo layout A-D x 1-5)
INSERT INTO asientos (sala_id, fila, numero, codigo) VALUES
-- Sala 4
(4,'A',1,'A1'),(4,'A',2,'A2'),(4,'A',3,'A3'),(4,'A',4,'A4'),(4,'A',5,'A5'),
(4,'B',1,'B1'),(4,'B',2,'B2'),(4,'B',3,'B3'),(4,'B',4,'B4'),(4,'B',5,'B5'),
(4,'C',1,'C1'),(4,'C',2,'C2'),(4,'C',3,'C3'),(4,'C',4,'C4'),(4,'C',5,'C5'),
(4,'D',1,'D1'),(4,'D',2,'D2'),(4,'D',3,'D3'),(4,'D',4,'D4'),(4,'D',5,'D5'),
-- Sala 5
(5,'A',1,'A1'),(5,'A',2,'A2'),(5,'A',3,'A3'),(5,'A',4,'A4'),(5,'A',5,'A5'),
(5,'B',1,'B1'),(5,'B',2,'B2'),(5,'B',3,'B3'),(5,'B',4,'B4'),(5,'B',5,'B5'),
(5,'C',1,'C1'),(5,'C',2,'C2'),(5,'C',3,'C3'),(5,'C',4,'C4'),(5,'C',5,'C5'),
(5,'D',1,'D1'),(5,'D',2,'D2'),(5,'D',3,'D3'),(5,'D',4,'D4'),(5,'D',5,'D5'),
-- Sala 6
(6,'A',1,'A1'),(6,'A',2,'A2'),(6,'A',3,'A3'),(6,'A',4,'A4'),(6,'A',5,'A5'),
(6,'B',1,'B1'),(6,'B',2,'B2'),(6,'B',3,'B3'),(6,'B',4,'B4'),(6,'B',5,'B5'),
(6,'C',1,'C1'),(6,'C',2,'C2'),(6,'C',3,'C3'),(6,'C',4,'C4'),(6,'C',5,'C5'),
(6,'D',1,'D1'),(6,'D',2,'D2'),(6,'D',3,'D3'),(6,'D',4,'D4'),(6,'D',5,'D5'),
-- Sala 7
(7,'A',1,'A1'),(7,'A',2,'A2'),(7,'A',3,'A3'),(7,'A',4,'A4'),(7,'A',5,'A5'),
(7,'B',1,'B1'),(7,'B',2,'B2'),(7,'B',3,'B3'),(7,'B',4,'B4'),(7,'B',5,'B5'),
(7,'C',1,'C1'),(7,'C',2,'C2'),(7,'C',3,'C3'),(7,'C',4,'C4'),(7,'C',5,'C5'),
(7,'D',1,'D1'),(7,'D',2,'D2'),(7,'D',3,'D3'),(7,'D',4,'D4'),(7,'D',5,'D5'),
-- Sala 8
(8,'A',1,'A1'),(8,'A',2,'A2'),(8,'A',3,'A3'),(8,'A',4,'A4'),(8,'A',5,'A5'),
(8,'B',1,'B1'),(8,'B',2,'B2'),(8,'B',3,'B3'),(8,'B',4,'B4'),(8,'B',5,'B5'),
(8,'C',1,'C1'),(8,'C',2,'C2'),(8,'C',3,'C3'),(8,'C',4,'C4'),(8,'C',5,'C5'),
(8,'D',1,'D1'),(8,'D',2,'D2'),(8,'D',3,'D3'),(8,'D',4,'D4'),(8,'D',5,'D5');

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
(3, 3, DATE_FORMAT(NOW() + INTERVAL 1 DAY, '%Y-%m-%d 20:00:00')),
-- Dune: Parte Dos (Sala 4)
(4, 4, DATE_FORMAT(NOW(), '%Y-%m-%d 16:30:00')),
(4, 4, DATE_FORMAT(NOW(), '%Y-%m-%d 20:30:00')),
-- Oppenheimer (Sala 5)
(5, 5, DATE_FORMAT(NOW(), '%Y-%m-%d 17:00:00')),
(5, 5, DATE_FORMAT(NOW() + INTERVAL 1 DAY, '%Y-%m-%d 19:00:00')),
-- Intensa-Mente 2 (Sala 6)
(6, 6, DATE_FORMAT(NOW(), '%Y-%m-%d 14:30:00')),
(6, 6, DATE_FORMAT(NOW(), '%Y-%m-%d 17:00:00')),
-- Deadpool & Wolverine (Sala 7)
(7, 7, DATE_FORMAT(NOW(), '%Y-%m-%d 18:30:00')),
(7, 7, DATE_FORMAT(NOW(), '%Y-%m-%d 21:30:00')),
-- El Planeta de los Simios (Sala 8)
(8, 8, DATE_FORMAT(NOW(), '%Y-%m-%d 15:00:00')),
(8, 8, DATE_FORMAT(NOW() + INTERVAL 1 DAY, '%Y-%m-%d 18:00:00')),
-- Kung Fu Panda 4 (Sala 4, mañana)
(9, 4, DATE_FORMAT(NOW() + INTERVAL 1 DAY, '%Y-%m-%d 13:00:00')),
(9, 4, DATE_FORMAT(NOW() + INTERVAL 1 DAY, '%Y-%m-%d 16:00:00')),
-- Godzilla y Kong (Sala 5, mañana)
(10, 5, DATE_FORMAT(NOW() + INTERVAL 1 DAY, '%Y-%m-%d 21:00:00')),
-- Bad Boys: Hasta la Muerte (Sala 6, mañana)
(11, 6, DATE_FORMAT(NOW() + INTERVAL 1 DAY, '%Y-%m-%d 20:00:00')),
-- Rivales (Sala 7, mañana)
(12, 7, DATE_FORMAT(NOW() + INTERVAL 1 DAY, '%Y-%m-%d 19:30:00'));

-- -------------------------------------------------------------
--  Compra de ejemplo (para que el dashboard no salga en ceros).
--  Cliente "Usuario Cliente" compra 2 boletos con membresia
--  para la función 1 (Spider-Man, Sala 1, 19:30).
--  Compra histórica: 85 x 2 = 170 subtotal; 20% desc = 34; total = 136.
-- -------------------------------------------------------------
INSERT INTO compras
  (codigo, usuario_id, funcion_id, cliente_nombre, cantidad, con_membresia, subtotal, descuento, total)
VALUES
  ('CMX-1001', 2, 1, 'Usuario Cliente', 2, 1, 170.00, 34.00, 136.00);

-- Boletos de esa compra: asientos A1 y A2 de la Sala 1 (ids 1 y 2)
INSERT INTO boletos (compra_id, funcion_id, asiento_id, folio, codigo_qr) VALUES
(1, 1, 1, 'CMX-1001-A1', 'CMX-1001|Spider-Man: Brand New Day|Sala 1|19:30|A1'),
(1, 1, 2, 'CMX-1001-A2', 'CMX-1001|Spider-Man: Brand New Day|Sala 1|19:30|A2');


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
