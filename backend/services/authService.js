/**
 * Lógica de negocio de autenticación: registro y login.
 */
const bcrypt = require('bcryptjs');
const { Usuario } = require('../models');
const { firmarToken } = require('../utils/jwt');
const { ErrorApp } = require('../utils/errores');

/** Quita la contraseña antes de devolver el usuario al cliente. */
function usuarioPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    rol: u.rol,
    membresia: !!u.membresia,
  };
}

/**
 * Registra un nuevo usuario (rol cliente por defecto).
 */
async function registrar({ nombre, correo, password, membresia = false }) {
  if (!nombre || !correo || !password) {
    throw new ErrorApp('Nombre, correo y contraseña son obligatorios', 400);
  }

  const existe = await Usuario.findOne({ where: { correo } });
  if (existe) {
    throw new ErrorApp('El correo ya está registrado', 409);
  }

  const hash = await bcrypt.hash(password, 10);
  const usuario = await Usuario.create({
    nombre,
    correo,
    contrasena: hash,
    rol: 'cliente',
    membresia: !!membresia,
  });

  const token = firmarToken({ id: usuario.id, correo: usuario.correo, rol: usuario.rol });
  return { usuario: usuarioPublico(usuario), token };
}

/**
 * Valida credenciales y devuelve token + datos del usuario.
 */
async function login({ correo, password }) {
  if (!correo || !password) {
    throw new ErrorApp('Correo y contraseña son obligatorios', 400);
  }

  const usuario = await Usuario.findOne({ where: { correo } });
  if (!usuario) {
    throw new ErrorApp('Credenciales incorrectas', 401);
  }

  const valido = await bcrypt.compare(password, usuario.contrasena);
  if (!valido) {
    throw new ErrorApp('Credenciales incorrectas', 401);
  }

  const token = firmarToken({ id: usuario.id, correo: usuario.correo, rol: usuario.rol });
  return { usuario: usuarioPublico(usuario), token };
}

/**
 * Devuelve el perfil del usuario autenticado (por id del token).
 */
async function obtenerPerfil(id) {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new ErrorApp('Usuario no encontrado', 404);
  return usuarioPublico(usuario);
}

module.exports = { registrar, login, obtenerPerfil, usuarioPublico };
