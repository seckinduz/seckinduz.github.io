/* v2.5 Yerel Kesif Radari: IP-geo (geojs.io), Overpass parkurlar (5 km), Wikipedia GeoSearch notlari, en yakin sira disi nokta, 3D rota ucusu. */
const L = { c: null, data: null, routes: [], sel: null, notes: null, busy: false, anim: null, show: { walk: true, bike: true, green: true }, err: "" };
/* sirayla denenir: overpass-api.de -> kumi.systems -> mail.ru */
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
const RADIUS = 3000;
const empty = () => ({ type: "FeatureCollection", features: [] });
const lenKm = c => { let d = 0; for (let i = 1; i < c.length; i++) d += hav(c[i - 1][1], c[i - 1][0], c[i][1], c[i][0]); return d; };

function localInit() {
  renderLocal();
  fetch("https://get.geojs.io/v1/ip/geo.json").then(r => r.json()).then(g => {
    if (L.c || !g.latitude) return;
    setLocal(+g.latitude, +g.longitude, g.city || g.region || g.country || "—", "ip", false);
  }).catch(() => { L.err = "ip"; renderLocal(); });
}
function setLocal(lat, lon, label, src, auto) {
  stopPreview(); L.c = { lat, lon, label, src }; L.data = null; L.routes = []; L.sel = null; L.notes = null; L.err = "";
  drawLocal(); renderLocal(); fetchNotes();
  if (auto) fetchTrails();
}

/* ---- Overpass: yuruyus / bisiklet / orman-park ---- */
async function fetchTrails() {
  if (!L.c || L.busy) return; L.busy = true; L.err = ""; renderLocal();
  const { lat, lon } = L.c, a = `(around:${RADIUS},${lat},${lon})`;
  const q = `[out:json][timeout:20];(way${a}["highway"~"^(footway|path|cycleway|track|bridleway)$"]["footway"!~"sidewalk|crossing"];way${a}["leisure"="park"];way${a}["landuse"="forest"];way${a}["natural"="wood"];);out geom qt 900;`;
  const key = "ov_" + lat.toFixed(2) + "_" + lon.toFixed(2); let j = null;
  try { j = JSON.parse(sessionStorage.getItem(key)); } catch (e) {}
  for (const ep of OVERPASS) {
    if (j) break; const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 24000);
    try { const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(q), signal: ctl.signal }); if (!r.ok) throw new Error(r.status); j = await r.json(); if (!j || !j.elements) j = null; }
    catch (e) { j = null; } finally { clearTimeout(to); }
  }
  if (j) { try { sessionStorage.setItem(key, JSON.stringify(j)); } catch (e) {} }
  L.busy = false;
  if (!j) { L.err = "net"; renderLocal(); return; }
  const walk = [], bike = [], green = [], ways = [];
  j.elements.forEach(e => {
    if (e.type !== "way" || !e.geometry || e.geometry.length < 2) return;
    const c = e.geometry.map(g => [g.lon, g.lat]), tg = e.tags || {}, f = { type: "Feature", properties: { name: tg.name || "" }, geometry: null };
    if (tg.highway) {
      f.geometry = { type: "LineString", coordinates: c };
      const kind = tg.highway === "cycleway" || tg.highway === "track" ? "bike" : "walk"; (kind === "bike" ? bike : walk).push(f);
      ways.push({ kind, name: tg.name || tg.ref || "", c, km: lenKm(c) });
    } else {
      const closed = c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1];
      f.geometry = closed && c.length > 3 ? { type: "Polygon", coordinates: [c] } : { type: "LineString", coordinates: c }; green.push(f);
    }
  });
  L.data = { walk: { type: "FeatureCollection", features: walk }, bike: { type: "FeatureCollection", features: bike }, green: { type: "FeatureCollection", features: green } };
  L.counts = { walk: walk.length, bike: bike.length, green: green.length };
  L.routes = buildRoutes(ways); L.sel = L.routes.length ? 0 : null;
  drawLocal(); renderLocal();
}
/* adli yollari birlestirip en uzun 6 rotayi sec */
function buildRoutes(ways) {
  const g = {}; ways.forEach(w => { const k = (w.name || "·" + w.kind) + "|" + w.kind; (g[k] = g[k] || []).push(w); });
  const out = [];
  Object.entries(g).forEach(([k, ws]) => {
    if (k.startsWith("·")) { ws.sort((a, b) => b.km - a.km).slice(0, 2).forEach((w, i) => out.push({ name: "", kind: w.kind, c: w.c, km: w.km })); return; }
    ws = [...ws].sort((a, b) => b.km - a.km); let chain = [...ws.shift().c], used = true;
    while (used && ws.length) { used = false;
      for (let i = 0; i < ws.length; i++) { const w = ws[i].c, s = chain[0], e = chain[chain.length - 1], eq = (p, q) => p[0] === q[0] && p[1] === q[1];
        if (eq(e, w[0])) chain = chain.concat(w.slice(1)); else if (eq(e, w[w.length - 1])) chain = chain.concat([...w].reverse().slice(1));
        else if (eq(s, w[w.length - 1])) chain = w.concat(chain.slice(1)); else if (eq(s, w[0])) chain = [...w].reverse().concat(chain.slice(1)); else continue;
        ws.splice(i, 1); used = true; break; } }
    out.push({ name: ws.length >= 0 ? k.split("|")[0] : "", kind: k.split("|")[1], c: chain, km: lenKm(chain) });
  });
  return out.filter(r => r.km >= 0.4).sort((a, b) => b.km - a.km).slice(0, 6);
}

