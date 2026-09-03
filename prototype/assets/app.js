/* ragcooking — utilidades comunes del prototipo: iconos, tooltips del diccionario, toast */

function initIconos() { window.lucide && window.lucide.createIcons(); }

/* Tooltip del diccionario de términos: cualquier <span data-term="x"> muestra su definición */
function initTooltips() {
  let tt = document.createElement('div');
  tt.className = 'tt'; document.body.appendChild(tt);
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-term]');
    if (!t || !TERMINOS[t.dataset.term]) { tt.classList.remove('visible'); return; }
    tt.innerHTML = `<span class="tt-t">${t.dataset.term}</span>${TERMINOS[t.dataset.term]}`;
    tt.classList.add('visible');
    const r = t.getBoundingClientRect();
    const x = Math.min(Math.max(10, r.left), window.innerWidth - 340);
    const y = r.bottom + 8 + window.scrollY > window.scrollY + window.innerHeight - 10
      ? r.top + window.scrollY - tt.offsetHeight - 8 : r.bottom + window.scrollY + 8;
    tt.style.left = x + 'px'; tt.style.top = y + 'px';
  });
  document.addEventListener('scroll', () => tt.classList.remove('visible'), true);
}

let toastTimer = null;
function toast(msg, esError) {
  let t = document.getElementById('toast-rc');
  if (!t) { t = document.createElement('div'); t.id = 'toast-rc'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.toggle('error', !!esError); t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 2600);
}

document.addEventListener('DOMContentLoaded', () => { initIconos(); initTooltips(); });
