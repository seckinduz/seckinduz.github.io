/* seckinduz.com v2.5 — Dark Editorial Map & Discovery Portal. Vanilla JS + MapLibre GL (globe). */
const CONFIG = {
  GOOGLE_CLIENT_ID: "",        // <-- tek satir ayar: Google Cloud Console > OAuth Web Client ID (bos = misafir modu)
  FIREBASE: null,              // <-- opsiyonel: liderlik/oy icin sunucu eklenirse
  YT_API_KEY: "",              // <-- opsiyonel: bos degilse "En cok izlenenler" canli izlenme ile siralanir
  SITE: "https://seckinduz.com"
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("sd2_" + k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("sd2_" + k, JSON.stringify(v)); } catch (e) {} }
};
const TZ_LANG = { "Europe/Amsterdam": "nl", "Europe/Brussels": "nl", "Europe/Istanbul": "tr", "Europe/Berlin": "de", "Europe/Vienna": "de", "Europe/Zurich": "de", "Europe/Madrid": "es", "America/Mexico_City": "es", "America/Argentina/Buenos_Aires": "es", "Europe/Paris": "fr", "America/Sao_Paulo": "pt", "Europe/Lisbon": "pt", "Europe/Moscow": "ru", "Asia/Riyadh": "ar", "Africa/Cairo": "ar", "Asia/Dubai": "ar", "Asia/Kolkata": "hi", "Asia/Calcutta": "hi", "Asia/Tokyo": "ja" };
const STORIES = ["baarle-nassau-border-town", "point-roberts-washington", "maeslantkering-storm-barrier", "kinderdijk-windmills", "socotra-dragon-blood-trees", "darvaza-gas-crater"];
const S = { lang: "en", cat: "all", tab: "passport", visited: store.get("visited", {}), bucket: store.get("bucket", {}), user: store.get("user", null),
  sugg: store.get("sugg", []), scores: store.get("scores", []), radar: "new", current: null, markers: [], layer: "sat", vis: true, artAll: false };

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
const goMap = () => { $("#map").scrollIntoView({ behavior: "smooth", block: "start" }); };
const wide = () => innerWidth > 860;

/* ---------- i18n ---------- */
function applyLang(l, push) {
  S.lang = l; store.set("lang", l);
  document.documentElement.lang = l; document.documentElement.dir = RTL.includes(l) ? "rtl" : "ltr";
  $$("[data-i]").forEach(e => e.textContent = t(e.dataset.i));
  $$("[data-ph]").forEach(e => e.placeholder = t(e.dataset.ph));
  $("#pillTxt").textContent = "25 · 11 · 3D";
  document.title = t("hero_h") + " | seckinduz";
  $('meta[name=description]').content = t("hero_p");
  $('meta[property="og:title"]').content = document.title;
  $("#lang").value = l;
  $("#fsTxt").textContent = t(document.fullscreenElement || $("#stage").classList.contains("fs") ? "exitfs" : "fullscreen");
  renderAuth(); renderTab(); renderRadar(); renderRings(); renderArticles(); renderStories(); renderLocal(); if (L.c) fetchNotes(); coopLocale();
  if (S.current) fillDossier(S.current, S.currentVid);
  if (push) syncUrl(true);
}