/* ---- harita katmanlari ---- */
function drawLocal() {
  if (!map || !map.isStyleLoaded()) { map && map.once("idle", drawLocal); return; }
  const d = L.data || { walk: empty(), bike: empty(), green: empty() };
  const sel = L.sel != null && L.routes[L.sel] ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: L.routes[L.sel].c } } : empty();
  const put = (id, data) => { if (map.getSource(id)) map.getSource(id).setData(data); else map.addSource(id, { type: "geojson", data }); };
  put("L-green", d.green); put("L-walk", d.walk); put("L-bike", d.bike); put("L-sel", sel);
  const add = l => { if (!map.getLayer(l.id)) map.addLayer(l); };
  const vis = k => ({ visibility: L.show[k] ? "visible" : "none" });
  add({ id: "L-green-fill", type: "fill", source: "L-green", filter: ["==", "$type", "Polygon"], paint: { "fill-color": "#2eff9a", "fill-opacity": 0.16 }, layout: vis("green") });
  add({ id: "L-green-line", type: "line", source: "L-green", paint: { "line-color": "#2eff9a", "line-width": 1.2, "line-opacity": 0.6 }, layout: vis("green") });
  add({ id: "L-walk-glow", type: "line", source: "L-walk", paint: { "line-color": "#00F0FF", "line-width": 7, "line-blur": 5, "line-opacity": 0.45 }, layout: vis("walk") });
  add({ id: "L-walk", type: "line", source: "L-walk", paint: { "line-color": "#7ffbff", "line-width": 2 }, layout: vis("walk") });
  add({ id: "L-bike-glow", type: "line", source: "L-bike", paint: { "line-color": "#FF9E00", "line-width": 7, "line-blur": 5, "line-opacity": 0.45 }, layout: vis("bike") });
  add({ id: "L-bike", type: "line", source: "L-bike", paint: { "line-color": "#ffc766", "line-width": 2 }, layout: vis("bike") });
  add({ id: "L-sel-glow", type: "line", source: "L-sel", paint: { "line-color": "#ff3df2", "line-width": 16, "line-blur": 8, "line-opacity": 0.6 } });
  add({ id: "L-sel", type: "line", source: "L-sel", paint: { "line-color": "#fff", "line-width": 4.5 } });
}
function toggleKind(k, on) {
  L.show[k] = on; const v = on ? "visible" : "none";
  (k === "green" ? ["L-green-fill", "L-green-line"] : k === "walk" ? ["L-walk-glow", "L-walk"] : ["L-bike-glow", "L-bike"]).forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v); });
}

