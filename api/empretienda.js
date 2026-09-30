// GET /api/empretienda?url=<link de un producto de nanukoutdoor.empretienda.com.ar>
// El panel pega el link y recibe nombre, precio, stock, talles, colores y fotos.
// Sólo acepta links de la tienda de Nanuk (no sirve para leer otras páginas).
const { leerProducto, sugerirCategoria } = require('./_lib/empretienda.js');

const MENSAJES = {
  'link': 'Ese link no es de la tienda de Nanuk en Empretienda.',
  'no-existe': 'Ese producto no existe en Empretienda (¿lo borraron o el link está incompleto?).',
  'no-es-producto': 'Ese link es de una categoría o de la portada. Abrí el producto y copiá el link de esa página.',
  'red': 'No se pudo conectar con Empretienda. Probá de nuevo en un rato.'
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const r = await leerProducto((req.query && req.query.url) || '');
  if (!r.ok) return res.status(r.motivo === 'red' ? 502 : 400).json({ ok: false, motivo: r.motivo, mensaje: MENSAJES[r.motivo] });
  res.status(200).json({ ok: true, producto: r.producto, categoria: sugerirCategoria(r.producto.nombre) });
};
