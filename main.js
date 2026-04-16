// ── CURSOR ──
const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top  = e.clientY + 'px';
});

// ── NAV SCROLL EFFECT ──
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
});

// ── FILTER BUTTONS ──
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── SCROLL REVEAL ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.transitionDelay = (i * 0.07) + 's';
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── CAROUSEL ──
document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const track   = carousel.querySelector('.carousel-track');
  const slides  = carousel.querySelectorAll('.carousel-slide');
  const dots    = carousel.querySelectorAll('.dot');
  const btnPrev = carousel.querySelector('.carousel-btn--prev');
  const btnNext = carousel.querySelector('.carousel-btn--next');
  const current = carousel.querySelector('.carousel-current');
  const total   = slides.length;

  let index = 0;

  function goTo(n) {
    index = (n + total) % total;
    track.style.transform = `translateX(-${index * 100}%)`;
    slides.forEach((s, i) => s.classList.toggle('active', i === index));
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
    if (current) current.textContent = index + 1;
  }

  btnPrev.addEventListener('click', () => goTo(index - 1));
  btnNext.addEventListener('click', () => goTo(index + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  carousel.addEventListener('mouseenter', () => {
    carousel._keyHandler = e => {
      if (e.key === 'ArrowLeft')  goTo(index - 1);
      if (e.key === 'ArrowRight') goTo(index + 1);
    };
    window.addEventListener('keydown', carousel._keyHandler);
  });

  carousel.addEventListener('mouseleave', () => {
    window.removeEventListener('keydown', carousel._keyHandler);
  });

  let startX = 0;
  carousel.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  carousel.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? goTo(index + 1) : goTo(index - 1);
    }
  });
});

// ══════════════════════════════════════════
// ── CARRITO DE COMPRAS ──
// ══════════════════════════════════════════

const CART_KEY      = 'ajar_cart';
const WA_NUMBER     = '+525646952015';   // WhatsApp de la empresa
const DISCOUNT_RATE = 0.0;             // 15% descuento mayoreo
const DISCOUNT_MIN  = 0;              // mínimo de piezas para descuento

// ── Helpers ──
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function fmt(n) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Calcula totales aplicando descuento si aplica
function calcTotals(cart) {
  const totalQty      = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal      = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const hayDescuento  = totalQty >= DISCOUNT_MIN;
  const descuento     = hayDescuento ? subtotal * DISCOUNT_RATE : 0;
  const total         = subtotal - descuento;
  return { totalQty, subtotal, hayDescuento, descuento, total };
}

// ── Contador del nav ──
function updateCartCount() {
  const cart  = getCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.textContent    = total;
    badge.style.display  = total > 0 ? 'flex' : 'none';
  }
}

// ── Toast ──
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── Agregar producto ──
function addToCart(name, price, cat) {
  const cart     = getCart();
  const existing = cart.find(i => i.name === name);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ name, price: Number(price), cat, qty: 1 });
  }
  saveCart(cart);
  updateCartCount();
  showToast(`"${name}" agregado al carrito`);
}

// ── Botones agregar ──
document.querySelectorAll('.btn-add-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const { name, price, cat } = btn.dataset;
    addToCart(name, price, cat);
    btn.textContent = '✓ Agregado';
    btn.style.borderColor = 'var(--accent)';
    btn.style.color       = 'var(--accent)';
    setTimeout(() => {
      btn.textContent       = btn.classList.contains('btn-add-cart--detail') ? '+ Agregar al carrito' : '+ Agregar';
      btn.style.borderColor = '';
      btn.style.color       = '';
    }, 1500);
  });
});

updateCartCount();

// ══════════════════════════════════════════
// ── PÁGINA DEL CARRITO (carrito.html) ──
// ══════════════════════════════════════════

const cartContainer = document.getElementById('cart-items-container');

