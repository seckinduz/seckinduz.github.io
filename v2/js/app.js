/* seckinduz.github.io v2.0 — Expedition Command Center. Vanilla JS + MapLibre GL (globe). */
const CONFIG = {
  GOOGLE_CLIENT_ID: "",        // <-- tek satir ayar: Google Cloud Console > OAuth Web Client ID (bos = misafir modu)
  FIREBASE: null,              // <-- opsiyonel: {apiKey, authDomain, projectId, ...} (liderlik/oy icin sunucu eklenirse)
  YT_API_KEY: "",              // <-- opsiyonel: bos degilse Radar 'En cok izlenenler' canli izlenme ile siralanir
  SITE: "https://seckinduz.github.io"
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("sd2_" + k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("sd2_" + k, JSON.stringify(v)); } catch (e) {} }
};
const TZ_LANG = { "Europe/Amsterdam": "nl", "Europe/Brussels": "nl", "Europe/Istanbul": "tr", "Europe/Berlin": "de", "Europe/Vienna": "de", "Europe/Zurich": "de", "Europe/Madrid": "es", "America/Mexico_City": "es", "America/Argentina/Buenos_Aires": "es", "Europe/Paris": "fr", "America/Sao_Paulo": "pt", "Europe/Lisbon": "pt", "Europe/Moscow": "ru", "Asia/Riyadh": "ar", "Africa/Cairo": "ar", "Asia/Dubai": "ar", "Asia/Kolkata": "hi", "Asia/Calcutta": "hi", "Asia/Tokyo": "ja" };
const S = { lang: "en", cat: "all", tab: "places", visited: store.get("visited", {}), bucket: store.get("bucket", {}), user: store.get("user", null),
  sugg: store.get("sugg", []), scores: store.get("scores", []), radar: "new", current: null, markers: [] };

function detectLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q && LANGS[q]) return q;
  const saved = store.get("lang", null); if (saved && LANGS[saved]) return saved;
  for (const l of navigator.languages || [navigator.language || "en"]) { const c = l.slice(0, 2).toLowerCase(); if (LANGS[c]) return c; }
  try { const z = Intl.DateTimeFormat().resolvedOptions().timeZone; if (TZ_LANG[z]) return TZ_LANG[z]; } catch (e) {}
  return "en";
}
const t = k => (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k;
const pi = p => (window.PI18N && PI18N[p.slug] && PI18N[p.slug][S.lang]) || null;
const tagOf = p => { const x = pi(p); return x ? x[0] : (p.tag[S.lang] || p.tag.en); };
const sumOf = p => { const x = pi(p); return x ? x[1] : ""; };
const norm = s => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/ß/g, "ss");
const bySlug = s => PLACES.find(p => p.slug === s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toast = (m, ms = 3800) => { const e = $("#toast"); e.textContent = m; e.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => e.hidden = true, ms); };
const hav = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180, dl = r(c - a), dn = r(d - b); const x = Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const released = v => new Date(v.date + "T17:58:00+01:00") <= new Date();

/* ---------- i18n ---------- */
function applyLang(l, push) {
  S.lang = l; store.set("lang", l);
  document.documentElement.lang = l; document.documentElement.dir = RTL.includes(l) ? "rtl" : "ltr";
  $$("[data-i]").forEach(e => e.textContent = t(e.dataset.i));
  $$("[data-ph]").forEach(e => e.placeholder = t(e.dataset.ph));
  $("#h1").textContent = t("tagline"); $("#sub").textContent = t("sub");
  document.title = t("tagline") + " — " + t("sub").slice(0, 60) + " | seckinduz";
  $('meta[name=description]').content = t("sub");
  $('meta[property="og:title"]').content = document.title;
  $("#lang").value = l;
  renderChips(); renderAuth(); renderTab(); renderRadar(); renderRings();
  if (S.current) fillDossier(S.current, S.currentVid);
  if (push) syncUrl(true);
}

