(function () {
  var WA = '5491156624897';
  var DESC = 0.79; // 21% off con transferencia (igual que en su tienda)
  var POR_PAGINA = 12;
  var CATS = [
    ['', 'Todo'], ['camperas', 'Camperas'], ['chalecos', 'Chalecos'], ['buzos', 'Buzos y polares'],
    ['termicas', 'Térmicas'], ['pantalones', 'Pantalones y calzas'], ['calzado', 'Calzado'],
    ['accesorios', 'Accesorios'], ['fitness', 'Fitness'], ['giftcard', 'Gift card']
  ];
  var DESTACADOS = ['camperas', 'calzado', 'chalecos', 'buzos', 'termicas', 'pantalones', 'accesorios', 'fitness', 'giftcard'];
  var ACTS = { nieve: 'nieve y esquí', trekking: 'trekking y montaña', camping: 'camping', fitness: 'fitness' };
  var ETIQ = {}; CATS.forEach(function (c) { ETIQ[c[0]] = c[1]; });
  var P = window.PRODUCTOS || [];
  var estado = { cat: '', act: '', q: '', pub: '', orden: '', ver: POR_PAGINA };

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function plata(n) { return '$' + Math.round(n).toLocaleString('es-AR'); }
  function waLink(txt) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(txt); }
  function sinTildes(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

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

  // chips
  var chips = $('#chips');
  chips.innerHTML = CATS.map(function (c) {
    var n = c[0] ? P.filter(function (p) { return p.cat === c[0]; }).length : P.length;
    return '<button class="chip" role="tab" data-chip="' + c[0] + '" aria-selected="' + (c[0] === '' ) + '">' + c[1] + '<span>' + n + '</span></button>';
  }).join('');

  function filtrados() {
    var q = sinTildes(estado.q.trim());
    var r = P.filter(function (p) {
      if (estado.cat && p.cat !== estado.cat) return false;
      if (estado.act && p.act.indexOf(estado.act) < 0) return false;
      if (estado.pub && p.pub !== estado.pub && p.pub !== 'unisex') return false;
      if (q && sinTildes(p.nombre + ' ' + ETIQ[p.cat]).indexOf(q) < 0) return false;
      return true;
    });
    if (!estado.orden) r.sort(function (a, b) { return DESTACADOS.indexOf(a.cat) - DESTACADOS.indexOf(b.cat) || P.indexOf(a) - P.indexOf(b); });
    if (estado.orden === 'asc') r.sort(function (a, b) { return a.precio - b.precio; });
    if (estado.orden === 'desc') r.sort(function (a, b) { return b.precio - a.precio; });
    return r;
  }

  function tarjeta(p) {
    return '<article class="prod">' +
      '<div class="prod__img"><span class="prod__tag">' + ETIQ[p.cat] + '</span>' +
      '<img src="' + p.img + '" alt="' + esc(p.nombre) + '" loading="lazy"' + (p.foto === 'cover' ? ' class="cover"' : '') + '></div>' +
      '<div class="prod__body"><h3>' + esc(p.nombre) + '</h3>' +
      '<div class="prod__price"><span class="prod__list">' + plata(p.precio) + ' de lista</span>' +
      '<span class="prod__tr">' + plata(p.precio * DESC) + ' <small>con transferencia</small></span></div>' +
      '<div class="prod__cta"><a class="btn btn--primary" href="' + p.url + '" target="_blank" rel="noopener">Comprar</a>' +
      '<a class="btn btn--wa" href="#" aria-label="Consultar por WhatsApp" data-wa="Hola Nanuk! Quería consultar por: ' + esc(p.nombre) + ' (' + plata(p.precio) + '). ¿Qué talles tienen?"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-wa"/></svg></a></div>' +
      '</div></article>';
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
    var act = e.target.closest('[data-act]');
    if (act) { estado.act = act.getAttribute('data-act'); estado.cat = ''; estado.ver = POR_PAGINA; render(); irAlCatalogo(); return; }
    var cat = e.target.closest('[data-cat]');
    if (cat) { estado.cat = cat.getAttribute('data-cat'); estado.act = ''; estado.ver = POR_PAGINA; render(); irAlCatalogo(); }
  });
  render();

  // riel de calzado
  $('#boots').innerHTML = P.filter(function (p) { return p.cat === 'calzado'; }).map(function (p) {
    return '<a class="boot" href="' + p.url + '" target="_blank" rel="noopener"><div class="boot__img"><img src="' + p.img + '" alt="' + esc(p.nombre) + '" loading="lazy"></div>' +
      '<h3>' + esc(p.nombre) + '</h3><p><strong>' + plata(p.precio * DESC) + '</strong> con transferencia</p></a>';
  }).join('');

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
