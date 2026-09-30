// Actualiza data/productos.json con lo que hay hoy en Empretienda: precio, % de transferencia,
// stock, talles y colores. Lo corre GitHub Actions todos los días (.github/workflows/sincronizar.yml)
// y se puede correr a mano: node scripts/sincronizar.js
// - El nombre, la categoría y la foto que se eligieron en el panel NO se tocan.
// - Si Empretienda responde 404 (producto borrado) se oculta de la web; si vuelve, reaparece.
// - Si hay un error de red, ese producto se deja como estaba.
const fs = require('fs');
const path = require('path');
const { leerProducto } = require('../api/_lib/empretienda.js');

const ARCHIVO = path.join(__dirname, '..', 'data', 'productos.json');
const SINCRONIZABLES = ['precio', 'precioAnterior', 'transfer', 'stock', 'talles', 'colores'];

async function main() {
  const datos = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
  const cambios = [];
  const cola = datos.productos.filter(p => p.url);

  async function trabajar() {
    while (cola.length) {
      const p = cola.shift();
      const r = await leerProducto(p.url);
      if (r.ok) {
        SINCRONIZABLES.forEach(k => {
          if (JSON.stringify(p[k]) !== JSON.stringify(r.producto[k])) {
            if (k === 'precio') cambios.push(p.nombre + ': precio ' + p.precio + ' → ' + r.producto.precio);
            if (k === 'stock') cambios.push(p.nombre + ': ' + (r.producto.stock ? 'volvió el stock' : 'sin stock'));
            p[k] = r.producto[k];
            p._cambio = true;
          }
        });
        if (p.oculto && p.motivoOculto === 'borrado-en-empretienda') {
          delete p.oculto; delete p.motivoOculto; p._cambio = true;
          cambios.push(p.nombre + ': volvió a Empretienda, se muestra de nuevo');
        }
      } else if (r.motivo === 'no-existe' && !p.oculto) {
        p.oculto = true; p.motivoOculto = 'borrado-en-empretienda'; p._cambio = true;
        cambios.push(p.nombre + ': ya no existe en Empretienda, se ocultó');
      } else if (r.motivo !== 'no-existe') {
        console.warn('No se pudo leer', p.url, '(' + r.motivo + ')');
      }
      await new Promise(res => setTimeout(res, 250));
    }
  }
  await Promise.all([trabajar(), trabajar(), trabajar(), trabajar()]);

  const hubo = datos.productos.some(p => p._cambio);
  datos.productos.forEach(p => delete p._cambio);
  if (hubo) {
    datos.actualizado = new Date().toISOString();
    fs.writeFileSync(ARCHIVO, JSON.stringify(datos, null, 1) + '\n');
  }
  console.log(hubo ? cambios.length + ' cambios:\n' + cambios.join('\n') : 'Sin cambios: la web ya coincide con Empretienda.');
}

main().catch(e => { console.error(e); process.exit(1); });
