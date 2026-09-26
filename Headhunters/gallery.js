'use strict';
const labels = { heroes: 'Hero', items: 'Item', spells: 'Spell' };
const grid = document.querySelector('#grid');
const status = document.querySelector('#status');
const viewer = document.querySelector('#viewer');
const fullCard = document.querySelector('#full-card');
let cards = [];
let selection = [];
let category = 'spells';
let currentIndex = 0;
let cardRequest = 0;
const packs = new Map();
const titleFor = card => `${labels[card.category]} ${String(card.number).padStart(2, '0')}`;
const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="750" height="1050"/%3E';
function cardSource(card) {
  if (!packs.has(card.pack)) {
    packs.set(card.pack, fetch(card.pack).then(response => {
      if (!response.ok) throw new Error('Card images unavailable');
      return response.json();
    }).catch(error => { packs.delete(card.pack); throw error; }));
  }
  return packs.get(card.pack).then(pack => pack[card.id]);
}
const observer = new IntersectionObserver(entries => {
  entries.filter(entry => entry.isIntersecting).forEach(entry => {
    const image = entry.target;
    observer.unobserve(image);
    const card = cards.find(item => item.id === image.dataset.card);
    cardSource(card).then(source => { image.src = source; }).catch(() => {
      image.alt = `${titleFor(card)} — select to retry loading`;
    });
  });
}, { rootMargin: '400px' });

function renderCards() {
  observer.disconnect();
  selection = cards.filter(card => card.category === category);
  grid.replaceChildren(...selection.map((card, index) => {
    const button = document.createElement('button');
    button.className = 'card';
    button.type = 'button';
    button.setAttribute('aria-label', `View ${titleFor(card)} at full size`);
    const image = document.createElement('img');
    image.src = placeholder;
    image.dataset.card = card.id;
    image.alt = `${titleFor(card)} card design`;
    image.width = 750;
    image.height = 1050;
    image.loading = 'lazy';
    image.decoding = 'async';
    const label = document.createElement('span');
    label.className = 'card-label';
    const text = document.createElement('span');
    text.textContent = titleFor(card);
    const icon = document.createElement('span');
    icon.className = 'view';
    icon.textContent = '↗';
    icon.setAttribute('aria-hidden', 'true');
    label.append(text, icon);
    button.append(image, label);
    button.addEventListener('click', () => openCard(index));
    observer.observe(image);
    return button;
  }));
  document.querySelectorAll('[data-category]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.category === category));
  });
  status.textContent = `${selection.length} ${category} · ${cards.length} designs in the collection`;
}

async function showCard(index) {
  const request = ++cardRequest;
  currentIndex = (index + selection.length) % selection.length;
  const card = selection[currentIndex];
  document.querySelector('#viewer-title').textContent = `${titleFor(card)} · ${currentIndex + 1} of ${selection.length}`;
  fullCard.src = placeholder;
  fullCard.alt = `${titleFor(card)} — full card with abilities and rules`;
  const download = document.querySelector('#download');
  download.removeAttribute('href');
  download.textContent = 'Loading card…';
  try {
    const source = await cardSource(card);
    if (request !== cardRequest) return;
    fullCard.src = source;
    download.href = source;
    download.download = `Headhunters-${card.id}.avif`;
    download.textContent = 'Download card';
  } catch {
    if (request !== cardRequest) return;
    fullCard.alt = 'This card could not load. Try the next card or reload the page.';
    download.textContent = 'Image unavailable';
  }
}
function openCard(index) {
  showCard(index);
  viewer.showModal();
  document.body.style.overflow = 'hidden';
}
document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
  category = button.dataset.category;
  renderCards();
}));
document.querySelector('.close').addEventListener('click', () => viewer.close());
viewer.addEventListener('close', () => { document.body.style.overflow = ''; });
viewer.addEventListener('click', event => {
  if (event.target === viewer) {
    const rect = viewer.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
  }
});
document.querySelector('#previous').addEventListener('click', () => showCard(currentIndex - 1));
document.querySelector('#next').addEventListener('click', () => showCard(currentIndex + 1));
viewer.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showCard(currentIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
fetch('cards.json').then(response => {
  if (!response.ok) throw new Error('Card index unavailable');
  return response.json();
}).then(data => { cards = data; renderCards(); }).catch(() => {
  status.textContent = 'The card collection could not load.';
  const message = document.createElement('p');
  message.className = 'error';
  message.textContent = 'Please reload this page, or use the GitHub link below to browse the card files.';
  grid.append(message);
});
