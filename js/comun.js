// Lo que comparten la web y el panel /admin.
(function () {
  var DEMO_KEY = 'nanuk-demo-catalogo';

  var CATS = [
    ['camperas', 'Camperas'], ['chalecos', 'Chalecos'], ['buzos', 'Buzos y polares'],
    ['termicas', 'Térmicas'], ['pantalones', 'Pantalones y calzas'], ['calzado', 'Calzado'],
    ['accesorios', 'Accesorios'], ['fitness', 'Fitness'], ['giftcard', 'Gift card']
  ];
  var ACTS = [['nieve', 'Nieve y esquí'], ['trekking', 'Trekking y montaña'], ['camping', 'Camping'], ['fitness', 'Fitness']];
  var PUBS = [['unisex', 'Unisex'], ['mujer', 'Mujer'], ['hombre', 'Hombre'], ['ninos', 'Niños']];

  function leerDemo() {
    try { var d = JSON.parse(localStorage.getItem(DEMO_KEY)); return d && d.productos ? d : null; } catch (e) { return null; }
  }
  function guardarDemo(datos) {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(datos)); return true; } catch (e) { return false; }
  }
  function borrarDemo() { try { localStorage.removeItem(DEMO_KEY); } catch (e) {} }

  // El catálogo publicado vive en /data/productos.json. En la demo, lo que se edita en el panel
  // se guarda en este navegador y pisa al publicado (sólo lo ve quien lo editó).
  function cargarCatalogo(opts) {
    opts = opts || {};
    var demo = opts.ignorarDemo ? null : leerDemo();
    if (demo) return Promise.resolve({ datos: demo, demo: true });
    return fetch('/data/productos.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('catalogo'); return r.json(); })
      .then(function (d) { return { datos: d, demo: false }; });
  }

  function precioTransf(p) { return p.precio * (1 - (p.transfer == null ? 21 : p.transfer) / 100); }

  window.NANUK = {
    WA: '5491156624897', CATS: CATS, ACTS: ACTS, PUBS: PUBS,
    etiqueta: function (lista, k) { for (var i = 0; i < lista.length; i++) if (lista[i][0] === k) return lista[i][1]; return k; },
    cargarCatalogo: cargarCatalogo, leerDemo: leerDemo, guardarDemo: guardarDemo, borrarDemo: borrarDemo,
    precioTransf: precioTransf,
    plata: function (n) { return '$' + Math.round(n).toLocaleString('es-AR'); },
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  };
})();
