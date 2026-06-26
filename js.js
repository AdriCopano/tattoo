/* ============================================================
   LOADING SCREEN — Canvas ink drip → Logo → Hero
   ============================================================ */
(function () {
  var screen = document.getElementById('loading-screen');
  if (!screen) return;

  document.body.style.overflow = 'hidden';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var logo    = document.getElementById('ls-logo');

  function finish() {
    gsap.ticker.remove(render);
    screen.style.display = 'none';
    document.body.style.overflow = '';
    if (window._startHero) window._startHero();
  }

  if (reduced) {
    gsap.to(screen, { opacity: 0, duration: 0.5, delay: 0.4, onComplete: finish });
    return;
  }

  /* ── Canvas setup ─────────────────────────────────────── */
  var canvas = document.getElementById('ls-canvas');
  if (!canvas) { finish(); return; }
  var ctx = canvas.getContext('2d');
  var W   = canvas.width  = window.innerWidth;
  var H   = canvas.height = window.innerHeight;
  var CX  = W * 0.5;
  var CY  = H * 0.5;
  /* Radio suficiente para cubrir cualquier esquina desde el centro */
  var maxR = Math.hypot(W, H) * 0.72;

  gsap.set(logo, { opacity: 0, scale: 0.72 });

  /* ── Estado de cada gota ─────────────────────────────── */
  function newDrop() {
    return {
      dropY: -50, dropAlpha: 0,
      sqX: 1, sqY: 1,
      trailLen: 0, trailAlpha: 0,
      blobR: 0, seed: Math.random() * 20,
      dots: [],
    };
  }
  var drops = [];
  for (var i = 0; i < 8; i++) drops.push(newDrop());

  /* ── Funciones de dibujo ─────────────────────────────── */

  function drawTeardrop(d) {
    if (d.dropAlpha <= 0) return;
    ctx.save();
    ctx.translate(CX, d.dropY);
    ctx.scale(d.sqX, d.sqY);
    ctx.globalAlpha = d.dropAlpha;
    var r = 6, h = 20, cy = 4;
    /* Gota redondeada: semicírculo inferior + beziers C1-continuos en la punta */
    ctx.beginPath();
    ctx.arc(0, cy, r, 0, Math.PI, false);          // semicírculo inferior
    var k = cy - (h + cy) * 0.55;                  // punto de control vertical
    ctx.bezierCurveTo(-r, k,   -r * 0.12, -h,  0, -h);  // lado izquierdo → punta
    ctx.bezierCurveTo( r * 0.12, -h,  r, k,    r, cy);  // punta → lado derecho
    ctx.closePath();
    var g = ctx.createRadialGradient(-r * 0.3, -h * 0.3, 0, 0, 0, (h + cy) * 0.8);
    g.addColorStop(0, '#2e2e2e');
    g.addColorStop(0.5, '#111');
    g.addColorStop(1, '#060606');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  function drawTrail(d) {
    if (d.trailLen <= 4 || d.trailAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = d.trailAlpha;
    var g = ctx.createLinearGradient(CX, 0, CX, d.trailLen);
    g.addColorStop(0,   'rgba(10,10,10,0)');
    g.addColorStop(0.55,'rgba(10,10,10,0.3)');
    g.addColorStop(1,   'rgba(10,10,10,0.88)');
    ctx.beginPath();
    /* Rastro afinado: más estrecho arriba, más ancho cerca del impacto */
    ctx.moveTo(CX - 1,   0);
    ctx.lineTo(CX + 1,   0);
    ctx.lineTo(CX + 4,   d.trailLen);
    ctx.lineTo(CX - 4,   d.trailLen);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  function drawBlob(d) {
    if (d.blobR <= 0) return;
    var s   = d.seed;
    var pts = 16;
    /* Pre-calcular vértices del blob */
    var verts = [];
    for (var i = 0; i < pts; i++) {
      var a = (i / pts) * Math.PI * 2 - Math.PI / 2;
      var noise =
        0.11 * Math.sin(a * 3  + s)       +
        0.07 * Math.sin(a * 5  + s * 0.7) +
        0.04 * Math.sin(a * 8  + s * 1.4) +
        0.02 * Math.sin(a * 13 + s * 0.3);
      var r  = d.blobR * (1 + noise);
      verts.push([CX + Math.cos(a) * r, CY + Math.sin(a) * r]);
    }
    /* Curvas cuadráticas suaves: punto de control = vértice, punto de paso = punto medio */
    ctx.save();
    ctx.beginPath();
    var prev = verts[pts - 1];
    ctx.moveTo((prev[0] + verts[0][0]) * 0.5, (prev[1] + verts[0][1]) * 0.5);
    for (var i = 0; i < pts; i++) {
      var cur  = verts[i];
      var next = verts[(i + 1) % pts];
      ctx.quadraticCurveTo(cur[0], cur[1], (cur[0] + next[0]) * 0.5, (cur[1] + next[1]) * 0.5);
    }
    ctx.closePath();
    /* Gradiente radial: reflejo de luz en la parte superior izquierda */
    var grd = ctx.createRadialGradient(
      CX - d.blobR * 0.22, CY - d.blobR * 0.22, 0,
      CX, CY, d.blobR * 1.2
    );
    grd.addColorStop(0,    '#2c2c2c');
    grd.addColorStop(0.35, '#141414');
    grd.addColorStop(0.7,  '#080808');
    grd.addColorStop(1,    '#020202');
    ctx.fillStyle = grd;
    /* Sombra suave para sensación de volumen */
    ctx.shadowColor   = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur    = 28;
    ctx.shadowOffsetY = 10;
    ctx.fill();
    ctx.restore();
  }

  function drawSplash(d) {
    d.dots.forEach(function (dot) {
      if (dot.a <= 0) return;
      ctx.save();
      ctx.globalAlpha = dot.a;
      ctx.beginPath();
      /* Gotitas alargadas en la dirección de vuelo */
      ctx.ellipse(dot.x, dot.y, dot.r * 0.45, dot.r, dot.ang, 0, Math.PI * 2);
      ctx.fillStyle = '#0c0c0c';
      ctx.fill();
      ctx.restore();
    });
  }

  /* ── Render loop (GSAP ticker) ───────────────────────── */
  function render() {
    ctx.clearRect(0, 0, W, H);
    drops.forEach(function (d) {
      drawTrail(d);
      drawBlob(d);
      drawSplash(d);
      drawTeardrop(d);
    });
  }
  gsap.ticker.add(render);

  /* ── Salpicaduras en el impacto ──────────────────────── */
  function spawnSplash(d) {
    d.dots = [];
    var count = 12 + Math.floor(Math.random() * 8);
    for (var j = 0; j < count; j++) {
      var ang  = Math.random() * Math.PI * 2;
      var dist = 16 + Math.random() * 55;
      var r    = 2.5 + Math.random() * 7;
      var dot  = { x: CX, y: CY, r: r, ang: ang, a: 0.88 };
      d.dots.push(dot);
      gsap.to(dot, {
        x: CX + Math.cos(ang) * dist,
        y: CY + Math.sin(ang) * dist * 0.52,
        r: r * 0.3,
        a: 0,
        duration: 0.22 + Math.random() * 0.24,
        ease: 'power2.out',
      });
    }
  }

  /* ── Timeline de una gota ────────────────────────────── */
  function animateDrop(d, fallDur, blobTarget, blobDur, isFlood) {
    var tl = gsap.timeline();
    tl
      .call(function () {
        d.dots       = [];
        d.dropY      = -50;
        d.trailLen   = 0;
        d.trailAlpha = 0.9;
        d.dropAlpha  = 1;
        d.sqX = 1; d.sqY = 1;
      })
      /* Caída */
      .to(d, { dropY: CY, trailLen: CY + 50, duration: fallDur, ease: 'power3.in' })
      /* Impacto: aplastamiento instantáneo */
      .to(d, {
        sqX: 5, sqY: 0.06, dropAlpha: 0,
        duration: 0.10, ease: 'power2.out',
        onComplete: function () { spawnSplash(d); },
      })
      /* Mancha crece */
      .to(d, {
        blobR: blobTarget,
        duration: blobDur,
        ease: isFlood ? 'power4.in' : 'power2.out',
      }, '-=0.05')
      /* Rastro desvanece */
      .to(d, { trailAlpha: 0, duration: 0.45, ease: 'power1.in' }, '<');
    return tl;
  }

  /* ── Master timeline ─────────────────────────────────── */
  var master = gsap.timeline();

  master.add(animateDrop(drops[0], 0.54, 75,   0.92),       0.15);
  master.add(animateDrop(drops[1], 0.49, 145,  0.84),       1.02);
  master.add(animateDrop(drops[2], 0.43, 215,  0.76),       1.65);
  master.add(animateDrop(drops[3], 0.34, 270,  0.54),       2.12);
  master.add(animateDrop(drops[4], 0.30, 318,  0.48),       2.26);
  master.add(animateDrop(drops[5], 0.26, 362,  0.42),       2.38);
  master.add(animateDrop(drops[6], 0.23, 400,  0.38),       2.48);
  /* Gota final: explosión que cubre todo el canvas */
  master.add(animateDrop(drops[7], 0.20, maxR, 0.36, true), 2.58);

  /* Logo (flood acaba ≈ t 3.15) */
  master
    .to(logo, { opacity: 1, scale: 1, duration: 0.72, ease: 'back.out(1.6)' }, 3.15)
    .to({}, { duration: 0.90 })
    .to(logo, { scale: 3.8, opacity: 0, duration: 0.58, ease: 'power3.in' })
    .to(screen, { opacity: 0, duration: 0.32, ease: 'power2.inOut', onComplete: finish }, '-=0.18');
})();

/* ============================================================
   YEAR
   ============================================================ */
document.getElementById('year').textContent = new Date().getFullYear();


/* ============================================================
   GSAP + SCROLLTRIGGER
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

/* — Hero: revela fondo → navbar → contenido — */
(function () {
  function kickoff() {
    var heroBg  = document.querySelector('.hero-bg');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || !heroBg) {
      if (heroBg) gsap.set(heroBg, { opacity: 1 });
      if (window._startNavbar) window._startNavbar();
      return;
    }

    /* Revelado cinematográfico: fondo aparece con ligero zoom hacia afuera */
    gsap.fromTo(heroBg,
      { opacity: 0, scale: 1.06 },
      {
        opacity: 1,
        scale:   1,
        duration: 1.15,
        ease:    'power2.out',
        onComplete: function () {
          if (window._startNavbar) window._startNavbar();
        },
      }
    );
  }

  if (document.getElementById('loading-screen')) {
    window._startHero = kickoff;
  } else {
    kickoff();
  }
})();

/* — Scroll reveal con ScrollTrigger (reemplaza IntersectionObserver) — */
(function () {
  gsap.utils.toArray('.reveal').forEach(function (el) {
    var delay = parseFloat(el.dataset.delay || '0') / 1000;
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
      opacity: 0,
      y: 40,
      duration: 0.8,
      delay: delay,
      ease: 'power3.out',
      onComplete: function () { el.classList.add('is-visible'); },
    });
  });
})();

