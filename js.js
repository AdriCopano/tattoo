/* ============================================================
   LOADING SCREEN — INK DRIP
   ============================================================ */
(function () {
  var screen = document.getElementById('loading-screen');
  if (!screen) return;

  document.body.style.overflow = 'hidden';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    gsap.to(screen, {
      opacity: 0,
      duration: 0.6,
      delay: 0.8,
      ease: 'power2.out',
      onComplete: function () {
        screen.style.display = 'none';
        document.body.style.overflow = '';
        if (window._startHero) window._startHero();
      },
    });
    return;
  }

  var drip = document.getElementById('ls-drip');
  var blob = document.getElementById('ls-blob');
  if (!drip || !blob) {
    screen.style.display = 'none';
    document.body.style.overflow = '';
    return;
  }

  var vw = window.innerWidth;
  var vh = window.innerHeight;
  /* Radius to cover full screen from center */
  var maxR = Math.ceil(Math.sqrt(vw * vw + vh * vh) / 2) + 80;

  /* Start drip above viewport */
  gsap.set(drip, { y: -70 });

  var tl = gsap.timeline({
    delay: 0.2,
    onComplete: function () {
      screen.style.display = 'none';
      document.body.style.overflow = '';
      gsap.delayedCall(0.35, function () {
        if (window._startHero) window._startHero();
      });
    },
  });

  /* 1. Drip falls from top to viewport center */
  tl.to(drip, {
    y: vh / 2 - 14,
    duration: 0.48,
    ease: 'power3.in',
  })

  /* 2. Impact: drip squishes flat */
  .to(drip, {
    scaleY: 0.2,
    scaleX: 3,
    opacity: 0,
    duration: 0.14,
    ease: 'power2.out',
  })

  /* 3. Blob pops from impact point */
  .to(blob, {
    width: 48,
    height: 48,
    duration: 0.22,
    ease: 'back.out(2.8)',
  }, '-=0.1')

  /* 4. Blob grows (progress phase) */
  .to(blob, {
    width: maxR * 0.55,
    height: maxR * 0.55,
    duration: 0.72,
    ease: 'power1.inOut',
  })

  /* 5. Rapid ink burst — covers full screen */
  .to(blob, {
    width: maxR * 2.1,
    height: maxR * 2.1,
    duration: 0.38,
    ease: 'power3.in',
  });
})();

/* ============================================================
   YEAR
   ============================================================ */
document.getElementById('year').textContent = new Date().getFullYear();