/* ---- Wikipedia GeoSearch ---- */
async function fetchNotes() {
  if (!L.c) return; const { lat, lon } = L.c, tok = L.c;
  const get = async lg => { try {
    const r = await fetch(`https://${lg}.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lon}&ggsradius=10000&ggslimit=14&prop=extracts|pageimages|coordinates&exintro=1&explaintext=1&exsentences=2&piprop=thumbnail&pithumbsize=160&format=json&origin=*`);
    const j = await r.json(); return Object.values((j.query && j.query.pages) || {}); } catch (e) { return []; } };
  let pages = await get(S.lang), lg = S.lang; if (pages.length < 2 && S.lang !== "en") { pages = await get("en"); lg = "en"; }
  if (tok !== L.c) return;
  L.notes = pages.filter(p => p.extract && p.coordinates).map(p => ({ s: (p.thumbnail ? 2 : 0) + (p.extract.length > 90 ? 1 : 0) - (p.index || 0) * 0.02, title: p.title, ex: p.extract, img: p.thumbnail && p.thumbnail.source, lat: p.coordinates[0].lat, lon: p.coordinates[0].lon, lg }))
    .sort((a, b) => b.s - a.s).slice(0, 4);
  renderLocal();
}

/* ---- 3D rota on izleme ucusu ---- */
function stopPreview() { if (L.anim) { cancelAnimationFrame(L.anim.raf); L.anim = null; } }
function bearing(a, b) { const r = x => x * Math.PI / 180, y = Math.sin(r(b[0] - a[0])) * Math.cos(r(b[1])), x = Math.cos(r(a[1])) * Math.sin(r(b[1])) - Math.sin(r(a[1])) * Math.cos(r(b[1])) * Math.cos(r(b[0] - a[0])); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; }
function previewRoute() {
  if (L.anim) { stopPreview(); renderLocal(); return; }
  const r = L.routes[L.sel]; if (!r) return;
  if (S.layer !== "terrain") setLayer("terrain");
  spin.stop = true; closeQuiet(); goMap();
  const c = r.c, cum = [0]; for (let i = 1; i < c.length; i++) cum.push(cum[i - 1] + hav(c[i - 1][1], c[i - 1][0], c[i][1], c[i][0]));
  const tot = cum[cum.length - 1] || 1, dur = Math.min(26000, Math.max(9000, tot * 4200));
  const at = f => { const d = Math.min(1, Math.max(0, f)) * tot; let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const seg = (cum[i] - cum[i - 1]) || 1, u = (d - cum[i - 1]) / seg; return [c[i - 1][0] + (c[i][0] - c[i - 1][0]) * u, c[i - 1][1] + (c[i][1] - c[i - 1][1]) * u]; };
  map.once("moveend", syncTerrain);
  map.flyTo({ center: c[0], zoom: 14.4, pitch: 62, bearing: bearing(c[0], at(0.06)), duration: 2200, essential: true, padding: { left: 0, right: 0, top: 0, bottom: 0 } });
  L.anim = { raf: 0 };
  map.once("moveend", () => { if (!L.anim) return; const t0 = performance.now(); let br = map.getBearing();
    const step = now => { if (!L.anim) return; const f = (now - t0) / dur; if (f >= 1) { stopPreview(); renderLocal(); return; }
      const p = at(f), tb = bearing(p, at(f + 0.04)); let dlt = ((tb - br + 540) % 360) - 180; br += dlt * 0.06;
      map.jumpTo({ center: p, bearing: br, pitch: 62, zoom: 14.4 }); L.anim.raf = requestAnimationFrame(step); };
    L.anim.raf = requestAnimationFrame(step); });
  renderLocal();
}

/* ---- GPS ---- */
function gpsGo() {
  if (!navigator.geolocation) return toast("Geolocation ✗");
  $("#local").classList.remove("closed"); L.locating = true; renderLocal();
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude: a, longitude: o } = pos.coords; L.locating = false; closeQuiet(); goMap(); fly(a, o, 13.2, 45);
    let label = "GPS"; try { const j = await (await fetch(`https://photon.komoot.io/reverse?lon=${o}&lat=${a}`)).json(); const p = j.features[0].properties; label = p.city || p.district || p.name || label; } catch (e) {}
    setLocal(a, o, label, "gps", true);
  }, () => { L.locating = false; renderLocal(); toast("Geolocation ✗ (permission)"); }, { timeout: 9000, enableHighAccuracy: true });
}