/* ============================================================
   HERO — Parallax sutil en la imagen de fondo al mover el ratón
   ============================================================ */
(function () {
  var bgImg = document.querySelector('.hero-bg-img');
  if (!bgImg) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.addEventListener('mousemove', function (e) {
    var mx = (e.clientX / window.innerWidth  - 0.5) * 2;
    var my = (e.clientY / window.innerHeight - 0.5) * 2;
    bgImg.style.transform = 'scale(1.06) translate(' + (mx * -8) + 'px, ' + (my * -5) + 'px)';
  });

  /* Reset on mouse leave */
  document.addEventListener('mouseleave', function () {
    bgImg.style.transform = 'scale(1.03)';
  });
})();

/* ============================================================
   HEADER — scroll indicator only
   ============================================================ */
(function () {
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 24);
  }, { passive: true });
})();

/* ============================================================
   NAVBAR PILL DEPLOY
   ============================================================ */
(function () {
  var pill  = document.getElementById('navbar-pill');
  var inner = pill ? pill.querySelector('.header-inner') : null;
  if (!pill || !inner) return;

  /* El linter elimina border de CSS — se fija aquí para que clip-path lo recorte correctamente */
  pill.style.border = '1.5px solid rgba(255,255,255,0.22)';

  /* Estado inicial: pill fuera del viewport por arriba, recortada al 25% */
  gsap.set(pill,  { y: -120, clipPath: 'inset(0 37.5% round 999px)' });
  gsap.set(inner, { opacity: 0, y: 6 });

  var navTl = gsap.timeline({ paused: true });

  /* 1. Cae desde fuera del viewport hasta su posición fija */
  navTl.to(pill, {
    y: 0,
    duration: 0.65,
    ease: 'back.out(1.4)',
  })
  /* 2. Se expande hacia los lados animando el clip-path */
  .to(pill, {
    clipPath: 'inset(0 0% round 999px)',
    duration: 0.65,
    ease: 'power2.inOut',
  }, '+=0.15')
  /* 3. El contenido aparece con suavidad al terminar la expansión */
  .fromTo(inner,
    { opacity: 0, y: 6 },
    {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: function () {
        pill.classList.add('deployed');
        _launchHeroSequence();
      },
    }
  );

  /* Secuencia del hero — se dispara cuando el navbar termina de desplegarse */
  function _launchHeroSequence() {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var title     = document.querySelector('.hero-title');
    var mist      = document.querySelector('.hero-mist');
    var descEl    = document.querySelector('.hero-desc');
    var ctasEl    = document.querySelector('.hero-ctas');
    var hintEl    = document.querySelector('.hero-scroll-hint');

    if (reduced) {
      /* Sin animación: mostrar todo de golpe */
      if (title) title.classList.add('hero-title--ready');
      if (mist)  mist.classList.add('active');
      if (descEl)  gsap.set(descEl,  { opacity: 1, y: 0 });
      if (ctasEl)  gsap.set(ctasEl,  { opacity: 1, y: 0 });
      if (hintEl)  gsap.set(hintEl,  { opacity: 1 });
      return;
    }

    /* 1. Letras caen (CSS animation, disparada por clase) */
    if (title) title.classList.add('hero-title--ready');

    /* 2. Humo aparece al mismo tiempo que las letras caen */
    if (mist) {
      gsap.delayedCall(0.1, function () { mist.classList.add('active'); });
    }

    /* 3. Descriptor → aparece cuando la 2ª línea ya aterrizó (~0.85s + 0.17s = ~1s total) */
    gsap.delayedCall(0.95, function () {
      if (descEl) gsap.fromTo(descEl,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' }
      );
    });

    /* 4. CTAs → 0.25s después del descriptor */
    gsap.delayedCall(1.25, function () {
      if (ctasEl) gsap.fromTo(ctasEl,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }
      );
    });

    /* 5. Scroll hint → aparece al final */
    gsap.delayedCall(1.9, function () {
      if (hintEl) gsap.fromTo(hintEl,
        { opacity: 0 },
        { opacity: 1, duration: 0.7, ease: 'power2.out' }
      );
    });
  }

  window._startNavbar = function () { navTl.play(); };
})();

