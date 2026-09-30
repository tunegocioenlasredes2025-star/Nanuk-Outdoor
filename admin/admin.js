(function () {
  var N = window.NANUK;
  var PIN_DEMO = '1234';
  var SYNC_CAMPOS = ['precio', 'precioAnterior', 'transfer', 'stock', 'talles', 'colores'];

  var datos = null;        // catálogo que se está editando
  var publicado = '';      // JSON de lo último publicado, para saber si hay cambios
  var traido = null;       // producto leído de Empretienda, antes de agregarlo
  var editando = null;

  function $(s) { return document.querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  var esc = N.esc, plata = N.plata;

  function toast(txt) {
    var t = $('#toast'); t.textContent = txt; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 3200);
  }
  function opciones(sel, lista, extra) {
    sel.innerHTML = (extra || '') + lista.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
  }
  function checksActs(cont, marcadas) {
    $$('label', cont).forEach(function (l) { l.remove(); });
    N.ACTS.forEach(function (a) {
      var l = document.createElement('label'); l.className = 'check';
      l.innerHTML = '<input type="checkbox" value="' + a[0] + '"' + (marcadas.indexOf(a[0]) >= 0 ? ' checked' : '') + '> ' + a[1];
      cont.appendChild(l);
    });
  }
  function actsMarcadas(cont) { return $$('input:checked', cont).map(function (i) { return i.value; }); }

  // ---------- ingreso ----------
  function entrar() {
    $('#login').hidden = true; $('#app').hidden = false;
    try { sessionStorage.setItem('nanuk-panel', '1'); } catch (e) {}
    iniciar();
  }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('#pin').value === PIN_DEMO) entrar(); else { $('#loginErr').hidden = false; $('#pin').select(); }
  });
  try { if (sessionStorage.getItem('nanuk-panel')) entrar(); } catch (e) {}

  // ---------- carga ----------
  function iniciar() {
    opciones($('#nCat'), N.CATS); opciones($('#eCat'), N.CATS);
    opciones($('#nPub'), N.PUBS); opciones($('#ePub'), N.PUBS);
    opciones($('#fCat'), N.CATS, '<option value="">Todas las categorías</option>');
    N.cargarCatalogo().then(function (res) {
      datos = res.datos; publicado = JSON.stringify(datos); pintar();
    }).catch(function () { $('#lista').innerHTML = '<li class="vacio">No se pudo cargar el catálogo.</li>'; });
  }

  function hayCambios() { return JSON.stringify(datos) !== publicado; }

  function pintar() {
    var ps = datos.productos;
    var vis = ps.filter(function (p) { return !p.oculto; }).length;
    $('#resumen').textContent = vis + ' visibles · ' + (ps.length - vis) + ' ocultos';
    var q = $('#buscar').value.trim().toLowerCase(), fc = $('#fCat').value, fe = $('#fEstado').value;
    var lista = ps.filter(function (p) {
      if (q && p.nombre.toLowerCase().indexOf(q) < 0) return false;
      if (fc && p.cat !== fc) return false;
      if (fe === 'visibles' && p.oculto) return false;
      if (fe === 'ocultos' && !p.oculto) return false;
      if (fe === 'sinstock' && p.stock !== false) return false;
      if (fe === 'destacados' && !p.destacado) return false;
      return true;
    });
    $('#lista').innerHTML = lista.length ? lista.map(fila).join('') : '<li class="vacio">No hay productos con ese filtro.</li>';
    var n = hayCambios();
    $('#pubBar').hidden = !n;
  }

  function fila(p) {
    var i = datos.productos.indexOf(p);
    var estado = p.oculto
      ? '<span class="tag tag--oc">' + (p.motivoOculto === 'borrado-en-empretienda' ? 'Borrado en Empretienda' : 'Oculto') + '</span>'
      : (p.stock === false ? '<span class="tag tag--sin">Sin stock</span>' : '');
    return '<li class="item' + (p.oculto ? ' item--oc' : '') + '" data-i="' + i + '">' +
      '<img src="' + esc(p.img) + '" alt="" loading="lazy" class="' + (p.foto === 'cover' ? 'cover' : '') + '">' +
      '<div class="item__txt"><strong>' + esc(p.nombre) + '</strong>' +
      '<span>' + N.etiqueta(N.CATS, p.cat) + ' · ' + plata(p.precio) + ' <em>(' + plata(N.precioTransf(p)) + ' transf.)</em></span>' +
      ((p.talles || []).length ? '<span class="item__t">Talles: ' + p.talles.map(esc).join(' · ') + '</span>' : '') +
      '<span>' + (p.destacado ? '<span class="tag tag--dest">★ Destacado</span>' : '') + estado + '</span></div>' +
      '<div class="item__acc">' +
      '<button class="ic' + (p.destacado ? ' on' : '') + '" data-acc="dest" title="Destacar" aria-label="Destacar">★</button>' +
      '<button class="b b--mini" data-acc="ver">' + (p.oculto ? 'Mostrar' : 'Ocultar') + '</button>' +
      '<button class="b b--mini" data-acc="edit">Editar</button>' +
      '<a class="b b--mini" href="' + esc(p.url) + '" target="_blank" rel="noopener">Empretienda</a>' +
      '<button class="b b--mini b--del" data-acc="del">Quitar</button>' +
      '</div></li>';
  }

  ['#buscar', '#fCat', '#fEstado'].forEach(function (s) { $(s).addEventListener('input', pintar); });

  $('#lista').addEventListener('click', function (e) {
    var b = e.target.closest('[data-acc]'); if (!b) return;
    var p = datos.productos[+b.closest('.item').getAttribute('data-i')];
    var acc = b.getAttribute('data-acc');
    if (acc === 'dest') p.destacado = !p.destacado || undefined;
    if (acc === 'ver') { if (p.oculto) { delete p.oculto; delete p.motivoOculto; } else { p.oculto = true; p.motivoOculto = 'manual'; } }
    if (acc === 'del') { if (!confirm('¿Quitar "' + p.nombre + '" de la web? En Empretienda sigue igual.')) return; datos.productos.splice(datos.productos.indexOf(p), 1); }
    if (acc === 'edit') { abrirEditor(p); return; }
    pintar();
  });

  // ---------- editar ----------
  function abrirEditor(p) {
    editando = p;
    $('#eNombre').value = p.nombre; $('#eCat').value = p.cat; $('#ePub').value = p.pub || 'unisex';
    $('#eFoto').value = p.foto || 'contain'; checksActs($('#eActs'), p.act || []);
    $('#edit').showModal();
  }
  $('#edit').addEventListener('close', function () {
    if ($('#edit').returnValue === 'ok' && editando) {
      editando.nombre = $('#eNombre').value.trim() || editando.nombre;
      editando.cat = $('#eCat').value; editando.pub = $('#ePub').value;
      editando.foto = $('#eFoto').value; editando.act = actsMarcadas($('#eActs'));
      pintar();
    }
    editando = null;
  });

  // ---------- agregar desde Empretienda ----------
  function lindo(n) {
    var minus = ['de', 'con', 'sin', 'y', 'para', 'el', 'la'];
    return n.toLowerCase().split(/\s+/).map(function (w, i) {
      if (/\d/.test(w) && w.length <= 8) return w.toUpperCase();
      if (i && minus.indexOf(w) >= 0) return w;
      if (w.length <= 2 && minus.indexOf(w) < 0) return w.toUpperCase(); // siglas: YH, MR, UV
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }
  function adivinarPub(n) { n = n.toUpperCase(); return /NIÑ|NINO|KIDS/.test(n) ? 'ninos' : /MUJER|DAMA/.test(n) ? 'mujer' : /HOMBRE/.test(n) ? 'hombre' : 'unisex'; }
  function adivinarActs(n, cat) {
    n = n.toUpperCase(); var a = [];
    if (['camperas', 'chalecos', 'termicas'].indexOf(cat) >= 0 || /PLUMA|PARKA|ANTIPARRA|GUANTE|GORRO|NIEVE|SKI|ESQU/.test(n)) a.push('nieve');
    if (['calzado', 'pantalones', 'buzos'].indexOf(cat) >= 0 || /MOCHILA|TREKKING/.test(n)) a.push('trekking');
    if (/TERMO|MATERO|CUBIERTO|BOTIQUIN|CORTAPLUMA|PINZA|LUZ|CARPA|BOLSA DE DORMIR|MOCHILA|LINTERNA/.test(n)) a.push('camping');
    if (cat === 'fitness') a.push('fitness');
    return a;
  }
  function slug(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function msg(txt, tipo) { var m = $('#pegarMsg'); m.textContent = txt; m.className = 'msg' + (tipo ? ' msg--' + tipo : ''); m.hidden = !txt; }

  $('#pegarForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var link = $('#link').value.trim().replace(/\/+$/, '');
    var ya = datos.productos.filter(function (p) { return p.url.replace(/\/+$/, '') === link; })[0];
    if (ya) { msg('Ese producto ya está en la web: "' + ya.nombre + '".', 'err'); return; }
    $('#traer').disabled = true; $('#traer').textContent = 'Buscando…'; msg(''); $('#nuevo').hidden = true;
    fetch('/api/empretienda?url=' + encodeURIComponent(link))
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r.ok) { msg(r.mensaje || 'No se pudo leer ese link.', 'err'); return; }
        traido = r.producto; mostrarNuevo(r.producto, r.categoria);
      })
      .catch(function () { msg('No se pudo conectar. Probá de nuevo.', 'err'); })
      .then(function () { $('#traer').disabled = false; $('#traer').textContent = 'Traer datos'; });
  });

  function mostrarNuevo(p, cat) {
    $('#nFoto').src = p.img; $('#nNombre').value = lindo(p.nombre);
    $('#nPrecios').innerHTML = '<span>' + plata(p.precio) + ' de lista</span><strong>' + plata(N.precioTransf(p)) + '</strong><small>con transferencia (' + p.transfer + '% off)</small>' +
      (p.stock ? '<span class="tag tag--ok">Con stock</span>' : '<span class="tag tag--sin">Sin stock</span>');
    $('#nTalles').textContent = [p.talles.length ? 'Talles: ' + p.talles.join(' · ') : '', p.colores.length ? 'Colores: ' + p.colores.join(' · ') : ''].filter(Boolean).join('   ');
    $('#nCat').value = cat; $('#nPub').value = adivinarPub(p.nombre);
    checksActs($('#nActs'), adivinarActs(p.nombre, cat));
    $('#nDest').checked = true;
    $('#nuevo').hidden = false;
    msg('Listo: revisá la categoría y agregalo.', 'ok');
  }
  // Fotos ambientadas y muy verticales (como las botas) quedan mejor llenando el cuadro
  function fotoSugerida(cat) {
    var im = $('#nFoto'), r = im.naturalWidth ? im.naturalHeight / im.naturalWidth : 1;
    return cat === 'calzado' || r > 1.6 ? 'cover' : 'contain';
  }
  $('#nCat').addEventListener('change', function () { checksActs($('#nActs'), adivinarActs(traido.nombre, $('#nCat').value)); });
  $('#nCancelar').addEventListener('click', function () { $('#nuevo').hidden = true; msg(''); traido = null; });
  $('#nAgregar').addEventListener('click', function () {
    var p = traido, nombre = $('#nNombre').value.trim() || lindo(p.nombre);
    var nuevo = {
      id: slug(nombre) + '-' + Date.now().toString(36), nombre: nombre, cat: $('#nCat').value, act: actsMarcadas($('#nActs')),
      pub: $('#nPub').value, precio: p.precio, img: p.img, foto: fotoSugerida($('#nCat').value), url: p.url,
      precioAnterior: p.precioAnterior, transfer: p.transfer, stock: p.stock, talles: p.talles, colores: p.colores
    };
    if ($('#nDest').checked) nuevo.destacado = true;
    datos.productos.unshift(nuevo);
    $('#nuevo').hidden = true; $('#link').value = ''; traido = null;
    msg('"' + nombre + '" agregado. Tocá Publicar para que aparezca en la web.', 'ok');
    $('#fEstado').value = ''; $('#fCat').value = ''; $('#buscar').value = '';
    pintar();
  });

  // ---------- revisar precios ahora ----------
  $('#sync').addEventListener('click', function () {
    var btn = this; btn.disabled = true;
    var cola = datos.productos.filter(function (p) { return p.url; }).slice(), total = cola.length, hechos = 0, cambios = [];
    $('#syncBox').hidden = false; $('#syncCambios').innerHTML = '';
    function paso() {
      $('#syncBar').style.width = Math.round(hechos / total * 100) + '%';
      $('#syncTxt').textContent = 'Revisando ' + hechos + ' de ' + total + ' productos en Empretienda…';
    }
    paso();
    function trabajar() {
      var p = cola.shift(); if (!p) return Promise.resolve();
      return fetch('/api/empretienda?url=' + encodeURIComponent(p.url)).then(function (r) { return r.json(); }).then(function (r) {
        if (r.ok) {
          var e = r.producto;
          if (p.precio !== e.precio) cambios.push(p.nombre + ': ' + plata(p.precio) + ' → ' + plata(e.precio));
          if (p.stock !== e.stock) cambios.push(p.nombre + ': ' + (e.stock ? 'volvió el stock' : 'se quedó sin stock'));
          if (JSON.stringify(p.talles || []) !== JSON.stringify(e.talles)) cambios.push(p.nombre + ': talles ahora ' + (e.talles.join(' · ') || 'ninguno'));
          SYNC_CAMPOS.forEach(function (k) { p[k] = e[k]; });
          if (p.oculto && p.motivoOculto === 'borrado-en-empretienda') { delete p.oculto; delete p.motivoOculto; }
        } else if (r.motivo === 'no-existe' && !p.oculto) {
          p.oculto = true; p.motivoOculto = 'borrado-en-empretienda';
          cambios.push(p.nombre + ': ya no está en Empretienda, se ocultó');
        }
      }).catch(function () {}).then(function () { hechos++; paso(); return trabajar(); });
    }
    Promise.all([trabajar(), trabajar(), trabajar(), trabajar()]).then(function () {
      $('#syncTxt').textContent = cambios.length ? cambios.length + ' cambios encontrados:' : 'Todo coincide con Empretienda. No hubo cambios.';
      $('#syncCambios').innerHTML = cambios.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
      btn.disabled = false; pintar();
    });
  });

  // ---------- publicar ----------
  $('#publicar').addEventListener('click', function () {
    datos.actualizado = new Date().toISOString();
    if (!N.guardarDemo(datos)) { toast('No se pudo guardar en este navegador.'); return; }
    publicado = JSON.stringify(datos); pintar();
    toast('Publicado. Abrí “Ver la web” para verlo.');
  });
  $('#descartar').addEventListener('click', function () {
    if (!confirm('¿Descartar los cambios sin publicar?')) return;
    datos = JSON.parse(publicado); pintar();
  });
  $('#restaurar').addEventListener('click', function () {
    if (!confirm('¿Borrar todo lo que hiciste en la demo y volver al catálogo original?')) return;
    N.borrarDemo();
    N.cargarCatalogo({ ignorarDemo: true }).then(function (res) { datos = res.datos; publicado = JSON.stringify(datos); pintar(); toast('Catálogo original restaurado.'); });
  });
  window.addEventListener('beforeunload', function (e) { if (datos && hayCambios()) { e.preventDefault(); e.returnValue = ''; } });
})();