/* ============================================================
   GSAP + SCROLLTRIGGER
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

/* — Hero: timeline de entrada — */
(function () {
  var title = document.querySelector('.hero-title');
  if (!title) return;

  /* Split palabras */
  var html = title.innerHTML;
  var lines = html.split('<br>');
  title.innerHTML = lines.map(function (line) {
    return line.trim().split(' ').map(function (word) {
      return '<span class="hw-outer"><span class="hw-inner">' + word + '</span></span>';
    }).join(' ');
  }).join('<br>');

  gsap.set('.hw-inner', { y: '110%' });

  var tl = gsap.timeline({
    paused: true,
    defaults: { ease: 'power3.out' },
  });

  tl.to('.hw-inner', {
    y: '0%',
    duration: 1.1,
    stagger: 0.1,
    ease: 'power4.out',
    onComplete: function () { if (window._startNavbar) window._startNavbar(); },
  })
  .from('.hero-desc', { opacity: 0, y: 24, duration: 0.8 }, '-=0.4')
  .from('.hero-cards', { opacity: 0, y: 40, duration: 1 }, '-=0.5')
  .from('.hero-rating', { opacity: 0, y: 16, duration: 0.6 }, '-=0.4');

  if (document.getElementById('loading-screen')) {
    window._startHero = function () { tl.play(); };
  } else {
    tl.play();
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
   HERO — TILT 3D EN CARDS AL MOVER EL RATÓN
   ============================================================ */
(function () {
  var cards = document.querySelectorAll('.hero-card:not(.hero-card--cta)');

  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = (e.clientX - cx) / (rect.width / 2);
      var dy = (e.clientY - cy) / (rect.height / 2);
      card.style.transform = 'perspective(700px) rotateY(' + (dx * 8) + 'deg) rotateX(' + (-dy * 8) + 'deg) scale(1.025)';
    });

    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
    });

    card.addEventListener('mouseenter', function () {
      card.style.transition = 'transform 0.1s linear';
    });
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
      onComplete: function () { pill.classList.add('deployed'); },
    }
  );

  /* Se dispara desde el onComplete del hero-title */
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
  const buttons = document.querySelectorAll('.filter-btn');
  const items   = document.querySelectorAll('.gallery-item');

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const filter = btn.dataset.filter;

      buttons.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      items.forEach(function (item) {
        if (filter === 'todos' || item.dataset.cat === filter) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
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

  /* — Imágenes de galería y hero cards → expandir con "VER" — */
  document.querySelectorAll('.gallery-item, .hero-card:not(.hero-card--cta)').forEach(function (el) {
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
  document.querySelectorAll('.btn-primary, .btn-secondary, .btn-cta, .btn-band, .hero-card--cta, .btn-submit').forEach(function (el) {
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
  var overlay  = document.getElementById('lb-overlay');
  var lbImg    = document.getElementById('lb-img');
  var lbWrap   = document.getElementById('lb-img-wrap');
  var lbClose  = document.getElementById('lb-close');

  function openLightbox(src, alt, originEl) {
    lbImg.src = src;
    lbImg.alt = alt;
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

    var tl = gsap.timeline();
    tl.to(overlay, { opacity: 1, duration: 0.35, ease: 'power2.out' })
      .to(lbWrap, {
        scale: 1, x: 0, y: 0, opacity: 1,
        duration: 0.55,
        ease: 'expo.out',
      }, '-=0.2');
  }

  function closeLightbox() {
    gsap.to(lbWrap, {
      scale: 0.9,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    });
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: function () {
        overlay.classList.remove('lb-open');
        lbImg.src = '';
        document.body.style.overflow = '';
        gsap.set(lbWrap, { scale: 1, x: 0, y: 0, opacity: 1 });
      },
    });
  }

  /* Abrir al hacer clic en cualquier imagen de galería */
  document.querySelectorAll('.gallery-item img').forEach(function (img) {
    img.parentElement.addEventListener('click', function () {
      openLightbox(img.src, img.alt, img);
    });
  });

  /* — Zoom con clic en la imagen — */
  var zoomScale = 1;
  var minScale  = 1;
  var maxScale  = 3;

  lbImg.addEventListener('click', function (e) {
    e.stopPropagation();
    if (zoomScale === 1) {
      zoomScale = 2;
      lbImg.classList.add('lb-zoomed');
      gsap.to(lbImg, { scale: zoomScale, duration: 0.4, ease: 'power2.out' });
    } else {
      zoomScale = 1;
      lbImg.classList.remove('lb-zoomed');
      gsap.to(lbImg, { scale: 1, x: 0, y: 0, duration: 0.4, ease: 'power2.out' });
    }
  });

  /* Rueda del ratón para ajustar zoom */
  lbImg.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomScale = Math.min(maxScale, Math.max(minScale, zoomScale - e.deltaY * 0.002));
    if (zoomScale <= 1) {
      zoomScale = 1;
      lbImg.classList.remove('lb-zoomed');
      gsap.to(lbImg, { scale: 1, x: 0, y: 0, duration: 0.25, ease: 'power2.out' });
    } else {
      lbImg.classList.add('lb-zoomed');
      gsap.to(lbImg, { scale: zoomScale, duration: 0.25, ease: 'power2.out' });
    }
  }, { passive: false });

  function resetZoom() {
    zoomScale = 1;
    lbImg.classList.remove('lb-zoomed');
    gsap.set(lbImg, { scale: 1, x: 0, y: 0 });
  }

  /* Cerrar con botón, overlay o Escape */
  lbClose.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('lb-open')) closeLightbox();
  });

  var origClose = closeLightbox;
  closeLightbox = function () { resetZoom(); origClose(); };
})();