/* ============================================================
   MOBILE MENU
   ============================================================ */
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
let menuOpen = false;

menuToggle.addEventListener('click', function () {
  menuOpen = !menuOpen;
  menuToggle.classList.toggle('open', menuOpen);
  mobileMenu.classList.toggle('open', menuOpen);
  menuToggle.setAttribute('aria-expanded', menuOpen);
  menuToggle.setAttribute('aria-label', menuOpen ? 'Cerrar menú' : 'Abrir menú');
  document.body.style.overflow = menuOpen ? 'hidden' : '';
});

function closeMobileMenu() {
  menuOpen = false;
  menuToggle.classList.remove('open');
  mobileMenu.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', false);
  menuToggle.setAttribute('aria-label', 'Abrir menú');
  document.body.style.overflow = '';
}


/* ============================================================
   GALLERY FILTER
   ============================================================ */
(function () {
  var buttons  = document.querySelectorAll('.filter-btn');
  var allItems = Array.from(document.querySelectorAll('.gallery-item'));
  var animating = false;

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (animating || btn.classList.contains('active')) return;

      var filter = btn.dataset.filter;

      buttons.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      var toHide = allItems.filter(function (item) {
        return !item.classList.contains('hidden') &&
               filter !== 'todos' && item.dataset.cat !== filter;
      });
      var toShow = allItems.filter(function (item) {
        return item.classList.contains('hidden') &&
               (filter === 'todos' || item.dataset.cat === filter);
      });

      if (!toHide.length && !toShow.length) return;
      animating = true;

      function showItems() {
        if (!toShow.length) { animating = false; return; }
        toShow.forEach(function (item) { item.classList.remove('hidden'); });
        gsap.fromTo(toShow,
          { opacity: 0, scale: 0.92 },
          {
            opacity: 1, scale: 1,
            duration: 0.3, ease: 'power2.out', stagger: 0.05,
            onComplete: function () { animating = false; },
          }
        );
      }

      if (toHide.length) {
        gsap.to(toHide, {
          opacity: 0, scale: 0.88,
          duration: 0.2, ease: 'power2.in', stagger: 0.03,
          onComplete: function () {
            toHide.forEach(function (item) {
              item.classList.add('hidden');
              gsap.set(item, { opacity: 1, scale: 1 });
            });
            showItems();
          },
        });
      } else {
        showItems();
      }
    });
  });
})();

