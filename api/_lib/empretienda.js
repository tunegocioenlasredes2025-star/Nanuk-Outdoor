// Lee la página de un producto de la tienda de Empretienda de Nanuk y devuelve sus datos.
// La usan la función /api/empretienda (panel) y scripts/sincronizar.js (actualización diaria).
// Empretienda no tiene API: los datos salen de las variables que la página trae para su carrito
// (s_producto, stock, imagenes, p_nombre, transfer_discount).

const TIENDA = 'nanukoutdoor.empretienda.com.ar';

function linkValido(link) {
  let u;
  try { u = new URL(String(link).trim()); } catch (e) { return null; }
  if (u.hostname !== TIENDA || u.pathname.length < 2) return null;
  return 'https://' + TIENDA + u.pathname.replace(/\/+$/, '');
}

// Toma el valor JSON de `var nombre = ...;` contando llaves/corchetes y respetando strings.
function leerVar(html, nombre) {
  const m = new RegExp('var\\s+' + nombre + '\\s*=\\s*').exec(html);
  if (!m) return undefined;
  let i = m.index + m[0].length;
  const ini = i, abre = html[i];
  if (abre !== '{' && abre !== '[' && abre !== '"') {
    const fin = html.indexOf(';', i);
    try { return JSON.parse(html.slice(i, fin).trim()); } catch (e) { return undefined; }
  }
  let nivel = 0, enStr = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (enStr) { if (c === '\\') i++; else if (c === '"') { enStr = false; if (abre === '"') { i++; break; } } continue; }
    if (c === '"') { enStr = true; continue; }
    if (c === '{' || c === '[') nivel++;
    else if (c === '}' || c === ']') { nivel--; if (nivel === 0) { i++; break; } }
  }
  try { return JSON.parse(html.slice(ini, i)); } catch (e) { return undefined; }
}

function meta(html, prop) {
  const m = new RegExp('property="' + prop + '"\\s+content="([^"]*)"').exec(html);
  return m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim() : '';
}

function unicos(lista) { return lista.filter((v, i) => v && lista.indexOf(v) === i); }

function parsear(html, url) {
  const prod = leerVar(html, 's_producto');
  const nombre = leerVar(html, 'p_nombre');
  if (!prod || !nombre) return null;
  const stock = leerVar(html, 'stock') || [];
  const imgs = leerVar(html, 'imagenes') || [];
  const transfer = leerVar(html, 'transfer_discount');

  const variantes = stock.map(s => {
    const attr = {};
    (s.valoratributo || []).forEach(a => { attr[String(a.at_nombre || '').toLowerCase()] = a.valor && a.valor.vat_valor; });
    return { talle: attr.talle || '', color: attr.color || '', disponible: !!(s.s_ilimitado || s.s_cantidad > 0) };
  });
  const conStock = variantes.filter(v => v.disponible);
  const principal = leerVar(html, 'i_link_principal') || meta(html, 'og:image');
  const fotos = unicos([principal].concat(imgs.map(im => im && (im.i_link || im.link || '')).filter(Boolean)));

  return {
    url,
    nombre: String(nombre).trim(),
    precio: Number(prod.precio) || 0,
    precioAnterior: Number(prod.precio_anterior) || 0,
    transfer: typeof transfer === 'number' ? transfer : 0,
    stock: !!prod.stock,
    talles: unicos(conStock.map(v => v.talle)),
    colores: unicos(conStock.map(v => v.color)),
    img: principal,
    fotos,
    descripcion: meta(html, 'og:description')
  };
}

// Devuelve { ok:true, producto } | { ok:false, motivo:'link'|'no-existe'|'no-es-producto'|'red' }
async function leerProducto(link) {
  const url = linkValido(link);
  if (!url) return { ok: false, motivo: 'link' };
  let r;
  try {
    r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (NanukWeb)' }, redirect: 'follow' });
  } catch (e) { return { ok: false, motivo: 'red' }; }
  if (r.status === 404) return { ok: false, motivo: 'no-existe' };
  if (!r.ok) return { ok: false, motivo: 'red' };
  const p = parsear(await r.text(), url);
  return p ? { ok: true, producto: p } : { ok: false, motivo: 'no-es-producto' };
}

// Categoría sugerida por nombre (la misma lógica con la que se armó el catálogo inicial)
function sugerirCategoria(n) {
  n = n.toUpperCase();
  if (n.includes('GIFT')) return 'giftcard';
  if (n.includes('CALZADO') || n.includes('BOTA') || n.includes('ZAPATILLA')) return 'calzado';
  if (n.includes('TERMIC') || n.includes('TÉRMIC')) return 'termicas';
  if (n.includes('CHALECO')) return 'chalecos';
  if (/^(CAMPERA|PLUMA|PARKA|JACKET)/.test(n)) return 'camperas';
  if (/^(BUZO|POLAR)/.test(n)) return 'buzos';
  if (/^(PANTAL|CALZA)/.test(n)) return 'pantalones';
  if (/^(CAPRY|MUSCULOSA)/.test(n)) return 'fitness';
  return 'accesorios';
}

module.exports = { leerProducto, parsear, linkValido, sugerirCategoria, TIENDA };
