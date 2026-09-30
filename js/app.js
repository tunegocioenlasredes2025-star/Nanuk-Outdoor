(function () {
  var N = window.NANUK;
  var WA = N.WA;
  var POR_PAGINA = 12;
  var DESTACADOS = ['camperas', 'calzado', 'chalecos', 'buzos', 'termicas', 'pantalones', 'accesorios', 'fitness', 'giftcard'];
  var ACTS = { nieve: 'nieve y esquí', trekking: 'trekking y montaña', camping: 'camping', fitness: 'fitness' };
  var ETIQ = {}; N.CATS.forEach(function (c) { ETIQ[c[0]] = c[1]; });
  var estado = { cat: '', act: '', q: '', pub: '', orden: '', ver: POR_PAGINA };

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  var plata = N.plata, esc = N.esc;
  function waLink(txt) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(txt); }
  function sinTildes(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  // links de WhatsApp con mensaje
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-wa]');
    if (!a) return;
    e.preventDefault();
    window.open(waLink(a.getAttribute('data-wa')), '_blank', 'noopener');
  });

  // menú mobile
  var burger = $('#burger'), nav = $('#nav');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  });
  $$('#nav a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); burger.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }); });

  // catálogo: se carga de /data/productos.json (o de los cambios del panel en modo demo)
  var P = [];
  var chips = $('#chips');

  function destacar(a, b) {
    return (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || DESTACADOS.indexOf(a.cat) - DESTACADOS.indexOf(b.cat) || P.indexOf(a) - P.indexOf(b);
  }

  function filtrados() {
    var q = sinTildes(estado.q.trim());
    var r = P.filter(function (p) {
      if (estado.cat && p.cat !== estado.cat) return false;
      if (estado.act && (p.act || []).indexOf(estado.act) < 0) return false;
      if (estado.pub && p.pub !== estado.pub && p.pub !== 'unisex') return false;
      if (q && sinTildes(p.nombre + ' ' + ETIQ[p.cat] + ' ' + (p.colores || []).join(' ')).indexOf(q) < 0) return false;
      return true;
    });
    if (!estado.orden) r.sort(destacar);
    if (estado.orden === 'asc') r.sort(function (a, b) { return a.precio - b.precio; });
    if (estado.orden === 'desc') r.sort(function (a, b) { return b.precio - a.precio; });
    return r;
  }

  function tarjeta(p) {
    var hay = p.stock !== false;
    var talles = (p.talles || []).length ? '<p class="prod__talles">Talles: ' + p.talles.map(esc).join(' · ') + '</p>' : '';
    var comprar = hay
      ? '<a class="btn btn--primary" href="' + esc(p.url) + '" target="_blank" rel="noopener">Comprar</a>'
      : '<a class="btn btn--ghost" href="#" data-wa="Hola Nanuk! Vi que ' + esc(p.nombre) + ' está sin stock en la web. ¿Me avisan cuando vuelva?">Avisame</a>';
    return '<article class="prod' + (hay ? '' : ' prod--agotado') + '">' +
      '<div class="prod__img"><span class="prod__tag">' + ETIQ[p.cat] + '</span>' +
      (hay ? '' : '<span class="prod__sin">Sin stock online</span>') +
      (p.destacado && hay ? '<span class="prod__nuevo">Destacado</span>' : '') +
      '<img src="' + esc(p.img) + '" alt="' + esc(p.nombre) + '" loading="lazy"' + (p.foto === 'cover' ? ' class="cover"' : '') + '></div>' +
      '<div class="prod__body"><h3>' + esc(p.nombre) + '</h3>' + talles +
      '<div class="prod__price">' + (p.precioAnterior > p.precio ? '<span class="prod__antes">' + plata(p.precioAnterior) + '</span> ' : '') +
      '<span class="prod__list">' + plata(p.precio) + ' de lista</span>' +
      '<span class="prod__tr">' + plata(N.precioTransf(p)) + ' <small>con transferencia</small></span></div>' +
      '<div class="prod__cta">' + comprar +
      '<a class="btn btn--wa" href="#" aria-label="Consultar por WhatsApp" data-wa="Hola Nanuk! Quería consultar por: ' + esc(p.nombre) + ' (' + plata(p.precio) + '). ¿Qué talles tienen?"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-wa"/></svg></a></div>' +
      '</div></article>';
  }

  function pintarChips() {
    chips.innerHTML = [['', 'Todo']].concat(N.CATS).map(function (c) {
      var n = c[0] ? P.filter(function (p) { return p.cat === c[0]; }).length : P.length;
      if (c[0] && !n) return '';
      return '<button class="chip" role="tab" data-chip="' + c[0] + '" aria-selected="' + (c[0] === estado.cat) + '">' + c[1] + '<span>' + n + '</span></button>';
    }).join('');
  }

  function render() {
    var r = filtrados();
    $('#grid').innerHTML = r.slice(0, estado.ver).map(tarjeta).join('');
    $('#empty').hidden = r.length > 0;
    $('#more').parentNode.hidden = r.length <= estado.ver;
    $$('.chip').forEach(function (c) { c.setAttribute('aria-selected', c.getAttribute('data-chip') === estado.cat); });
    var aa = $('#activeAct');
    if (estado.act) { aa.hidden = false; aa.innerHTML = 'Mostrando equipo para <strong>' + ACTS[estado.act] + '</strong> <button class="link" id="clearAct">Ver todo</button>'; }
    else aa.hidden = true;
  }

  function pintarBotas() {
    $('#boots').innerHTML = P.filter(function (p) { return p.cat === 'calzado' && p.stock !== false; }).sort(destacar).map(function (p) {
      return '<a class="boot" href="' + esc(p.url) + '" target="_blank" rel="noopener"><div class="boot__img"><img src="' + esc(p.img) + '" alt="' + esc(p.nombre) + '" loading="lazy"></div>' +
        '<h3>' + esc(p.nombre) + '</h3><p><strong>' + plata(N.precioTransf(p)) + '</strong> con transferencia</p></a>';
    }).join('');
  }

  function irAlCatalogo() { document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' }); }

  chips.addEventListener('click', function (e) {
    var c = e.target.closest('[data-chip]'); if (!c) return;
    estado.cat = c.getAttribute('data-chip'); estado.ver = POR_PAGINA; render();
  });
  $('#q').addEventListener('input', function (e) { estado.q = e.target.value; estado.ver = POR_PAGINA; render(); });
  $('#pub').addEventListener('change', function (e) { estado.pub = e.target.value; estado.ver = POR_PAGINA; render(); });
  $('#orden').addEventListener('change', function (e) { estado.orden = e.target.value; render(); });
  $('#more').addEventListener('click', function () { estado.ver += POR_PAGINA; render(); });
  document.addEventListener('click', function (e) {
    if (e.target.id === 'clearAct') { estado.act = ''; render(); return; }
    if (e.target.id === 'salirDemo') { N.borrarDemo(); location.reload(); return; }
    var act = e.target.closest('[data-act]');
    if (act) { estado.act = act.getAttribute('data-act'); estado.cat = ''; estado.ver = POR_PAGINA; render(); irAlCatalogo(); return; }
    var cat = e.target.closest('[data-cat]');
    if (cat) { estado.cat = cat.getAttribute('data-cat'); estado.act = ''; estado.ver = POR_PAGINA; render(); irAlCatalogo(); }
  });

  $('#grid').innerHTML = '<p class="empty">Cargando catálogo…</p>';
  N.cargarCatalogo().then(function (res) {
    P = res.datos.productos.filter(function (p) { return !p.oculto; });
    if (res.demo) {
      var bar = document.createElement('div');
      bar.className = 'demobar';
      bar.innerHTML = 'Estás viendo los cambios que hiciste en el <a href="/admin">panel</a> (demo: sólo se ven en este navegador). <button id="salirDemo">Volver al catálogo publicado</button>';
      document.body.insertBefore(bar, document.body.firstChild);
    }
    pintarChips(); render(); pintarBotas();
  }).catch(function () {
    $('#grid').innerHTML = '<p class="empty">No se pudo cargar el catálogo. <a href="https://nanukoutdoor.empretienda.com.ar/productos" target="_blank" rel="noopener">Miralo en la tienda online</a>.</p>';
  });

  // lista para la nieve
  var form = $('#check');
  function contar() {
    var n = $$('input:checked', form).length;
    $('#checkCount').textContent = n ? n + (n === 1 ? ' prenda marcada.' : ' prendas marcadas.') : 'Marcá al menos una prenda.';
    return n;
  }
  form.addEventListener('change', contar);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!contar()) { $('#checkCount').textContent = 'Marcá al menos una prenda para armar la lista.'; return; }
    var items = $$('input:checked', form).map(function (i) { return '• ' + i.value; }).join('\n');
    var txt = 'Hola Nanuk! Me voy a la nieve y armé mi lista (' + $('#checkPara').value + '):\n' + items + '\n¿Me pasan opciones, talles y el total con transferencia?';
    window.open(waLink(txt), '_blank', 'noopener');
  });

  $('#year').textContent = new Date().getFullYear();
})();