/* ============================================================
   GALLERY — BLUR-UP IMAGE LOADING
   ============================================================ */
(function () {
  document.querySelectorAll('.gallery-item img').forEach(function (img) {
    if (img.complete && img.naturalWidth > 0) return;
    img.classList.add('img-loading');
    img.addEventListener('load',  function () { img.classList.remove('img-loading'); }, { once: true });
    img.addEventListener('error', function () { img.classList.remove('img-loading'); }, { once: true });
  });
})();

/* ============================================================
   FAQ ACCORDION
   ============================================================ */
(function () {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function (item) {
    const btn = item.querySelector('.faq-btn');
    btn.addEventListener('click', function () {
      const isOpen = item.classList.contains('open');

      faqItems.forEach(function (i) {
        i.classList.remove('open');
        i.querySelector('.faq-btn').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();

/* ============================================================
   CONTACT FORM → WHATSAPP
   ============================================================ */
document.getElementById('contact-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const name    = document.getElementById('name').value || '(nombre)';
  const email   = document.getElementById('email').value || '—';
  const phone   = document.getElementById('phone').value || '—';
  const service = document.getElementById('service').value;
  const message = document.getElementById('message').value || '—';

  const text = [
    'Hola Piki Tattoo, soy ' + name + '.',
    'Servicio: ' + service,
    'Teléfono: ' + phone,
    'Email: ' + email,
    'Mensaje: ' + message,
  ].join('\n');

  window.open(
    'https://wa.me/34600000000?text=' + encodeURIComponent(text),
    '_blank',
    'noopener,noreferrer'
  );
});

/* Los rayos de luz del hero se gestionan íntegramente desde CSS/HTML */

/* ============================================================
   CUSTOM CURSOR
   ============================================================ */
(function () {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  var cursor = document.getElementById('cursor');
  var label  = document.getElementById('cursor-label');
  var mouse  = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  var pos    = { x: mouse.x, y: mouse.y };

  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  /* Seguimiento suave con GSAP ticker */
  gsap.ticker.add(function () {
    pos.x += (mouse.x - pos.x) * 0.22;
    pos.y += (mouse.y - pos.y) * 0.22;
    gsap.set(cursor, { x: pos.x, y: pos.y });
  });

  /* — Imágenes de galería → expandir con "VER" — */
  document.querySelectorAll('.gallery-item').forEach(function (el) {
    el.addEventListener('mouseenter', function () {
      cursor.classList.add('is-hover-img');
      label.textContent = 'VER';
    });
    el.addEventListener('mouseleave', function () {
      cursor.classList.remove('is-hover-img');
      label.textContent = '';
    });
  });

  /* — Botones CTA → círculo semitransparente — */
  document.querySelectorAll('.btn-cta, .btn-band, .hero-btn-primary, .btn-submit').forEach(function (el) {
    el.addEventListener('mouseenter', function () {
      cursor.classList.add('is-hover-btn');
    });
    el.addEventListener('mouseleave', function () {
      cursor.classList.remove('is-hover-btn');
    });
  });

  /* — Links y nav → círculo medio — */
  document.querySelectorAll('a:not(.btn-primary):not(.btn-secondary):not(.btn-cta):not(.btn-band), .faq-btn').forEach(function (el) {
    el.addEventListener('mouseenter', function () {
      cursor.classList.add('is-hover-link');
    });
    el.addEventListener('mouseleave', function () {
      cursor.classList.remove('is-hover-link');
    });
  });

  /* Ocultar cursor al salir de la ventana */
  document.addEventListener('mouseleave', function () {
    gsap.to(cursor, { opacity: 0, duration: 0.2 });
  });
  document.addEventListener('mouseenter', function () {
    gsap.to(cursor, { opacity: 1, duration: 0.2 });
  });
})();

/* ============================================================
   LIGHTBOX
   ============================================================ */
(function () {
  var overlay   = document.getElementById('lb-overlay');
  var lbImg     = document.getElementById('lb-img');
  var lbWrap    = document.getElementById('lb-img-wrap');
  var lbClose   = document.getElementById('lb-close');
  var lbPrev    = document.getElementById('lb-prev');
  var lbNext    = document.getElementById('lb-next');
  var lbCurrent = document.getElementById('lb-counter-current');
  var lbTotal   = document.getElementById('lb-counter-total');

  var currentIndex = 0;
  var visibleItems = [];
  var openerEl     = null;
  var isNavigating = false;
  var zoomScale    = 1;

  function getVisible() {
    return Array.from(document.querySelectorAll('.gallery-item:not(.hidden)'));
  }

  function resetZoom() {
    zoomScale = 1;
    lbImg.classList.remove('lb-zoomed');
    gsap.set(lbImg, { scale: 1, x: 0, y: 0 });
  }

  function updateCounter(idx) {
    if (lbCurrent) lbCurrent.textContent = idx + 1;
    if (lbTotal)   lbTotal.textContent   = visibleItems.length;
    var single = visibleItems.length <= 1;
    if (lbPrev) lbPrev.disabled = single;
    if (lbNext) lbNext.disabled = single;
  }

  function openLightbox(index, originEl) {
    visibleItems = getVisible();
    if (!visibleItems.length) return;

    currentIndex = Math.max(0, Math.min(index, visibleItems.length - 1));
    openerEl = originEl;

    var img = visibleItems[currentIndex].querySelector('img');
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    updateCounter(currentIndex);

    overlay.classList.add('lb-open');
    document.body.style.overflow = 'hidden';

    var origin = originEl.getBoundingClientRect();
    var cx = origin.left + origin.width / 2;
    var cy = origin.top + origin.height / 2;

    gsap.set(lbWrap, {
      scale: 0.15,
      x: cx - window.innerWidth / 2,
      y: cy - window.innerHeight / 2,
      opacity: 0,
    });

    gsap.timeline()
      .to(overlay, { opacity: 1, duration: 0.35, ease: 'power2.out' })
      .to(lbWrap, { scale: 1, x: 0, y: 0, opacity: 1, duration: 0.55, ease: 'expo.out' }, '-=0.2');

    setTimeout(function () { lbClose.focus(); }, 450);
  }

  function closeLightbox() {
    resetZoom();
    gsap.to(lbWrap, { scale: 0.9, opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: function () {
        overlay.classList.remove('lb-open');
        lbImg.src = '';
        document.body.style.overflow = '';
        gsap.set(lbWrap, { scale: 1, x: 0, y: 0, opacity: 1 });
        if (openerEl) openerEl.focus();
      },
    });
  }

  function navigate(dir) {
    if (isNavigating || visibleItems.length <= 1) return;
    gsap.killTweensOf(lbImg);
    resetZoom();
    isNavigating = true;

    var nextIndex = (currentIndex + dir + visibleItems.length) % visibleItems.length;
    var nextImg   = visibleItems[nextIndex].querySelector('img');
    var slideOut  = dir > 0 ? -60 : 60;

    gsap.timeline({
      onComplete: function () {
        currentIndex = nextIndex;
        isNavigating = false;
      },
    })
    /* slide current out */
    .to(lbImg, { x: slideOut, opacity: 0, duration: 0.22, ease: 'power2.in' })
    /* swap src, position incoming off-screen */
    .call(function () {
      lbImg.src = nextImg.src;
      lbImg.alt = nextImg.alt;
      updateCounter(nextIndex);
      gsap.set(lbImg, { x: -slideOut, opacity: 0 });
    })
    /* slide incoming in */
    .to(lbImg, { x: 0, opacity: 1, duration: 0.28, ease: 'power2.out' }, '+=0.04');
  }

  /* Open from grid click */
  document.querySelectorAll('.gallery-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var visible = getVisible();
      var idx = visible.indexOf(item);
      if (idx === -1) return;
      openLightbox(idx, item.querySelector('img'));
    });
  });

  /* Arrow buttons */
  if (lbPrev) lbPrev.addEventListener('click', function () { navigate(-1); });
  if (lbNext) lbNext.addEventListener('click', function () { navigate(1); });

  /* Close */
  lbClose.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeLightbox();
  });

  /* Keyboard — Escape, arrow nav, Tab focus trap */
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('lb-open')) return;
    if (e.key === 'Escape')     { closeLightbox(); return; }
    if (e.key === 'ArrowLeft')  { navigate(-1);    return; }
    if (e.key === 'ArrowRight') { navigate(1);     return; }
    if (e.key === 'Tab') {
      var focusable = Array.from(overlay.querySelectorAll('button:not([disabled])')).filter(function (el) {
        return getComputedStyle(el).display !== 'none';
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
  });

  /* Touch swipe */
  var touchX = 0;
  var touchY = 0;
  overlay.addEventListener('touchstart', function (e) {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, { passive: true });
  overlay.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - touchX;
    var dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) {
      navigate(dx < 0 ? 1 : -1);
    }
  }, { passive: true });

  /* Zoom — click */
  lbImg.addEventListener('click', function (e) {
    e.stopPropagation();
    if (zoomScale === 1) {
      zoomScale = 2;
      lbImg.classList.add('lb-zoomed');
      gsap.to(lbImg, { scale: 2, duration: 0.4, ease: 'power2.out' });
    } else {
      zoomScale = 1;
      lbImg.classList.remove('lb-zoomed');
      gsap.to(lbImg, { scale: 1, x: 0, y: 0, duration: 0.35, ease: 'power2.out' });
    }
  });

  /* Zoom — wheel */
  lbImg.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomScale = Math.min(3, Math.max(1, zoomScale - e.deltaY * 0.002));
    if (zoomScale <= 1) {
      zoomScale = 1;
      lbImg.classList.remove('lb-zoomed');
      gsap.to(lbImg, { scale: 1, x: 0, y: 0, duration: 0.25, ease: 'power2.out' });
    } else {
      lbImg.classList.add('lb-zoomed');
      gsap.to(lbImg, { scale: zoomScale, duration: 0.25, ease: 'power2.out' });
    }
  }, { passive: false });
})();