/* ---------- harita ---------- */
let map;
function initMap() {
  map = new maplibregl.Map({
    container: "map", center: [20, 30], zoom: innerWidth > 820 ? 2.15 : 1.1, minZoom: 0.8, maxZoom: 17, attributionControl: { compact: true }, pitch: 0, hash: false,
    style: { version: 8, projection: { type: "globe" },
      sky: { "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0] },
      sources: { sat: { type: "raster", tileSize: 256, maxzoom: 17, attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"] } },
      layers: [{ id: "bg", type: "background", paint: { "background-color": "#05080F" } },
        { id: "sat", type: "raster", source: "sat", paint: { "raster-brightness-max": 0.78, "raster-saturation": -0.15, "raster-contrast": 0.12 } }] }
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-left");
  map.on("style.load", () => { try { map.setProjection({ type: "globe" }); map.setSky({ "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0], "sky-color": "#05080F", "horizon-color": "#00F0FF", "fog-color": "#0a1830", "sky-horizon-blend": 0.4, "horizon-fog-blend": 0.5, "fog-ground-blend": 0.2 }); } catch (e) {} });
  map.on("load", () => { renderMarkers(); spin(); lab(); });
  map.on("zoom", lab);
  map.on("mousemove", e => setCoord(e.lngLat.lat, e.lngLat.lng));
  map.on("move", () => { const c = map.getCenter(); setCoord(c.lat, c.lng); });
  ["mousedown", "touchstart", "wheel"].forEach(ev => map.on(ev, () => spin.stop = true));
}
function lab() { document.body.classList.toggle("labels", map.getZoom() >= 3.2); }
function setCoord(a, o) { $("#coord").textContent = `${a.toFixed(4)}°, ${o.toFixed(4)}°`; }
function spin() { if (spin.stop || S.current) return; const c = map.getCenter(); c.lng -= 0.35; map.easeTo({ center: c, duration: 1000, easing: x => x }); map.once("moveend", () => setTimeout(spin, 0)); }
function renderMarkers() {
  S.markers.forEach(m => m.remove()); S.markers = [];
  PLACES.filter(p => S.cat === "all" || p.cat === S.cat).forEach(p => {
    const el = document.createElement("div"); el.className = "pin " + (p.cat === "nature" ? "am" : "") + (S.visited[p.slug] ? " vis" : "");
    el.innerHTML = `<i></i><span>${esc(p.name)} · ${Math.abs(p.lat).toFixed(1)}°${p.lat >= 0 ? "N" : "S"}</span>`;
    el.setAttribute("role", "button"); el.tabIndex = 0; el.setAttribute("aria-label", p.name);
    el.addEventListener("click", ev => { ev.stopPropagation(); openPlace(p); });
    el.addEventListener("keydown", ev => { if (ev.key === "Enter") openPlace(p); });
    S.markers.push(new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lon, p.lat]).addTo(map));
  });
}
function fly(lat, lon, z = 7.2, pitch = 55) { spin.stop = true; const d = innerWidth > 820; map.flyTo({ center: [lon, lat], zoom: z, pitch, bearing: (lon * 3) % 60 - 20, speed: 0.9, curve: 1.5, essential: true, padding: d ? { left: 360, right: S.current ? 390 : 0, top: 0, bottom: 0 } : { left: 0, right: 0, top: 40, bottom: S.current ? innerHeight * 0.52 : 100 } }); }

/* ---------- dossier ---------- */
function openPlace(p, vid, nofly) {
  S.current = p; S.currentVid = vid;
  if (!nofly) fly(p.lat, p.lon);
  if (!p.extra && !S.visited[p.slug]) { S.visited[p.slug] = new Date().toISOString().slice(0, 10); store.set("visited", S.visited); addPoints(5); renderRings(); renderTab(); renderMarkers(); toast("🛂 " + t("stamps") + ": " + p.name); }
  fillDossier(p, vid); $("#dossier").hidden = false; syncUrl(); document.body.classList.add("dopen");
  if (innerWidth <= 820) $("#left").classList.remove("open");
}
function fillDossier(p, vid) {
  $("#dcat").textContent = t(p.cat); $("#dname").textContent = p.name;
  $("#dsub").textContent = `${p.country} · ${p.lat.toFixed(4)}°, ${p.lon.toFixed(4)}°`;
  $("#dtag").textContent = tagOf(p); $("#dsum").textContent = sumOf(p);
  const v = vid ? VIDEOS.find(x => x.id === vid) : VIDEOS.find(x => x.slug === p.slug);
  const box = $("#dvideo");
  if (v && v.id && released(v)) box.innerHTML = `<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${v.id}?rel=0&playsinline=1" title="${esc(v.title)}" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  else if (v) box.innerHTML = `<div class="pre">▶ ${t("premiere")}<br><b>${v.date} · 17:58 CET</b><br>${esc(v.title)}</div>`;
  else box.innerHTML = `<div class="pre">◎ ${esc(p.name)}</div>`;
  const a = $("#dart"); a.href = p.extra ? "https://www.youtube.com/@seckinduz" : `${CONFIG.SITE}/articles/${p.slug}.html`; a.textContent = t("article") + " →"; a.target = "_blank";
  $("#dstamp").textContent = "✦ " + (S.visited[p.slug] ? "✓ " : "") + t("stamp");
  $("#dbucket").textContent = (S.bucket[p.slug] !== undefined ? "★ " : "☆ ") + t("addbucket");
  $("#packNote").textContent = S.user ? "✓ " + t("unlock") : "🔒 " + t("locked");
}
function closePlace() { S.current = null; $("#dossier").hidden = true; document.body.classList.remove("dopen"); syncUrl(); spin.stop = false; map.easeTo({ pitch: 0, zoom: innerWidth > 820 ? 2.15 : 1.1, padding: { left: innerWidth > 820 ? 360 : 0, right: 0, top: 0, bottom: 0 }, duration: 1600 }); setTimeout(spin, 1700); }
function syncUrl(replace) {
  const u = new URL(location.href); u.searchParams.set("lang", S.lang);
  if (S.current && !S.current.extra) u.searchParams.set("place", S.current.slug); else u.searchParams.delete("place");
  history[replace ? "replaceState" : "pushState"]({ p: S.current ? S.current.slug : null }, "", u);
  const canon = $("link[rel=canonical]"); canon.href = CONFIG.SITE + "/" + (S.current && !S.current.extra ? "?place=" + S.current.slug : "");
  document.title = S.current ? `${S.current.name} — ${tagOf(S.current)} | seckinduz` : t("tagline") + " | seckinduz";
  if (S.current) $('meta[name=description]').content = `${S.current.name}, ${S.current.country}: ${tagOf(S.current)}`;
  jsonld();
}
function jsonld() {
  const g = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebSite", "@id": CONFIG.SITE + "/#site", url: CONFIG.SITE + "/", name: "Weirdest Borders & Hidden Places", inLanguage: Object.keys(LANGS), author: { "@type": "Person", name: "Seçkin Düz", sameAs: ["https://www.youtube.com/@seckinduz", "https://beacons.ai/seckinduz"] },
      potentialAction: { "@type": "SearchAction", target: CONFIG.SITE + "/?q={q}", "query-input": "required name=q" } },
    { "@type": "ItemList", name: "25 Weirdest Borders & Hidden Places", itemListElement: PLACES.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${CONFIG.SITE}/articles/${p.slug}.html`,
      item: { "@type": "Place", name: p.name, description: p.tag.en, geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lon } } })) }] };
  $("#ld").textContent = JSON.stringify(g);
}

/* ---------- sol panel ---------- */
function renderChips() {
  const cats = ["all", "borders", "engineering", "nature"];
  $("#chips").innerHTML = cats.map(c => `<button class="chip ${S.cat === c ? "on" : ""}" data-c="${c}">${t(c)}</button>`).join("");
  $$("#chips .chip").forEach(b => b.onclick = () => { S.cat = b.dataset.c; renderChips(); renderMarkers(); renderTab(); });
}
function renderRings() {
  const n = Object.keys(S.visited).filter(s => bySlug(s)).length; $("#ringN").textContent = n;
  const cats = ["borders", "engineering", "nature"], cols = ["#00F0FF", "#FF9E00", "#2eff9a"]; let h = "";
  const arc = (r, f, col, w) => { const c = 2 * Math.PI * r; h += `<circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(0,240,255,.12)" stroke-width="${w}"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" style="filter:drop-shadow(0 0 4px ${col})"/>`; };
  arc(54, n / 25, "#fff", 5);
  cats.forEach((c, i) => { const tot = PLACES.filter(p => p.cat === c).length, v = PLACES.filter(p => p.cat === c && S.visited[p.slug]).length; arc(44 - i * 9, v / tot, cols[i], 5); });
  $("#rings").innerHTML = h;
}
function renderAuth() {
  const e = $("#auth");
  if (S.user) { e.innerHTML = `<div class="who">${S.user.picture ? `<img src="${esc(S.user.picture)}" alt="" referrerpolicy="no-referrer">` : "👤"}<div><b>${esc(S.user.name)}</b><br><small class="mono dim">${S.user.guest ? t("guest") : "Google"}</small></div></div><button class="btn" id="so">${t("signout")}</button>`; $("#so").onclick = () => { S.user = null; store.set("user", null); renderAuth(); renderTab(); if (S.current) fillDossier(S.current); }; return; }
  e.innerHTML = `<button class="btn gbtn wide" id="gs"><svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.6 2.3-6.4 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg><span>${t("signin")}</span></button><button class="btn wide" id="gst">${t("guest")}</button>${CONFIG.GOOGLE_CLIENT_ID ? '<div id="gbox"></div>' : ""}`;
  $("#gst").onclick = () => { S.user = { name: "Explorer", guest: true }; store.set("user", S.user); renderAuth(); renderTab(); };
  $("#gs").onclick = () => { if (!CONFIG.GOOGLE_CLIENT_ID) return toast(t("cfg"), 6000); loadGoogle(); };
}
function loadGoogle() {
  const go = () => { google.accounts.id.initialize({ client_id: CONFIG.GOOGLE_CLIENT_ID, callback: r => { try { const j = JSON.parse(decodeURIComponent(escape(atob(r.credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))))); S.user = { name: j.name, picture: j.picture, email: j.email }; store.set("user", S.user); renderAuth(); renderTab(); addPoints(10); } catch (e) { toast("Login error"); } } }); google.accounts.id.prompt(); };
  if (window.google && google.accounts) return go();
  const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.onload = go; document.head.appendChild(s);
}
function addPoints(n) { const me = S.scores.find(x => x.me); if (me) me.pts += n; else S.scores.push({ me: true, name: S.user ? S.user.name : "You", pts: n }); store.set("scores", S.scores); }

