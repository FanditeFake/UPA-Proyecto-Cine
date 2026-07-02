/**
 * Genera los hashes bcrypt para las contraseñas de los usuarios semilla.
 *
 * Úsalo si cambias las contraseñas de prueba o quieres regenerar los hashes:
 *
 *   cd backend
 *   npm install bcryptjs      (si aún no está instalado)
 *   node database/hashear.js
 *
 * Copia los hashes impresos y pégalos en el INSERT de usuarios en cinemax.sql.
 */
const bcrypt = require('bcryptjs');

const usuarios = [
  { correo: 'admin@cinemax.com',   plain: '123456' },
  { correo: 'usuario@cinemax.com', plain: '123456' },
];

(async () => {
  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.plain, 10);
    console.log(`\nCorreo  : ${u.correo}`);
    console.log(`Password: ${u.plain}`);
    console.log(`Hash    : ${hash}`);
  }
})();
