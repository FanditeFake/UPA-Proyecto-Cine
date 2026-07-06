/**
 * Script de prueba de la capa de datos.
 * Verifica que la conexión y los modelos funcionan contra la BD.
 *
 * Requisito: el contenedor MySQL debe estar corriendo (docker compose up -d).
 * Ejecutar:  node test-db.js
 */
const { probarConexion } = require('./config/db');
const { Pelicula, Funcion, Sala, Usuario, Boleto } = require('./models');

(async () => {
  // 1. Conexión
  const ok = await probarConexion();
  if (!ok) process.exit(1);

  // 2. Consulta simple: todas las películas
  const peliculas = await Pelicula.findAll();
  console.log(`\n🎬 Películas (${peliculas.length}):`);
  peliculas.forEach(p => console.log(`   - ${p.titulo} ($${p.precio})`));

  // 3. Consulta con relaciones: funciones con su película y sala
  const funciones = await Funcion.findAll({
    include: [
      { model: Pelicula, as: 'pelicula' },
      { model: Sala, as: 'sala' },
    ],
    limit: 3,
  });
  console.log(`\n🕐 Funciones (mostrando ${funciones.length}):`);
  funciones.forEach(f => {
    // horario se lee como texto "YYYY-MM-DD HH:mm:ss" (sin conversión de zona)
    console.log(`   - ${f.pelicula.titulo} en ${f.sala.nombre} @ ${f.horario}`);
  });

  // 4. Login de prueba (buscar usuario por correo)
  const admin = await Usuario.findOne({ where: { correo: 'admin@cinemax.com' } });
  console.log(`\n👤 Usuario encontrado: ${admin.nombre} (rol: ${admin.rol})`);

  await Pelicula.sequelize.close();
  console.log('\n✅ Todo funciona. Capa de datos lista.');
})();