/* ---- panel ---- */
function nearestWeird() { if (!L.c) return null; return PLACES.map(p => ({ p, d: hav(L.c.lat, L.c.lon, p.lat, p.lon) })).sort((x, y) => x.d - y.d)[0]; }
function renderLocal() {
  const el = $("#localBody"); if (!el) return;
  const c = L.c, nw = nearestWeird();
  let h = `<div class="lhead"><b>📍 ${t("yourarea")}: <span class="ok">${c ? esc(c.label) : (L.err === "ip" ? "—" : t("locating"))}</span></b>${c && c.src === "ip" ? ' <small class="dim mono">≈ IP</small>' : ""}</div>`;
  h += `<div class="lbtns"><button class="btn amber" id="gpsB">${L.locating ? t("locating") : "⌖ " + t("gps")}</button>${c && !L.data ? `<button class="btn cyan" id="trB" ${L.busy ? "disabled" : ""}>${L.busy ? t("loading") : "🥾 " + t("showroutes")}</button>` : ""}</div>`;
  if (L.busy && !L.data) h += `<p class="small">${t("loading")}</p>`;
  if (L.data) {
    const k = L.counts || {}; h += `<div class="lleg">` + [["walk", "#00F0FF", t("walk")], ["bike", "#FF9E00", t("bike")], ["green", "#2eff9a", t("green")]].map(([id, col, lab]) => `<label><input type="checkbox" data-k="${id}" ${L.show[id] ? "checked" : ""}><i style="background:${col}"></i>${lab} <small class="mono dim">${k[id] || 0}</small></label>`).join("") + `</div>`;
    if (!(k.walk || k.bike)) h += `<p class="small notrail">ⓘ ${t("notrail")} <a href="#" id="retB" title="↻" aria-label="Retry">↻</a></p>`;
    if (L.routes.length) h += `<label class="small">${t("pickroute")}</label><select id="rsel">${L.routes.map((r, i) => `<option value="${i}" ${i === L.sel ? "selected" : ""}>${r.kind === "bike" ? "🚲" : "🥾"} ${esc(r.name || (r.kind === "bike" ? t("bike") : t("walk")))} · ${r.km.toFixed(1)} km</option>`).join("")}</select><button class="btn cyan wide" id="pvB">${L.anim ? "■ " + t("stopprev") : "🎥 " + t("preview")}</button>`;
  }
  if (L.err === "net") h += `<p class="small notrail">ⓘ ${t("trailerr")} <a href="#" id="retB" title="↻" aria-label="Retry">↻</a></p>`;
  if (nw) h += `<div class="lnear"><span class="small">${t("nearestw")}</span><b>${esc(nw.p.name)} <span class="mono ok">(${Math.round(nw.d).toLocaleString()} km)</span></b><button class="btn amber wide" id="nwB">✈ ${t("flywatch")}</button></div>`;
  h += `<h4>${t("notes_h")}</h4>` + (L.notes == null ? `<p class="small">${c ? t("loading") : ""}</p>` : L.notes.length ? L.notes.map((n, i) => `<div class="note"><button class="nimg" data-n="${i}" ${n.img ? `style="background-image:url(${esc(n.img)})"` : ""} aria-label="${esc(n.title)}"></button><div><a href="https://${n.lg}.wikipedia.org/wiki/${encodeURIComponent(n.title.replace(/ /g, "_"))}" target="_blank" rel="noopener"><b>${esc(n.title)}</b></a><p>${esc(n.ex.length > 150 ? n.ex.slice(0, 147) + "…" : n.ex)}</p></div></div>`).join("") : `<p class="small">${t("nonotes")}</p>`);
  el.innerHTML = h;
  $("#gpsB").onclick = gpsGo; if ($("#trB")) $("#trB").onclick = () => { fly(c.lat, c.lon, 12.6, 40); fetchTrails(); };
  $$("[data-k]", el).forEach(x => x.onchange = () => toggleKind(x.dataset.k, x.checked));
  if ($("#rsel")) $("#rsel").onchange = e => { stopPreview(); L.sel = +e.target.value; drawLocal(); const r = L.routes[L.sel]; map.fitBounds(r.c.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds(r.c[0], r.c[0])), { padding: 80, maxZoom: 15, duration: 1400 }); renderLocal(); };
  if ($("#pvB")) $("#pvB").onclick = previewRoute; if ($("#retB")) $("#retB").onclick = e => { e.preventDefault(); fetchTrails(); };
  if ($("#nwB")) $("#nwB").onclick = () => { const w = nearestWeird(); if (w) showOnMap(w.p); };
  $$("[data-n]", el).forEach(x => x.onclick = () => { const n = L.notes[+x.dataset.n]; fly(n.lat, n.lon, 15, 50); });
}