if (cartContainer) {
  renderCart();

  document.getElementById('btn-clear').addEventListener('click', () => {
    if (getCart().length === 0) return;
    saveCart([]);
    updateCartCount();
    renderCart();
    showToast('Carrito vaciado');
  });

  document.getElementById('btn-pdf').addEventListener('click', () => {
    generatePDF();           // 1. Descarga el PDF
    setTimeout(() => {
      sendWhatsApp();        // 2. Abre WhatsApp (pequeño delay para que el PDF arranque)
    }, 800);
  });
}

function renderCart() {
  const cart      = getCart();
  const container = document.getElementById('cart-items-container');
  const elCount   = document.getElementById('summary-count');
  const elQty     = document.getElementById('summary-qty');
  const elSub     = document.getElementById('summary-subtotal');
  const elDesc    = document.getElementById('summary-descuento');
  const elDescRow = document.getElementById('summary-descuento-row');
  const elTotal   = document.getElementById('summary-total');
  const elBadge   = document.getElementById('summary-mayoreo-badge');
  const btnPdf    = document.getElementById('btn-pdf');

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">
          <svg width="64" height="64" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <h3 class="cart-empty-title">Tu carrito está vacío</h3>
        <p class="cart-empty-desc">Explora el catálogo y agrega productos.</p>
        <a href="index.html" class="btn-primary">
          <span>Ir al catálogo</span>
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>`;
    if (elCount)   elCount.textContent  = '0';
    if (elQty)     elQty.textContent    = '0';
    if (elSub)     elSub.textContent    = '$0';
    if (elTotal)   elTotal.textContent  = '$0';
    if (elDescRow) elDescRow.style.display = 'none';
    if (elBadge)   elBadge.style.display   = 'none';
    if (btnPdf)    btnPdf.disabled          = true;
    return;
  }

  if (btnPdf) btnPdf.disabled = false;

  const { totalQty, subtotal, hayDescuento, descuento, total } = calcTotals(cart);

  container.innerHTML = cart.map((item, idx) => `
    <div class="cart-item" data-idx="${idx}">
      <div class="cart-item-info">
        <p class="cart-item-cat">${item.cat}</p>
        <p class="cart-item-name">${item.name}</p>
      </div>
      <div class="cart-qty">
        <button class="qty-btn" data-action="dec" data-idx="${idx}">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" data-action="inc" data-idx="${idx}">+</button>
      </div>
      <div class="cart-item-price">$${fmt(item.price * item.qty)}</div>
      <button class="cart-item-remove" data-idx="${idx}" title="Eliminar">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>
  `).join('');

  // Actualizar resumen
  if (elCount)   elCount.textContent = cart.length;
  if (elQty)     elQty.textContent   = totalQty;
  if (elSub)     elSub.textContent   = `$${fmt(subtotal)}`;
  if (elTotal)   elTotal.textContent = `$${fmt(total)}`;

  // Mostrar u ocultar fila de descuento
  if (elDescRow) elDescRow.style.display = hayDescuento ? 'flex' : 'none';
  if (elDesc)    elDesc.textContent = `-$${fmt(descuento)} (15%)`;

  // Badge de mayoreo
  if (elBadge) {
    elBadge.style.display = hayDescuento ? 'block' : 'none';
  }

  // Eventos qty y remove
  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const c   = getCart();
      const idx = Number(btn.dataset.idx);
      btn.dataset.action === 'inc' ? c[idx].qty++ : c[idx].qty--;
      if (c[idx].qty <= 0) c.splice(idx, 1);
      saveCart(c);
      updateCartCount();
      renderCart();
    });
  });

  container.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = getCart();
      c.splice(Number(btn.dataset.idx), 1);
      saveCart(c);
      updateCartCount();
      renderCart();
      showToast('Producto eliminado');
    });
  });
}

// ══════════════════════════════════════════
// ── GENERAR PDF ──
// ══════════════════════════════════════════

function generatePDF() {
  const cart = getCart();
  if (cart.length === 0) return;

  const { jsPDF } = window.jspdf;
  const doc    = new jsPDF({ unit: 'mm', format: 'a4' });
  const W      = 210;
  const margin = 18;
  let y        = 0;

  const { totalQty, subtotal, hayDescuento, descuento, total } = calcTotals(cart);
  const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── Header ──
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, W, 52, 'F');

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(28);
  doc.setTextColor(200, 169, 106);
  doc.text('AURAGOAT', margin, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(136, 132, 128);
  doc.text('Tienda mayorista y minorista especializada en productos de primera calidad · Catálogo 2026', margin, 30);

  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text(`Fecha: ${fecha}`, W - margin, 30, { align: 'right' });

  // Badge mayoreo en PDF
 // if (hayDescuento) {
  //  doc.setFillColor(200, 169, 106);
   // doc.roundedRect(W - margin - 42, 36, 42, 9, 1, 1, 'F');
   // doc.setFont('helvetica', 'bold');
   // doc.setFontSize(7);
   // doc.setTextColor(20, 20, 20);
   // doc.text('✓ DESCUENTO MAYOREO 15%', W - margin - 21, 42, { align: 'center' });
 // }

  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(232, 230, 225);
  doc.text('Cotización de productos', margin, 46);

  y = 62;

  // ── Encabezado tabla ──
  doc.setFillColor(28, 28, 28);
  doc.rect(margin, y - 5, W - margin * 2, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(200, 169, 106);
  doc.text('PRODUCTO',  margin + 2, y + 1);
  doc.text('CATEGORÍA', 110,        y + 1);
  doc.text('CANT.',     148,        y + 1, { align: 'center' });
  doc.text('P. UNIT.',  167,        y + 1, { align: 'center' });
  doc.text('SUBTOTAL',  W - margin - 2, y + 1, { align: 'right' });
  y += 10;

  // ── Filas ──
  cart.forEach((item, i) => {
    const sub = item.price * item.qty;
    if (i % 2 === 0) {
      doc.setFillColor(22, 22, 22);
      doc.rect(margin, y - 4, W - margin * 2, 10, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(210, 208, 200);
    const nombre = item.name.length > 42 ? item.name.substring(0, 40) + '…' : item.name;
    doc.text(nombre, margin + 2, y + 2);

    doc.setTextColor(160, 155, 148);
    doc.setFontSize(7.5);
    doc.text(item.cat, 110, y + 2);

    doc.setTextColor(210, 208, 200);
    doc.text(String(item.qty), 148, y + 2, { align: 'center' });
    doc.text(`$${fmt(item.price)}`, 167, y + 2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(`$${fmt(sub)}`, W - margin - 2, y + 2, { align: 'right' });

    doc.setDrawColor(40, 40, 40);
    doc.line(margin, y + 6, W - margin, y + 6);
    y += 12;
  });

  // ── Bloque de totales ──
  y += 4;
  const bloqueH = hayDescuento ? 42 : 28;
  doc.setFillColor(20, 20, 20);
  doc.rect(margin, y - 4, W - margin * 2, bloqueH, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(136, 132, 128);
  doc.text(`Productos: ${cart.length}`, margin + 4, y + 4);
  doc.text(`Piezas totales: ${totalQty}`, margin + 4, y + 11);

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(136, 132, 128);
  doc.text('Subtotal:', W - margin - 40, y + 4);
  doc.setTextColor(210, 208, 200);
  doc.text(`$${fmt(subtotal)}`, W - margin - 2, y + 4, { align: 'right' });

  if (hayDescuento) {
    // Línea descuento
    doc.setTextColor(200, 169, 106);
    doc.setFont('helvetica', 'bold');
    doc.text('', W - margin - 40, y + 12);
    doc.text(`-$${fmt(descuento)}`, W - margin - 2, y + 12, { align: 'right' });

    // Total con descuento
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(136, 132, 128);
    doc.text('Total', W - margin - 2, y + 22, { align: 'right' });
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(18);
    doc.setTextColor(200, 169, 106);
    doc.text(`$${fmt(total)} MXN`, W - margin - 2, y + 32, { align: 'right' });
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(136, 132, 128);
    doc.text('Total estimado', W - margin - 2, y + 14, { align: 'right' });
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(18);
    doc.setTextColor(200, 169, 106);
    doc.text(`$${fmt(total)} MXN`, W - margin - 2, y + 24, { align: 'right' });
  }

  // ── Nota al pie ──
  y += bloqueH + 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  doc.text('* Esta cotización es orientativa y puede estar sujeta a cambios sin previo aviso.', margin, y);
  doc.text('* Precios expresados en Pesos Mexicanos (MXN).', margin, y + 5);
  if (!hayDescuento) {
    doc.text(`* Descuento de 15% disponible a partir de ${DISCOUNT_MIN} piezas en el carrito.`, margin, y + 10);
  }

  // Footer línea
  doc.setDrawColor(200, 169, 106);
  doc.setLineWidth(0.3);
  doc.line(margin, 285, W - margin, 285);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(70, 70, 70);
  doc.text('GOATAURA · Mayoreo y menudeo de calidad en un solo lugar · 2026', W / 2, 289, { align: 'center' });

  doc.save(`GOATAURA_Cotizacion_${Date.now()}.pdf`);
  showToast('✓ PDF descargado — abriendo WhatsApp...');
}

// ══════════════════════════════════════════
// ── ENVIAR A WHATSAPP ──
// ══════════════════════════════════════════

function sendWhatsApp() {
  const cart = getCart();
  if (cart.length === 0) return;

  const { totalQty, subtotal, hayDescuento, descuento, total } = calcTotals(cart);
  const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  // Construir el mensaje
  let msg = ` *COTIZACIÓN GOATAURA* — ${fecha}\n`;
  msg    += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  cart.forEach((item, i) => {
    msg += `*${i + 1}. ${item.name}*\n`;
    msg += `   Categoría: ${item.cat}\n`;
    msg += `   Cantidad: ${item.qty} pza(s)\n`;
    msg += `   Precio unitario: $${fmt(item.price)}\n`;
    msg += `   Subtotal: $${fmt(item.price * item.qty)}\n\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📦 Piezas totales: *${totalQty}*\n`;
  msg += `🧾 Subtotal: $${fmt(subtotal)}\n`;

  if (hayDescuento) {
   // msg += `🎉 Descuento mayoreo (15%): -$${fmt(descuento)}\n`;
   // msg += `✅ *TOTAL CON DESCUENTO: $${fmt(total)} MXN*\n\n`;
   // msg += `_Aplica descuento por mayoreo (${totalQty} piezas)_\n`;
  } else {
    msg += `💰 *TOTAL: $${fmt(total)} MXN*\n\n`;
   // msg += `_Descuento de 15% disponible a partir de ${DISCOUNT_MIN} piezas._\n`;
  }

  msg += `\n_El PDF con la cotización se descargó automáticamente._`;

  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}
// ══════════════════════════════════════════
// ── MENÚ HAMBURGUESA (MÓVIL) ──
// ══════════════════════════════════════════
const hamburger  = document.getElementById('nav-hamburger');
const navLinksEl = document.querySelector('.nav-links');

if (hamburger && navLinksEl) {

  hamburger.addEventListener('click', e => {
    e.stopPropagation();
    hamburger.classList.toggle('open');
    navLinksEl.classList.toggle('open');
  });

  document.querySelectorAll('.nav-links > li > a').forEach(link => {
    const dd = link.nextElementSibling;
    if (!dd || !dd.classList.contains('dropdown')) return;
    link.addEventListener('click', e => {
      if (window.innerWidth > 768) return;
      e.preventDefault();
      const li = link.parentElement;
      document.querySelectorAll('.nav-links > li.open').forEach(el => {
        if (el !== li) el.classList.remove('open');
      });
      li.classList.toggle('open');
    });
  });

  document.querySelectorAll('.dropdown a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinksEl.classList.remove('open');
    });
  });

  document.addEventListener('click', e => {
    const nb = document.getElementById('navbar');
    if (nb && !nb.contains(e.target)) {
      hamburger.classList.remove('open');
      navLinksEl.classList.remove('open');
    }
  });
}