/* ---------- harita ---------- */
let map;
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/";
const SAT_SRC = { type: "raster", tileSize: 256, maxzoom: 17, attribution: "Imagery © Esri, Maxar, Earthstar Geographics", tiles: [ESRI + "World_Imagery/MapServer/tile/{z}/{y}/{x}"] };
const LBL_SRC = { type: "raster", tileSize: 256, maxzoom: 14, tiles: [ESRI + "Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"] };
const DEM_SRC = { type: "raster-dem", tileSize: 256, maxzoom: 14, encoding: "terrarium", attribution: "Terrain © Mapzen / AWS", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"] };
const CLARITY_SRC = { type: "raster", tileSize: 256, maxzoom: 17, attribution: "Imagery © Esri, Maxar, Earthstar Geographics", tiles: ["https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"] };
const IMG_PAINT = { "raster-brightness-max": 0.78, "raster-saturation": -0.15, "raster-contrast": 0.12 };
const STYLES = { dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json", sat: null, terrain: null };
/* Carto (Protomaps semali) vektor katmanlarindan yol / dere / sinir / isim bindirmesi: her zoomda keskin */
function vecOverlay(cj) {
  const out = [];
  cj.layers.forEach(l => {
    if (l.source !== "protomaps") return;
    const sl = l["source-layer"], id = l.id, c = JSON.parse(JSON.stringify(l)); delete c.metadata;
    if (l.type === "line") {
      if (sl === "roads") {
        if (/aeroway|rail|ferry|runway|taxiway|tunnel/.test(id)) return;
        const casing = /case/.test(id); let col = "rgba(255,255,255,.85)";
        if (/mot/.test(id)) col = "#ffb347"; else if (/trunk/.test(id)) col = "#ffc766"; else if (/pri/.test(id)) col = "#ffffff"; else if (/sec/.test(id)) col = "#eaf7ff"; else if (/path/.test(id)) col = "#7ffbff";
        c.paint = { "line-color": casing ? "rgba(3,8,15,.75)" : col };
        if (l.paint && l.paint["line-width"]) c.paint["line-width"] = l.paint["line-width"];
        if (!casing && l.paint && l.paint["line-dasharray"]) c.paint["line-dasharray"] = l.paint["line-dasharray"];
        if (!casing && !/path/.test(id)) c.paint["line-opacity"] = 0.92;
      } else if (id === "waterway") c.paint = { "line-color": "#5cc8ff", "line-width": l.paint["line-width"] };
      else if (sl === "boundaries") { c.paint = { "line-color": "#ffffff", "line-opacity": 0.7 }; if (l.paint["line-width"]) c.paint["line-width"] = l.paint["line-width"]; if (l.paint["line-dasharray"]) c.paint["line-dasharray"] = l.paint["line-dasharray"]; }
      else return;
    } else if (l.type === "symbol") {
      if (!["places", "roads", "water"].includes(sl) || (l.layout && l.layout["icon-image"])) return;
      c.paint = { "text-color": "#ffffff", "text-halo-color": "#05080F", "text-halo-width": 1.6 };
    } else return;
    out.push(c);
  });
  return out;
}
/* uydu: Esri Clarity ustte, standart Esri altta (Clarity karosu yoksa alttaki gorunur); zoom 17 ile sinirli */
function mkStyle(terr) {
  const cj = S.carto, vec = cj && cj.sources && cj.sources.protomaps && cj.glyphs;
  const sources = { sat: SAT_SRC, clarity: CLARITY_SRC };
  if (vec) sources.protomaps = cj.sources.protomaps; else sources.lbl = LBL_SRC;
  const layers = [{ id: "bg", type: "background", paint: { "background-color": "#05080F" } }, { id: "sat", type: "raster", source: "sat", paint: IMG_PAINT }, { id: "clarity", type: "raster", source: "clarity", paint: IMG_PAINT }];
  if (terr) { sources.dem = DEM_SRC; sources.hs = DEM_SRC; layers.push({ id: "hs", type: "hillshade", source: "hs", paint: { "hillshade-exaggeration": 0.55, "hillshade-shadow-color": "#000", "hillshade-highlight-color": "#fff" } }); }
  if (vec) layers.push(...vecOverlay(cj)); else layers.push({ id: "lbl", type: "raster", source: "lbl", minzoom: 3 });
  const st = { version: 8, projection: { type: "globe" }, sources, layers }; if (vec) st.glyphs = cj.glyphs; return st;
}
function initMap() {
  map = new maplibregl.Map({ container: "mapEl", center: [20, 30], zoom: wide() ? 2.2 : 1.1, minZoom: 0.8, maxZoom: 17, maxPitch: 75, cooperativeGestures: true, locale: coopText(), attributionControl: { compact: true }, pitch: 0, hash: false, style: STYLES.sat });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-left");
  map.on("style.load", () => { try { map.setProjection({ type: "globe" }); drawLocal(); map.setSky({ "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0], "sky-color": "#05080F", "horizon-color": "#00F0FF", "fog-color": "#0a1830", "sky-horizon-blend": 0.4, "horizon-fog-blend": 0.5, "fog-ground-blend": 0.2 }); } catch (e) {} });
  map.on("load", () => { renderMarkers(); spin(); lab(); localInit(); });
  map.on("zoom", lab); map.on("zoomend", syncTerrain);
  map.on("mousemove", e => setCoord(e.lngLat.lat, e.lngLat.lng));
  map.on("move", () => { const c = map.getCenter(); setCoord(c.lat, c.lng); });
  ["mousedown", "touchstart", "wheel"].forEach(ev => map.on(ev, () => spin.stop = true));
  new IntersectionObserver(es => { S.vis = es[0].isIntersecting; }, { threshold: 0.1 }).observe($("#stage"));
}
function coopText() { return { "CooperativeGesturesHandler.WindowsHelpText": t("ctrlscroll"), "CooperativeGesturesHandler.MacHelpText": t("ctrlscroll").replace("Ctrl", "⌘"), "CooperativeGesturesHandler.MobileHelpText": t("twofinger") }; }
function coopLocale() { try { if (map) map._locale = Object.assign({}, map._locale || {}, coopText()); } catch (e) {} }
/* MapLibre 5.6: terrain + kure projeksiyonu dusuk zoomda hata veriyor -> arazi yalnizca zoom>=4.5'te ve katman 3D iken acilir */
function syncTerrain() {
  try { const want = S.layer === "terrain" && map.getZoom() >= 4.5 && !!map.getSource("dem");
    if (want && !map.getTerrain()) map.setTerrain({ source: "dem", exaggeration: 1.6 }); else if (!want && map.getTerrain()) map.setTerrain(null); } catch (e) {}
}
function setLayer(l) {
  if (l === S.layer) return; S.layer = l; $$("#layers button").forEach(b => b.classList.toggle("on", b.dataset.l === l));
  try { map.setTerrain(null); } catch (e) {}
  map.setMaxZoom(l === "dark" ? 18 : 17);
  requestAnimationFrame(() => { map.setStyle(STYLES[l]); map.once("idle", syncTerrain); });
  if (l === "terrain" && map.getZoom() > 4.5) map.easeTo({ pitch: 62, duration: 1200 });
  if (l !== "terrain" && map.getPitch() > 0 && !S.current) map.easeTo({ pitch: 0, duration: 800 });
}
function lab() { document.body.classList.toggle("labels", map.getZoom() >= 3.2); }
function setCoord(a, o) { $("#coord").textContent = `${a.toFixed(4)}°, ${o.toFixed(4)}°`; }
function spin() { if (spin.stop || S.current) return; if (!S.vis || document.hidden) return setTimeout(spin, 1500); const c = map.getCenter(); c.lng -= 0.35; map.easeTo({ center: c, duration: 1000, easing: x => x }); map.once("moveend", () => setTimeout(spin, 0)); }
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
function fly(lat, lon, z = 7.2, pitch = 55) {
  spin.stop = true; const d = wide();
  map.flyTo({ center: [lon, lat], zoom: z, pitch, bearing: (lon * 3) % 60 - 20, speed: 0.9, curve: 1.5, essential: true,
    padding: d ? { left: 0, right: S.current ? 390 : 0, top: 0, bottom: 0 } : { left: 0, right: 0, top: 70, bottom: S.current ? $("#stage").clientHeight * 0.5 : 0 } });
}

/* ---------- dossier ---------- */
function openPlace(p, vid, nofly) {
  S.current = p; S.currentVid = vid;
  if (!nofly) fly(p.lat, p.lon);
  if (!p.extra && !S.visited[p.slug]) { S.visited[p.slug] = new Date().toISOString().slice(0, 10); store.set("visited", S.visited); addPoints(5); renderRings(); renderTab(); renderMarkers(); toast("🛂 " + t("stamps") + ": " + p.name); }
  fillDossier(p, vid); $("#dossier").hidden = false; if (!wide()) $("#local").classList.add("closed"); syncUrl();
}
function showOnMap(p, vid) { goMap(); setTimeout(() => openPlace(p, vid), 450); }
function fillDossier(p, vid) {
  $("#dcat").textContent = t(p.cat); $("#dname").textContent = p.name;
  $("#dsub").textContent = `${p.country} · ${p.lat.toFixed(4)}°, ${p.lon.toFixed(4)}°`;
  $("#dtag").textContent = tagOf(p); $("#dsum").textContent = sumOf(p);
  const v = vid ? VIDEOS.find(x => x.id === vid) : VIDEOS.find(x => x.slug === p.slug);
  const box = $("#dvideo");
  if (v && v.id && released(v)) box.innerHTML = `<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${v.id}?rel=0&playsinline=1" title="${esc(v.title)}" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  else if (v) box.innerHTML = `<div class="pre">▶ ${t("premiere")}<br><b>${v.date} · 17:58 CET</b><br>${esc(v.title)}</div>`;
  else box.innerHTML = `<div class="pre">◎ ${esc(p.name)}</div>`;
  const dc = $("#dcomment"); if (v && v.id && released(v)) { dc.href = ytUrl(v.id); dc.textContent = "💬 " + t("ytcomment"); dc.hidden = false; } else dc.hidden = true;
  const a = $("#dart"); a.href = p.extra ? "https://www.youtube.com/@seckinduz" : `./articles/${p.slug}.html`; a.textContent = t("article") + " →"; a.target = "_blank";
  $("#dstamp").textContent = "✦ " + (S.visited[p.slug] ? "✓ " : "") + t("stamp");
  $("#dbucket").textContent = (S.bucket[p.slug] !== undefined ? "★ " : "☆ ") + t("addbucket");
}
function closePlace() { S.current = null; $("#dossier").hidden = true; syncUrl(); spin.stop = false; map.easeTo({ pitch: 0, zoom: wide() ? 2.2 : 1.1, padding: { left: 0, right: 0, top: 0, bottom: 0 }, duration: 1600 }); setTimeout(spin, 1700); }
function closeQuiet() { if (S.current) { S.current = null; $("#dossier").hidden = true; syncUrl(); } }
function syncUrl(replace) {
  const u = new URL(location.href); u.searchParams.set("lang", S.lang);
  if (S.current && !S.current.extra) u.searchParams.set("place", S.current.slug); else u.searchParams.delete("place");
  history[replace ? "replaceState" : "pushState"]({ p: S.current ? S.current.slug : null }, "", u);
  const canon = $("link[rel=canonical]"); canon.href = CONFIG.SITE + "/" + (S.current && !S.current.extra ? "?place=" + S.current.slug : "");
  document.title = S.current ? `${S.current.name} — ${tagOf(S.current)} | seckinduz` : t("hero_h") + " | seckinduz";
  if (S.current) $('meta[name=description]').content = `${S.current.name}, ${S.current.country}: ${tagOf(S.current)}`;
  jsonld();
}
function jsonld() {
  const g = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebSite", "@id": CONFIG.SITE + "/#site", url: CONFIG.SITE + "/", name: "Weirdest Borders & Hidden Places", inLanguage: Object.keys(LANGS), author: { "@type": "Person", name: "Seçkin Düz", sameAs: ["https://www.youtube.com/@seckinduz", "https://beacons.ai/seckinduz"] },
      potentialAction: { "@type": "SearchAction", target: CONFIG.SITE + "/?q={q}", "query-input": "required name=q" } },
    { "@type": "ItemList", name: "25 Weirdest Borders & Hidden Places", itemListElement: PLACES.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${CONFIG.SITE}/articles/${p.slug}.html`,
      item: { "@type": "Place", name: p.name, description: p.tag.en, geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lon } } })) },
    { "@type": "VideoGallery", name: "@seckinduz Shorts", video: VIDEOS.filter(v => v.id && released(v)).map(v => ({ "@type": "VideoObject", name: v.title, thumbnailUrl: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, uploadDate: v.date, embedUrl: `https://www.youtube.com/embed/${v.id}`, description: v.title })) }] };
  $("#ld").textContent = JSON.stringify(g);
}

