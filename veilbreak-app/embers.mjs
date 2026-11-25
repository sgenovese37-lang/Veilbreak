// Braci e cenere che salgono dietro i menu. Leggero: poche particelle, si ferma durante la partita,
// con l'app in secondo piano e se il telefono chiede meno animazioni.
export function startEmbers(canvas) {
  if (!canvas?.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let w = 0, h = 0, dpr = 1, last = 0;
  const parts = [];
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const spawn = (anywhere) => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : h + 10,
    r: 0.6 + Math.random() * 1.8,
    vy: 12 + Math.random() * 30,
    vx: -6 + Math.random() * 12,
    wob: Math.random() * Math.PI * 2,
    life: 0.5 + Math.random() * 0.5,
    hue: Math.random() < 0.18 ? 280 : 18 + Math.random() * 22,   // qualche scintilla viola del Velo
  });
  resize();
  window.addEventListener("resize", resize);
  const count = reduce ? 0 : Math.min(46, Math.round(w * h / 9000));
  for (let i = 0; i < count; i++) parts.push(spawn(true));
  const frame = time => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (time - last) / 1000 || 0);
    last = time;
    if (document.hidden || document.body.classList.contains("in-match") || !parts.length) return;
    // dopo la partita la tela torna visibile: rimisurarla se la sua misura è cambiata
    if (canvas.clientWidth !== w || canvas.clientHeight !== h) resize();
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (const p of parts) {
      p.wob += dt * 1.3;
      p.y -= p.vy * dt;
      p.x += (p.vx + Math.sin(p.wob) * 10) * dt;
      if (p.y < -10) Object.assign(p, spawn(false));
      const fade = Math.max(0, Math.min(1, p.y / (h * 0.35))) * p.life;
      if (p.x > w + 20 || p.x < -20) p.x = Math.random() * w;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${0.9 * fade})`);
      g.addColorStop(0.35, `hsla(${p.hue}, 100%, 50%, ${0.35 * fade})`);
      g.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
    }
  };
  requestAnimationFrame(frame);
}
