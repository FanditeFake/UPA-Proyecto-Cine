/**
 * Prueba de humo (smoke test) de la API CineMax.
 * Requisitos:
 *   1. Base de datos arriba:  docker compose up -d
 *   2. Servidor corriendo:    npm start   (en otra terminal)
 * Ejecutar:
 *   node test-api.js
 *
 * Valida el flujo completo: login, cartelera, asientos, compra, dashboard
 * y la protección de rutas de administrador.
 */
const BASE = process.env.BASE || 'http://localhost:4000';

let pasadas = 0, fallidas = 0;
function check(nombre, condicion, detalle = '') {
  if (condicion) { pasadas++; console.log(`  ✅ ${nombre}`); }
  else { fallidas++; console.log(`  ❌ ${nombre}  ${detalle}`); }
}

async function api(metodo, ruta, { token, body } = {}) {
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

(async () => {
  console.log(`\n🧪 Probando API en ${BASE}\n`);

  // 1. Salud
  const salud = await api('GET', '/');
  check('GET /  responde ok', salud.json.ok === true);

  // 2. Login admin y cliente
  const admin = await api('POST', '/api/auth/login', {
    body: { correo: 'admin@cinemax.com', password: '123456' },
  });
  check('Login admin', admin.status === 200 && !!admin.json.token, `status ${admin.status}`);
  check('Admin tiene rol administrador', admin.json.usuario?.rol === 'administrador');
  const tokenAdmin = admin.json.token;

  const cliente = await api('POST', '/api/auth/login', {
    body: { correo: 'usuario@cinemax.com', password: '123456' },
  });
  check('Login cliente', cliente.status === 200 && !!cliente.json.token, `status ${cliente.status}`);
  const tokenCliente = cliente.json.token;

  // 3. Login con contraseña incorrecta → 401
  const malo = await api('POST', '/api/auth/login', {
    body: { correo: 'admin@cinemax.com', password: 'incorrecta' },
  });
  check('Login con contraseña mala → 401', malo.status === 401);

  // 4. Cartelera pública
  const pelis = await api('GET', '/api/peliculas');
  check('GET /api/peliculas devuelve lista', Array.isArray(pelis.json.peliculas) && pelis.json.peliculas.length > 0);

  const funciones = await api('GET', '/api/funciones');
  check('GET /api/funciones devuelve cartelera', Array.isArray(funciones.json.funciones) && funciones.json.funciones.length > 0);
  const funcion = funciones.json.funciones[0];
  check('Cada función trae película y sala', !!funcion?.pelicula && !!funcion?.sala);

  // 5. Asientos de la función
  const asientos = await api('GET', `/api/funciones/${funcion.id}/asientos`);
  const libres = (asientos.json.asientos || []).filter(a => a.ocupado === 0);
  check('GET asientos devuelve disponibilidad', libres.length > 0, `libres: ${libres.length}`);

  // 6. Compra como cliente (2 asientos libres)
  const elegidos = libres.slice(0, 2).map(a => a.asiento_id);
  const compra = await api('POST', '/api/compras', {
    token: tokenCliente,
    body: { funcion_id: funcion.id, asientos: elegidos, cliente_nombre: 'Prueba Automática' },
  });
  check('POST /api/compras crea la venta', compra.status === 201 && !!compra.json.compra?.codigo, `status ${compra.status} ${compra.json.mensaje || ''}`);
  check('La compra genera boletos', (compra.json.compra?.boletos || []).length === 2);
  check('El cliente con membresía recibe descuento', Number(compra.json.compra?.descuento) > 0);

  // 7. Compra sin token → 401
  const sinToken = await api('POST', '/api/compras', {
    body: { funcion_id: funcion.id, asientos: [999999] },
  });
  check('Compra sin token → 401', sinToken.status === 401);

  // 8. Reintentar los MISMOS asientos → 409 (ya ocupados)
  const repetida = await api('POST', '/api/compras', {
    token: tokenCliente,
    body: { funcion_id: funcion.id, asientos: elegidos },
  });
  check('Comprar asiento ya ocupado → 409', repetida.status === 409, `status ${repetida.status}`);

  // 9. Mis compras
  const mias = await api('GET', '/api/compras/mias', { token: tokenCliente });
  check('GET /api/compras/mias lista las compras', Array.isArray(mias.json.compras) && mias.json.compras.length > 0);

  // 10. Dashboard como admin → 200
  const dash = await api('GET', '/api/admin/dashboard', { token: tokenAdmin });
  check('Dashboard admin → 200', dash.status === 200 && !!dash.json.indicadores);
  check('Dashboard trae ventas por película', Array.isArray(dash.json.porPelicula));

  // 10b. Gráficas listas para Chart.js
  const g = dash.json.graficas;
  check('Dashboard incluye graficas', !!g && !!g.ventasPorDia && !!g.ventasPorPelicula && !!g.ventasPorSala);
  check('graficas.ventasPorDia trae labels y datos', Array.isArray(g?.ventasPorDia?.labels) && Array.isArray(g?.ventasPorDia?.ingresos));
  const diasOrdenados = (g?.ventasPorDia?.labels || []);
  check('Los días de la gráfica están en formato YYYY-MM-DD', diasOrdenados.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d)), `ej: ${diasOrdenados[0]}`);
  check('Los días están en orden cronológico', JSON.stringify(diasOrdenados) === JSON.stringify([...diasOrdenados].sort()));

  // 10c. Ventas con filtro de fechas válido → 200
  const ventasFiltradas = await api('GET', '/api/admin/ventas?desde=2020-01-01&hasta=2100-12-31', { token: tokenAdmin });
  check('Ventas con rango válido → 200', ventasFiltradas.status === 200 && Array.isArray(ventasFiltradas.json.ventas));

  // 10d. Validaciones de fecha (no se confunde con fechas inválidas)
  const fechaInvalida = await api('GET', '/api/admin/ventas?desde=2026-13-40', { token: tokenAdmin });
  check('Fecha inexistente (2026-13-40) → 400', fechaInvalida.status === 400, `status ${fechaInvalida.status}`);

  const formatoMalo = await api('GET', '/api/admin/ventas?desde=06/07/2026', { token: tokenAdmin });
  check('Formato de fecha incorrecto → 400', formatoMalo.status === 400, `status ${formatoMalo.status}`);

  const rangoInvertido = await api('GET', '/api/admin/ventas?desde=2026-12-31&hasta=2026-01-01', { token: tokenAdmin });
  check('Rango invertido (desde > hasta) → 400', rangoInvertido.status === 400, `status ${rangoInvertido.status}`);

  // 11. Dashboard como cliente → 403
  const dashCliente = await api('GET', '/api/admin/dashboard', { token: tokenCliente });
  check('Dashboard con rol cliente → 403', dashCliente.status === 403, `status ${dashCliente.status}`);

  console.log(`\n📊 Resultado: ${pasadas} pasadas, ${fallidas} fallidas\n`);
  process.exit(fallidas === 0 ? 0 : 1);
})();