/* ---------- Radar (video vitrini) ---------- */
let viewCache = null;
async function loadViews() {
  if (viewCache || !CONFIG.YT_API_KEY) return;
  try { const ids = VIDEOS.filter(v => v.id).map(v => v.id).join(","); const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${CONFIG.YT_API_KEY}`); const j = await r.json();
    viewCache = {}; j.items.forEach(i => viewCache[i.id] = +i.statistics.viewCount); renderRadar(); } catch (e) {}
}
const placeOfVideo = v => v.slug ? bySlug(v.slug) : { slug: "extra-" + v.id, name: v.name || v.title.replace(/\s*\(.*\)/, "").slice(0, 40), country: "Belgium / Germany", lat: v.lat, lon: v.lon, cat: "borders", tag: { en: v.title }, alias: [], extra: true };
function renderRadar() {
  const vids = VIDEOS.filter(v => v.id && released(v));
  const list = S.radar === "new" ? [...vids].sort((a, b) => b.date.localeCompare(a.date)) : [...vids].sort((a, b) => ((viewCache && viewCache[b.id]) || 0) - ((viewCache && viewCache[a.id]) || 0) || a.date.localeCompare(b.date));
  $("#rlist").innerHTML = list.map(v => `<article class="vcard"><button class="vthumb" data-v="${v.id}" aria-label="${esc(v.title)}"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg"></button>
    <div class="vinfo"><h3>${esc(v.title)}</h3><div class="meta">${v.date}${viewCache && viewCache[v.id] != null ? " · " + viewCache[v.id] + " ▶" : ""}</div><button class="btn" data-m="${v.id}">⌖ ${t("showonmap")}</button></div></article>`).join("") || `<p class="dim">${t("empty")}</p>`;
  const up = VIDEOS.filter(v => v.id && !released(v)).sort((a, b) => a.date.localeCompare(b.date));
  if (S.radar === "new" && up.length) $("#rlist").insertAdjacentHTML("beforeend", up.map(v => { const p = placeOfVideo(v); return `<article class="vcard soon"><button class="vthumb" data-m="${v.id}" aria-label="${esc(v.title)}" style="background-image:url(${cardImg(p)})"><span class="soonb mono">${t("premiere")} · ${v.date} · 17:58 CET</span></button><div class="vinfo"><h3>${esc(v.title)}</h3><div class="meta">${esc(p.name)}</div><button class="btn" data-m="${v.id}">⌖ ${t("showonmap")}</button></div></article>`; }).join(""));
  $$("#rlist [data-v]").forEach(b => b.onclick = () => playVideo(b.dataset.v));
  $$("#rlist [data-m]").forEach(b => b.onclick = () => { const v = VIDEOS.find(x => x.id === b.dataset.m); showOnMap(placeOfVideo(v), v.id); });
  $$("#rtabs button").forEach(b => b.classList.toggle("on", b.dataset.r === S.radar));
}
const ytUrl = id => `https://www.youtube.com/watch?v=${id}`;
function playVideo(id) {
  const v = VIDEOS.find(x => x.id === id);
  $("#vbody").innerHTML = `<div class="vframe"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1&playsinline=1" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div><p class="vt">${esc(v.title)}</p><div class="vact"><button class="btn amber" id="vm" type="button">⌖ ${t("showonmap")}</button><a class="btn" id="vc" href="${ytUrl(id)}" target="_blank" rel="noopener">💬 ${t("ytcomment")}</a></div>`;
  $("#vmodal").hidden = false; $("#vm").onclick = () => { closeVideo(); showOnMap(placeOfVideo(v), id); };
}
function closeVideo() { $("#vmodal").hidden = true; $("#vbody").innerHTML = ""; }

/* ---------- Makale kartlari ---------- */
function cardImg(p, portrait) {
  const h = (p.slug.startsWith("sealand") ? 0.2 : p.cat === "nature" ? 0.09 : 0.045) * (portrait ? 1.5 : 1), w = h * (portrait ? 9 / 16 : 16 / 9) / Math.cos(p.lat * Math.PI / 180);
  return `${ESRI}World_Imagery/MapServer/export?bbox=${(p.lon - w / 2).toFixed(4)},${(p.lat - h / 2).toFixed(4)},${(p.lon + w / 2).toFixed(4)},${(p.lat + h / 2).toFixed(4)}&bboxSR=4326&imageSR=4326&size=${portrait ? "360,640" : "640,360"}&format=jpg&f=image`;
}
function renderArticles() {
  const cats = ["all", "borders", "engineering", "nature"];
  $("#atabs").innerHTML = cats.map(c => `<button data-c="${c}" class="${S.cat === c ? "on" : ""}">${t(c)} ${c === "all" ? PLACES.length : PLACES.filter(p => p.cat === c).length}</button>`).join("");
  $$("#atabs button").forEach(b => b.onclick = () => { S.cat = b.dataset.c; S.artAll = false; renderArticles(); renderMarkers(); renderTab(); });
  const all = PLACES.filter(p => S.cat === "all" || p.cat === S.cat), compact = !wide() && !S.artAll && all.length > 6;
  $("#amore").innerHTML = compact ? `<button class="btn cyan big" id="amoreB" type="button">${t("showall").replace("{n}", all.length)} ▾</button>` : "";
  $("#agrid").innerHTML = (compact ? all.slice(0, 6) : all).map(p => {
    const a = (window.ARTICLES && ARTICLES[p.slug]) || [p.name, p.tag.en, 3];
    return `<article class="acard"><div class="aimg"><img loading="lazy" alt="${esc(p.name)} — satellite view" src="${cardImg(p)}"><span class="badge ${p.cat}">${t(p.cat)}</span><span class="rt">${a[2]} ${t("min")}</span></div>
      <div class="abody"><span class="place">${esc(p.name)} · ${esc(p.country)}</span><h3>${esc(a[0])}</h3><p>${esc(sumOf(p) || tagOf(p))}</p>
      <div class="row"><a class="btn cyan" href="./articles/${p.slug}.html">${t("article")} →</a><button class="btn" data-sm="${p.slug}">⌖ ${t("showonmap")}</button>${STORIES.includes(p.slug) ? `<a class="btn amber" href="./stories/${p.slug}.html">▤ ${t("story")}</a>` : ""}</div></div></article>`;
  }).join("");
  $$("#agrid [data-sm]").forEach(b => b.onclick = () => showOnMap(bySlug(b.dataset.sm)));
  if ($("#amoreB")) $("#amoreB").onclick = () => { S.artAll = true; renderArticles(); };
}
function renderStories() {
  $("#sgrid").innerHTML = STORIES.map(s => { const p = bySlug(s); return `<a class="scard" href="./stories/${s}.html" style="background-image:url(${cardImg(p, true)})"><div><small>▤ ${t("story")}</small><b>${esc(p.name)}</b><small>${t("openstory")} →</small></div></a>`; }).join("");
}

/* ---------- Pasaport / giris ---------- */
function renderRings() {
  const n = Object.keys(S.visited).filter(s => bySlug(s)).length; $("#ringN").textContent = n;
  const cats = ["borders", "engineering", "nature"], cols = ["#00F0FF", "#FF9E00", "#2eff9a"]; let h = "";
  const arc = (r, f, col, w) => { const c = 2 * Math.PI * r; h += `<circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(0,240,255,.12)" stroke-width="${w}"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" style="filter:drop-shadow(0 0 4px ${col})"/>`; };
  arc(54, n / 25, "#fff", 5);
  cats.forEach((c, i) => { const tot = PLACES.filter(p => p.cat === c).length, v = PLACES.filter(p => p.cat === c && S.visited[p.slug]).length; arc(44 - i * 9, v / tot, cols[i], 5); });
  $("#rings").innerHTML = h;
}
function renderAuth() {
  const e = $("#auth"), hb = $("#authTxt");
  hb.removeAttribute("data-i"); hb.textContent = S.user ? S.user.name : t("passbtn");
  if (S.user) { e.innerHTML = `<div class="who">${S.user.picture ? `<img src="${esc(S.user.picture)}" alt="" referrerpolicy="no-referrer">` : "👤"}<div><b>${esc(S.user.name)}</b><br><small class="mono dim">${S.user.guest ? t("guest") : "Google"}</small></div></div><button class="btn" id="so">${t("signout")}</button>`; $("#so").onclick = () => { S.user = null; store.set("user", null); renderAuth(); renderTab(); if (S.current) fillDossier(S.current); }; return; }
  e.innerHTML = `<button class="btn gbtn wide" id="gs"><svg viewBox="0 0 48 48" width="16" height="16"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.6 2.3-6.4 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg><span>${t("signin")}</span></button><button class="btn wide" id="gst">${t("guest")}</button>`;
  $("#gst").onclick = () => { S.user = { name: "Explorer", guest: true }; store.set("user", S.user); renderAuth(); renderTab(); };
  $("#gs").onclick = () => { if (!CONFIG.GOOGLE_CLIENT_ID) return toast(t("cfg"), 6000); loadGoogle(); };
}
function loadGoogle() {
  const go = () => { google.accounts.id.initialize({ client_id: CONFIG.GOOGLE_CLIENT_ID, callback: r => { try { const j = JSON.parse(decodeURIComponent(escape(atob(r.credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))))); S.user = { name: j.name, picture: j.picture, email: j.email }; store.set("user", S.user); renderAuth(); renderTab(); addPoints(10); } catch (e) { toast("Login error"); } } }); google.accounts.id.prompt(); };
  if (window.google && google.accounts) return go();
  const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.onload = go; document.head.appendChild(s);
}
function addPoints(n) { const me = S.scores.find(x => x.me); if (me) me.pts += n; else S.scores.push({ me: true, name: S.user ? S.user.name : "You", pts: n }); store.set("scores", S.scores); }

function renderTab() {
  $$("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.t === S.tab));
  const b = $("#tabbody");
  if (S.tab === "passport") b.innerHTML = `<div class="stamps">${PLACES.map(p => `<div class="stamp ${S.visited[p.slug] ? "on" : ""}"><b>${S.visited[p.slug] ? "✔" : "·"}</b>${esc(p.name)}<br>${S.visited[p.slug] || ""}</div>`).join("")}</div>`;
  if (S.tab === "bucket") b.innerHTML = Object.keys(S.bucket).length ? `<ul>${Object.keys(S.bucket).map(s => { const p = bySlug(s); return p ? `<li style="display:block"><button class="n" data-s="${s}">★ ${esc(p.name)}</button><textarea data-n="${s}" rows="2" placeholder="${t("notes")}">${esc(S.bucket[s])}</textarea></li>` : ""; }).join("")}</ul>` : `<p class="dim">${t("empty")}</p>`;
  if (S.tab === "board") {
    const demo = [["Marco_R", 245], ["Aylin", 190], ["Kenji", 160], ["Lena", 120], ["Omar", 95]].map(x => ({ name: x[0], pts: x[1] }));
    const all = [...demo, ...S.scores.map(s => ({ name: s.name, pts: s.pts, me: s.me }))].sort((a, b) => b.pts - a.pts).slice(0, 8);
    b.innerHTML = `<ul>${all.map((s, i) => `<li><span>${i + 1}. ${esc(s.name)}${s.me ? " ★" : ""}</span><b class="ok">${s.pts} ${t("pts")}</b></li>`).join("")}</ul><p class="small">${t("demo")}</p>
      <h4 style="margin:14px 0 4px;color:var(--am)">${t("suggest")}</h4><input class="t" id="sg" maxlength="60" placeholder="…"><button class="btn wide" id="sga" style="margin-top:6px">${t("add")}</button>
      <ul>${S.sugg.map((s, i) => `<li><span>${esc(s.n)}</span><button class="btn" data-v="${i}">▲ ${s.v}</button></li>`).join("")}</ul>`;
    $("#sga").onclick = () => { const v = $("#sg").value.trim(); if (!v) return; S.sugg.push({ n: v, v: 1 }); store.set("sugg", S.sugg); renderTab(); };
    $$("[data-v]", b).forEach(x => x.onclick = () => { if (!S.user) return toast(t("locked")); S.sugg[+x.dataset.v].v++; store.set("sugg", S.sugg); renderTab(); });
  }
  $$("[data-s]", b).forEach(x => x.onclick = () => { const p = bySlug(x.dataset.s); if (p) showOnMap(p); });
  $$("[data-n]", b).forEach(x => x.oninput = () => { S.bucket[x.dataset.n] = x.value; store.set("bucket", S.bucket); });
}

/* ---------- arama (cift katman: 25 mekan + dunya geocoding) ---------- */
function trig(s) { const o = new Set(); s = "  " + s + " "; for (let i = 0; i < s.length - 2; i++) o.add(s.slice(i, i + 3)); return o; }
function sim(a, b) { const A = trig(a), B = trig(b); let n = 0; A.forEach(x => { if (B.has(x)) n++; }); return n / Math.max(1, Math.min(A.size, B.size)); }
function localSearch(q) {
  const n = norm(q); if (!n) return [];
  return PLACES.map(p => { const fields = [p.name, p.country, ...Object.values(PI18N[p.slug] || {}).map(x => x[0]), ...p.alias].map(norm);
    let sc = 0; fields.forEach((f, i) => { if (f.includes(n)) sc = Math.max(sc, 1 + (i === 0 ? 1 : 0)); else sc = Math.max(sc, sim(n, f) * (n.length > 3 ? 0.9 : 0)); }); return { p, sc }; })
    .filter(x => x.sc > 0.55).sort((a, b) => b.sc - a.sc).slice(0, 6).map(x => x.p);
}
let sTimer;
const zoomFor = (type, v) => ({ country: 4.6, state: 6.2, county: 8, city: 10.8, town: 11.5, district: 12.5, locality: 13, suburb: 13.5, neighbourhood: 14.5, village: 12, street: 16, house: 17 }[type] || (v === "administrative" ? 7 : 11));
async function geocode(q) {
  const lg = ["de", "en", "fr"].includes(S.lang) ? S.lang : "en", out = [];
  try {
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6${S.lang === "tr" ? "" : "&lang=" + lg}`); const j = await r.json();
    j.features.forEach(f => { const p = f.properties, c = f.geometry.coordinates, e = p.extent;
      out.push({ lat: c[1], lon: c[0], z: zoomFor(p.type, p.osm_value), bbox: e ? [[e[0], e[3]], [e[2], e[1]]] : null, label: [p.name, p.district && p.district !== p.name ? p.district : null, p.city && p.city !== p.name ? p.city : null, p.state, p.country].filter((v, i, a) => v && a.indexOf(v) === i).join(", ") }); });
  } catch (e) {}
  if (!out.length) { try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=6&accept-language=${S.lang}`); const j = await r.json();
    j.forEach(x => out.push({ lat: +x.lat, lon: +x.lon, z: zoomFor(x.type, x.category), bbox: [[+x.boundingbox[2], +x.boundingbox[0]], [+x.boundingbox[3], +x.boundingbox[1]]], label: x.display_name.split(", ").slice(0, 4).join(", ") }));
  } catch (e) {} }
  const seen = new Set(); return out.filter(g => !seen.has(g.label) && seen.add(g.label));
}
function flyGeo(g) {
  closeQuiet(); spin.stop = true; $("#sres").hidden = true; setLocal(g.lat, g.lon, g.label.split(",")[0], "search", g.z >= 8);
  if (g.z < 8 && g.bbox && g.bbox[0][0] !== g.bbox[1][0]) map.fitBounds(g.bbox, { maxZoom: Math.max(g.z, 13), padding: 60, pitch: 35, duration: 2400 });
  else fly(g.lat, g.lon, Math.max(g.z, 11.5), 40);
}
function doSearch(q) {
  const box = $("#sres"); if (!q.trim()) { box.hidden = true; return; }
  const loc = localSearch(q);
  const render = (geo, loading) => {
    box.innerHTML = `<h4>${t("places")}</h4>` + (loc.map(p => `<button data-s="${p.slug}">◎ ${esc(p.name)} <small class="dim">· ${esc(p.country)}</small></button>`).join("") || `<button disabled>${t("noresult")}</button>`) +
      `<h4>${t("world")}</h4>` + (geo.length ? geo.map((g, i) => `<button data-g="${i}">⌖ ${esc(g.label)}</button>`).join("") : `<button disabled>${loading ? "…" : t("noresult")}</button>`);
    box.hidden = false;
    $$("[data-s]", box).forEach(x => x.onclick = () => { openPlace(bySlug(x.dataset.s)); box.hidden = true; });
    $$("[data-g]", box).forEach(x => x.onclick = () => flyGeo(geo[+x.dataset.g]));
  };
  render([], q.trim().length >= 2);
  clearTimeout(sTimer);
  if (q.trim().length < 2) return;
  sTimer = setTimeout(async () => { render(await geocode(q), false); }, 320);
}