/* sekmeler */
function renderTab() {
  $$("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.t === S.tab));
  const b = $("#tabbody"), list = PLACES.filter(p => S.cat === "all" || p.cat === S.cat);
  if (S.tab === "places") b.innerHTML = `<ul>${list.map(p => `<li><button class="n" data-s="${p.slug}">${S.visited[p.slug] ? "✓ " : "○ "}${esc(p.name)}</button><span class="small mono">${esc(p.country.split("(")[0].trim())}</span></li>`).join("")}</ul>`;
  if (S.tab === "passport") b.innerHTML = `<div class="stamps">${PLACES.map(p => `<div class="stamp ${S.visited[p.slug] ? "on" : ""}"><b>${S.visited[p.slug] ? "✔" : "·"}</b>${esc(p.name)}<br>${S.visited[p.slug] || ""}</div>`).join("")}</div>`;
  if (S.tab === "bucket") b.innerHTML = Object.keys(S.bucket).length ? `<ul>${Object.keys(S.bucket).map(s => { const p = bySlug(s); return p ? `<li style="display:block"><button class="n" data-s="${s}">★ ${esc(p.name)}</button><textarea data-n="${s}" rows="2" placeholder="${t("notes")}">${esc(S.bucket[s])}</textarea></li>` : ""; }).join("")}</ul>` : `<p class="dim">${t("empty")}</p>`;
  if (S.tab === "board") {
    const demo = [["Marco_R", 245], ["Aylin", 190], ["Kenji", 160], ["Lena", 120], ["Omar", 95]].map(x => ({ name: x[0], pts: x[1] }));
    const all = [...demo, ...S.scores.map(s => ({ name: s.name, pts: s.pts, me: s.me }))].sort((a, b) => b.pts - a.pts).slice(0, 8);
    b.innerHTML = `<ul>${all.map((s, i) => `<li><span>${i + 1}. ${esc(s.name)}${s.me ? " ★" : ""}</span><b class="ok">${s.pts} ${t("pts")}</b></li>`).join("")}</ul><p class="small">${t("demo")}</p>
      <h4 style="margin:12px 0 4px;color:var(--am)">${t("suggest")}</h4><input class="t" id="sg" maxlength="60" placeholder="…"><button class="btn wide" id="sga" style="margin-top:6px">${t("add")}</button>
      <ul>${S.sugg.map((s, i) => `<li><span>${esc(s.n)}</span><button class="btn" data-v="${i}">▲ ${s.v}</button></li>`).join("")}</ul>`;
    $("#sga").onclick = () => { const v = $("#sg").value.trim(); if (!v) return; S.sugg.push({ n: v, v: 1 }); store.set("sugg", S.sugg); renderTab(); };
    $$("[data-v]", b).forEach(x => x.onclick = () => { if (!S.user) return toast(t("locked")); S.sugg[+x.dataset.v].v++; store.set("sugg", S.sugg); renderTab(); });
  }
  $$("[data-s]", b).forEach(x => x.onclick = () => { const p = bySlug(x.dataset.s); if (p) openPlace(p); });
  $$("[data-n]", b).forEach(x => x.oninput = () => { S.bucket[x.dataset.n] = x.value; store.set("bucket", S.bucket); });
}

/* ---------- arama (cift katman) ---------- */
function trig(s) { const o = new Set(); s = "  " + s + " "; for (let i = 0; i < s.length - 2; i++) o.add(s.slice(i, i + 3)); return o; }
function sim(a, b) { const A = trig(a), B = trig(b); let n = 0; A.forEach(x => { if (B.has(x)) n++; }); return n / Math.max(1, Math.min(A.size, B.size)); }
function localSearch(q) {
  const n = norm(q); if (!n) return [];
  return PLACES.map(p => { const fields = [p.name, p.country, ...Object.values(PI18N[p.slug] || {}).map(x => x[0]), ...p.alias].map(norm);
    let sc = 0; fields.forEach((f, i) => { if (f.includes(n)) sc = Math.max(sc, 1 + (i === 0 ? 1 : 0)); else sc = Math.max(sc, sim(n, f) * (n.length > 3 ? 0.9 : 0)); }); return { p, sc }; })
    .filter(x => x.sc > 0.55).sort((a, b) => b.sc - a.sc).slice(0, 6).map(x => x.p);
}
let sTimer;
function doSearch(q) {
  const box = $("#sres"); if (!q.trim()) { box.hidden = true; return; }
  const loc = localSearch(q);
  const render = (geo) => {
    box.innerHTML = `<h4>${t("places")}</h4>` + (loc.map(p => `<button data-s="${p.slug}">◎ ${esc(p.name)} <small class="dim">· ${esc(p.country)}</small></button>`).join("") || `<button disabled>${t("noresult")}</button>`) +
      `<h4>${t("world")}</h4>` + (geo.length ? geo.map((g, i) => `<button data-g="${i}">⌖ ${esc(g.label)}</button>`).join("") : `<button disabled>…</button>`);
    box.hidden = false;
    $$("[data-s]", box).forEach(x => x.onclick = () => { openPlace(bySlug(x.dataset.s)); box.hidden = true; });
    $$("[data-g]", box).forEach(x => x.onclick = () => { const g = geo[+x.dataset.g]; closeQuiet(); fly(g.lat, g.lon, g.z, 40); box.hidden = true; });
  };
  render([]);
  clearTimeout(sTimer);
  if (q.trim().length < 3) return;
  sTimer = setTimeout(async () => {
    try {
      const lg = ["de", "en", "fr"].includes(S.lang) ? S.lang : "en";
      const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=${lg}`); const j = await r.json();
      const seen = new Set(); render(j.features.map(f => { const p = f.properties, c = f.geometry.coordinates; return { lat: c[1], lon: c[0], z: p.type === "country" ? 4.5 : p.type === "state" ? 6 : 10, label: [p.name, p.state, p.country].filter((v, i, a) => v && a.indexOf(v) === i).join(", ") }; }).filter(g => !seen.has(g.label) && seen.add(g.label)));
    } catch (e) { render([]); }
  }, 350);
}
function closeQuiet() { if (S.current) { S.current = null; $("#dossier").hidden = true; syncUrl(); } }

/* ---------- Teleport ---------- */
function teleport() {
  if (!navigator.geolocation) return toast("Geolocation ✗");
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: a, longitude: o } = pos.coords; closeQuiet(); fly(a, o, 8, 55);
    const n = PLACES.map(p => ({ p, d: hav(a, o, p.lat, p.lon) })).sort((x, y) => x.d - y.d)[0];
    $("#near").innerHTML = `${t("nearest")}: <a href="#" id="nl">${esc(n.p.name)}</a> · ${Math.round(n.d)} ${t("away")}`; $("#nl").onclick = e => { e.preventDefault(); openPlace(n.p); };
  }, () => toast("Geolocation ✗ (permission)"), { timeout: 8000 });
}

/* ---------- Radar ---------- */
let viewCache = null;
async function loadViews() {
  if (viewCache || !CONFIG.YT_API_KEY) return;
  try { const ids = VIDEOS.filter(v => v.id).map(v => v.id).join(","); const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${CONFIG.YT_API_KEY}`); const j = await r.json();
    viewCache = {}; j.items.forEach(i => viewCache[i.id] = +i.statistics.viewCount); renderRadar(); } catch (e) {}
}
function renderRadar() {
  const vids = VIDEOS.filter(v => v.id && released(v));
  const list = S.radar === "new" ? [...vids].sort((a, b) => b.date.localeCompare(a.date)) : [...vids].sort((a, b) => ((viewCache && viewCache[b.id]) || 0) - ((viewCache && viewCache[a.id]) || 0) || a.date.localeCompare(b.date));
  $("#rlist").innerHTML = list.map(v => `<li><button data-v="${v.id}"><img class="th" loading="lazy" alt="" src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg"><span>${esc(v.title)}<small>${v.date}${viewCache && viewCache[v.id] != null ? " · " + viewCache[v.id] + " ▶" : ""}</small></span></button></li>`).join("") || `<li class="dim" style="padding:10px">${t("empty")}</li>`;
  $$("#rlist [data-v]").forEach(b => b.onclick = () => { const v = VIDEOS.find(x => x.id === b.dataset.v); const p = v.slug ? bySlug(v.slug) : { slug: "extra-" + v.id, name: v.title.replace(/\s*\(.*\)/, "").slice(0, 40), country: "Belgium / Germany", lat: v.lat, lon: v.lon, cat: "borders", tag: { en: v.title }, alias: [], extra: true }; openPlace(p, v.id); });
  $$("#radar .rt button").forEach(b => b.classList.toggle("on", b.dataset.r === S.radar));
}

/* ---------- Border Quiz ---------- */
function quiz() {
  const qs = [...PLACES].sort(() => Math.random() - .5).slice(0, 8).map(p => {
    const ctry = [...new Set(PLACES.map(x => x.country))]; const wrong = ctry.filter(c => c !== p.country).sort(() => Math.random() - .5).slice(0, 3);
    return { p, opts: [...wrong, p.country].sort(() => Math.random() - .5), a: p.country };
  });
  let i = 0, sc = 0; const m = $("#quiz"), body = $("#qbody"); m.hidden = false;
  const step = () => {
    if (i >= qs.length) { addPoints(sc * 10); renderTab(); body.innerHTML = `<h3>${t("quiz")} ✓</h3><p style="font-size:2rem;margin:8px 0;color:var(--am)">${t("score")}: ${sc}/${qs.length}</p><button class="btn cyan" id="qa">${t("start")}</button>`; $("#qa").onclick = quiz; return; }
    const q = qs[i]; body.innerHTML = `<h3>${t("quiz")} · ${t("question")} ${i + 1}/${qs.length}</h3><p style="font-size:1.1rem">⌖ ${esc(q.p.name)} <small class="dim mono">${q.p.lat.toFixed(2)}°, ${q.p.lon.toFixed(2)}°</small></p><div class="opts">${q.opts.map(o => `<button class="btn" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    fly(q.p.lat, q.p.lon, 5, 30);
    $$("[data-o]", body).forEach(b => b.onclick = () => { const ok = b.dataset.o === q.a; if (ok) sc++; $$("[data-o]", body).forEach(x => { x.disabled = true; if (x.dataset.o === q.a) x.classList.add("good"); }); if (!ok) b.classList.add("bad"); setTimeout(() => { i++; step(); }, 900); });
  };
  step();
}

/* ---------- baslat ---------- */
function boot() {
  $("#lang").innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  $("#lang").onchange = e => applyLang(e.target.value, true);
  initMap();
  $("#q").addEventListener("input", e => doSearch(e.target.value));
  $("#q").addEventListener("keydown", e => { if (e.key === "Enter") { const f = $("#sres button:not([disabled])"); if (f) f.click(); } });
  document.addEventListener("click", e => { if (!e.target.closest(".search")) $("#sres").hidden = true; });
  $("#tp").onclick = teleport; $("#quizBtn").onclick = quiz; $("#qx").onclick = () => $("#quiz").hidden = true; $("#dx").onclick = closePlace;
  $("#dstamp").onclick = () => { const p = S.current; if (!p || p.extra) return; S.visited[p.slug] = S.visited[p.slug] || new Date().toISOString().slice(0, 10); store.set("visited", S.visited); renderRings(); renderTab(); renderMarkers(); fillDossier(p, S.currentVid); };
  $("#dbucket").onclick = () => { const p = S.current; if (!p || p.extra) return; if (S.bucket[p.slug] === undefined) S.bucket[p.slug] = ""; else delete S.bucket[p.slug]; store.set("bucket", S.bucket); renderTab(); fillDossier(p, S.currentVid); };
  $$("#tabs button").forEach(b => b.onclick = () => { S.tab = b.dataset.t; renderTab(); });
  $$("#radar .rt button").forEach(b => b.onclick = () => { S.radar = b.dataset.r; if (S.radar === "top") loadViews(); renderRadar(); });
  $("#grabL").onclick = () => $("#left").classList.toggle("open");
  addEventListener("popstate", () => { const p = new URLSearchParams(location.search).get("place"); if (p && bySlug(p)) openPlace(bySlug(p), null, false); else if (S.current) { S.current = null; $("#dossier").hidden = true; } });
  { const c = new URLSearchParams(location.search).get("cat"); if (["borders", "engineering", "nature"].includes(c)) S.cat = c; }
  applyLang(detectLang(), false);
  const qp = new URLSearchParams(location.search).get("place");
  if (qp && bySlug(qp)) map.once("load", () => openPlace(bySlug(qp)));
  syncUrl(true);
}
document.addEventListener("DOMContentLoaded", boot);
