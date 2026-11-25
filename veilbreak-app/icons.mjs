// Icone vettoriali dell'interfaccia (linee sottili, colore del testo). icon("swords") restituisce un <svg>.
const paths = {
  swords: '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  scroll: '<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M15 8h-5M15 12h-5"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  cards: '<rect x="3" y="4" width="11" height="16" rx="1.5" transform="rotate(-8 8.5 12)"/><rect x="10" y="4" width="11" height="16" rx="1.5" transform="rotate(8 15.5 12)"/>',
  chest: '<path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10a8 5.5 0 0 1 16 0"/><path d="M10.5 12.5h3v3h-3z"/><path d="M4 14h6.5M13.5 14H20"/>',
  candle: '<path d="M12 2c1.8 2.6 3.5 4 3.5 6.6a3.5 3.5 0 0 1-7 0C8.5 6.4 10.2 4.8 12 2z"/><path d="M9.5 13h5v8h-5z"/><path d="M7 21h10"/>',
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.2" stroke-dasharray="3.1 2.55" stroke-width="3.2"/>',
  skull: '<path d="M9 21v-3H7a3 3 0 0 1-3-3v-4a8 8 0 0 1 16 0v4a3 3 0 0 1-3 3h-2v3z"/><circle cx="9" cy="12" r="1.7" fill="currentColor"/><circle cx="15" cy="12" r="1.7" fill="currentColor"/><path d="M11 21v-2M13 21v-2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  gem: '<path d="M12 2 20 9 12 22 4 9z" fill="currentColor" fill-opacity=".25"/><path d="M4 9h16M12 2 9 9l3 13 3-13z"/>',
  pack: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 7.5h14M5 16.5h14"/><path d="m12 9.5 1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9 11.8l2-.3z"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  shield: '<path d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" fill="currentColor" fill-opacity=".22"/><path d="M12 6v12M8 10h8"/>',
  bolt: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" fill="currentColor" fill-opacity=".3"/>',
  veil: '<path d="M2 12s3.6-6.5 10-6.5c2 0 3.7.6 5.1 1.5M22 12s-3.6 6.5-10 6.5c-2 0-3.7-.6-5.1-1.5"/><path d="M9.5 14.5a3.5 3.5 0 0 1 4.9-4.9"/><path d="M3 21 21 3"/>',
  fury: '<path d="M4 20 15 9M15 9l1.5-4.5L21 3l-1.5 4.5zM7 17l-2-2M5 21l-2-2"/><path d="M20 20 9 9M9 9 7.5 4.5 3 3l1.5 4.5zM17 17l2-2M19 21l2-2"/>',
  horn: '<path d="M3 10v4h3l7 5V5L6 10z" fill="currentColor" fill-opacity=".22"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  drop: '<path d="M12 2.5C9 7 6 10.2 6 14a6 6 0 0 0 12 0c0-3.8-3-7-6-11.5z" fill="currentColor" fill-opacity=".3"/>',
  chain: '<rect x="2.5" y="8.5" width="10" height="7" rx="3.5" transform="rotate(-35 7.5 12)"/><rect x="11.5" y="8.5" width="10" height="7" rx="3.5" transform="rotate(-35 16.5 12)"/>',
  mute: '<path d="M3 10v4h3l6 4.5v-13L6 10z"/><path d="m16 9 5 6M21 9l-5 6"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" fill="currentColor" fill-opacity=".25"/>',
  crown: '<path d="M3 18h18l-1.5-10-4.5 4-3-6-3 6-4.5-4z" fill="currentColor" fill-opacity=".2"/><path d="M4 21h16"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" fill-opacity=".2"/>',
};

export function icon(name, cls = "ico") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", cls);
  svg.innerHTML = paths[name] ?? "";
  return svg;
}

// Sostituisce gli elementi <i data-icon="nome"> della pagina con le icone.
export function mountIcons(root = document) {
  for (const el of root.querySelectorAll("i[data-icon]")) el.replaceWith(icon(el.dataset.icon, el.className || "ico"));
}