/* ---------- Teleport ---------- */
function teleport() { goMap(); setTimeout(gpsGo, 400); }

/* ---------- Border Quiz (10 soru) ---------- */
function quiz() {
  const ctry = [...new Set(PLACES.map(x => x.country))];
  const qs = [...PLACES].sort(() => Math.random() - .5).slice(0, 10).map(p => {
    const wrong = ctry.filter(c => c !== p.country).sort(() => Math.random() - .5).slice(0, 3);
    return { p, opts: [...wrong, p.country].sort(() => Math.random() - .5), a: p.country };
  });
  let i = 0, sc = 0; const m = $("#quiz"), body = $("#qbody"); m.hidden = false;
  const step = () => {
    if (i >= qs.length) { addPoints(sc * 10); renderTab(); body.innerHTML = `<h3>${t("quiz")} ✓</h3><p style="font-size:2rem;margin:8px 0;color:var(--am)">${t("score")}: ${sc}/${qs.length}</p><button class="btn cyan" id="qa">${t("start")}</button>`; $("#qa").onclick = quiz; return; }
    const q = qs[i]; body.innerHTML = `<h3>${t("quiz")} · ${t("question")} ${i + 1}/${qs.length}</h3><p style="font-size:1.1rem">⌖ ${esc(q.p.name)} <small class="dim mono">${q.p.lat.toFixed(2)}°, ${q.p.lon.toFixed(2)}°</small></p><div class="opts">${q.opts.map(o => `<button class="btn" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    $$("[data-o]", body).forEach(b => b.onclick = () => { const ok = b.dataset.o === q.a; if (ok) sc++; $$("[data-o]", body).forEach(x => { x.disabled = true; if (x.dataset.o === q.a) x.classList.add("good"); }); if (!ok) b.classList.add("bad"); setTimeout(() => { i++; step(); }, 900); });
  };
  step();
}

/* ---------- tam ekran ---------- */
function toggleFs() {
  const st = $("#stage"), on = document.fullscreenElement || st.classList.contains("fs");
  if (on) { if (document.fullscreenElement) document.exitFullscreen(); st.classList.remove("fs"); }
  else if (st.requestFullscreen) st.requestFullscreen().catch(() => st.classList.add("fs")); else st.classList.add("fs");
  setTimeout(() => { try { (document.fullscreenElement || st.classList.contains("fs") ? map.cooperativeGestures.disable : map.cooperativeGestures.enable).call(map.cooperativeGestures); } catch (e) {} $("#fsTxt").textContent = t(document.fullscreenElement || st.classList.contains("fs") ? "exitfs" : "fullscreen"); map.resize(); }, 250);
}

/* ---------- baslat ---------- */
async function boot() {
  try { const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 5000); S.carto = await (await fetch(STYLES.dark, { signal: ctl.signal })).json(); clearTimeout(to); } catch (e) {}
  STYLES.sat = mkStyle(false); STYLES.terrain = mkStyle(true);
  $("#lang").innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  $("#lang").onchange = e => applyLang(e.target.value, true);
  S.lang = detectLang(); initMap();
  $("#q").addEventListener("input", e => doSearch(e.target.value));
  $("#q").addEventListener("keydown", e => { if (e.key === "Enter") { const f = $("#sres button:not([disabled])"); if (f) f.click(); } if (e.key === "Escape") $("#sres").hidden = true; });
  document.addEventListener("click", e => { if (!e.target.closest(".msearch")) $("#sres").hidden = true; });
  document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); goMap(); setTimeout(() => $("#q").focus(), 350); } if (e.key === "Escape") { $("#quiz").hidden = true; closeVideo(); } });
  $("#locBtn").onclick = () => $("#local").classList.toggle("closed"); $("#lmin").onclick = () => $("#local").classList.add("closed"); if (!wide()) $("#local").classList.add("closed");
  $("#tp").onclick = teleport; $("#quizBtn").onclick = quiz; $("#quizBtn2").onclick = quiz; $("#qx").onclick = () => $("#quiz").hidden = true; $("#vx").onclick = closeVideo; $("#dx").onclick = closePlace;
  $$(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m) { m.hidden = true; if (m.id === "vmodal") closeVideo(); } }));
  $("#fs").onclick = toggleFs; document.addEventListener("fullscreenchange", () => { $("#fsTxt").textContent = t(document.fullscreenElement ? "exitfs" : "fullscreen"); setTimeout(() => map.resize(), 200); });
  $$("#layers button").forEach(b => b.onclick = () => setLayer(b.dataset.l));
  $("#dstamp").onclick = () => { const p = S.current; if (!p || p.extra) return; S.visited[p.slug] = S.visited[p.slug] || new Date().toISOString().slice(0, 10); store.set("visited", S.visited); renderRings(); renderTab(); renderMarkers(); fillDossier(p, S.currentVid); };
  $("#dbucket").onclick = () => { const p = S.current; if (!p || p.extra) return; if (S.bucket[p.slug] === undefined) S.bucket[p.slug] = ""; else delete S.bucket[p.slug]; store.set("bucket", S.bucket); renderTab(); fillDossier(p, S.currentVid); };
  $$("#tabs button").forEach(b => b.onclick = () => { S.tab = b.dataset.t; renderTab(); });
  $$("#rtabs button").forEach(b => b.onclick = () => { S.radar = b.dataset.r; if (S.radar === "top") loadViews(); renderRadar(); });
  $("#authBtn").onclick = () => { if (S.user) $("#passport").scrollIntoView({ behavior: "smooth" }); else if (!CONFIG.GOOGLE_CLIENT_ID) { $("#passport").scrollIntoView({ behavior: "smooth" }); toast(t("cfg"), 6000); } else loadGoogle(); };
  $("#burger").onclick = () => { const o = $("#mainnav").classList.toggle("open"); $("#burger").setAttribute("aria-expanded", o); };
  $$("#mainnav a").forEach(a => a.onclick = () => { $("#mainnav").classList.remove("open"); $("#burger").setAttribute("aria-expanded", false); });
  addEventListener("popstate", () => { const p = new URLSearchParams(location.search).get("place"); if (p && bySlug(p)) openPlace(bySlug(p), null, false); else if (S.current) { S.current = null; $("#dossier").hidden = true; } });
  const qs = new URLSearchParams(location.search), cat = qs.get("cat"); if (["borders", "engineering", "nature"].includes(cat)) S.cat = cat;
  matchMedia("(max-width:860px)").addEventListener("change", () => renderArticles());
  applyLang(detectLang(), false);
  const qp = qs.get("place");
  if (qp && bySlug(qp)) map.once("load", () => { goMap(); setTimeout(() => openPlace(bySlug(qp)), 500); });
  syncUrl(true);
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) addEventListener("load", () => { const had = !!navigator.serviceWorker.controller; navigator.serviceWorker.addEventListener("controllerchange", () => { if (had && !window.__rl) { window.__rl = 1; location.reload(); } }); navigator.serviceWorker.register("./service-worker.js").then(r => r.update()).catch(() => {}); });
}
document.addEventListener("DOMContentLoaded", boot);
