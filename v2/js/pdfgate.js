/* PDF indirme kapisi: Google girisi -> karsilama karti + resmi YouTube abone widget'i -> indirme.
   Kullanici bilgisi yalnizca tarayici localStorage'inda (sd2_user). Ayarlar: v2/js/sdconfig.js */
(function () {
  var C = window.SD_CONFIG || {}, KEY = "sd2_user";
  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save(u) { try { localStorage.setItem(KEY, JSON.stringify(u)); } catch (e) {} }
  var css = document.createElement("style");
  css.textContent = ".pg-ov{position:fixed;inset:0;z-index:9999;background:rgba(3,6,12,.82);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px}" +
    ".pg-card{width:min(440px,100%);background:#08101c;border:1px solid rgba(0,240,255,.28);border-radius:18px;padding:26px 22px;color:#dcecf0;font-family:'Chakra Petch',system-ui,sans-serif;box-shadow:0 0 40px rgba(0,240,255,.12);position:relative;text-align:center}" +
    ".pg-card h3{margin:0 0 8px;color:#fff;font-size:1.25rem}.pg-card p{margin:6px 0 14px;color:#8aa3ac;font-size:.92rem;line-height:1.5}" +
    ".pg-x{position:absolute;top:8px;right:12px;background:none;border:0;color:#8aa3ac;font-size:1.5rem;cursor:pointer}" +
    ".pg-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid rgba(255,158,0,.6);background:rgba(255,158,0,.1);color:#FF9E00;padding:11px 18px;border-radius:12px;font:600 .9rem 'Chakra Petch',system-ui,sans-serif;cursor:pointer;text-decoration:none;margin:5px}" +
    ".pg-btn.alt{border-color:rgba(0,240,255,.4);background:rgba(0,240,255,.06);color:#00F0FF}.pg-btn:hover{filter:brightness(1.2);text-decoration:none}" +
    ".pg-who{display:flex;align-items:center;gap:12px;justify-content:center;margin-bottom:8px}.pg-who img{width:44px;height:44px;border-radius:50%;border:1px solid rgba(0,240,255,.4)}" +
    ".pg-sub{min-height:48px;margin:10px 0}.pg-small{font-size:.76rem;color:#6d8791}";
  document.head.appendChild(css);
  var G = {
    tr: { lt: "Ücretsiz PDF için giriş yap", lg: "PDF'i indirmek için Google ile giriş yap.", lq: "Google girişi şu an yapılandırılıyor; şimdilik misafir olarak devam edebilirsin.", gb: "Misafir olarak devam et", sm: "Bilgilerin yalnızca tarayıcında saklanır; sunucuya gönderilmez.", wt: "Hoş geldin!", wp: "İndirme birazdan başlıyor. Kanalı takip etmek istersen aşağıdaki resmi YouTube butonunu kullanabilirsin.", yb: "▶ YouTube'da Abone Ol", db: "⬇ PDF'i indir", ws: "Bilgilerin yalnızca bu tarayıcıda saklanır.", er: "Giriş doğrulanamadı, tekrar dene.", cl: "Kapat" },
    en: { lt: "Sign in for the free PDF", lg: "Sign in with Google to download the PDF.", lq: "Google sign-in is being set up; for now you can continue as a guest.", gb: "Continue as guest", sm: "Your details are stored only in your browser and never sent to a server.", wt: "Welcome!", wp: "Your download starts in a moment. If you like, follow the channel with the official YouTube button below.", yb: "▶ Subscribe on YouTube", db: "⬇ Download PDF", ws: "Your details are stored only in this browser.", er: "Sign-in could not be verified, please try again.", cl: "Close" },
    es: { lt: "Inicia sesión para el PDF gratuito", lg: "Inicia sesión con Google para descargar el PDF.", lq: "El acceso con Google se está configurando; por ahora puedes continuar como invitado.", gb: "Continuar como invitado", sm: "Tus datos se guardan solo en tu navegador y no se envían a ningún servidor.", wt: "¡Bienvenido!", wp: "La descarga empieza en un momento. Si quieres, sigue el canal con el botón oficial de YouTube.", yb: "▶ Suscríbete en YouTube", db: "⬇ Descargar PDF", ws: "Tus datos se guardan solo en este navegador.", er: "No se pudo verificar el acceso, inténtalo de nuevo.", cl: "Cerrar" },
    de: { lt: "Melde dich für das kostenlose PDF an", lg: "Melde dich mit Google an, um das PDF herunterzuladen.", lq: "Die Google-Anmeldung wird gerade eingerichtet; vorerst kannst du als Gast fortfahren.", gb: "Als Gast fortfahren", sm: "Deine Daten werden nur in deinem Browser gespeichert und nicht an einen Server gesendet.", wt: "Willkommen!", wp: "Der Download startet gleich. Wenn du magst, folge dem Kanal mit dem offiziellen YouTube-Button unten.", yb: "▶ Auf YouTube abonnieren", db: "⬇ PDF herunterladen", ws: "Deine Daten werden nur in diesem Browser gespeichert.", er: "Die Anmeldung konnte nicht bestätigt werden, bitte versuche es erneut.", cl: "Schließen" }
  }, T = G.tr;
  var ov = null, url = "";
  function close() { if (ov) { ov.remove(); ov = null; } }
  function open(html) {
    close(); ov = document.createElement("div"); ov.className = "pg-ov";
    ov.innerHTML = '<div class="pg-card" role="dialog" aria-modal="true"><button class="pg-x" type="button" aria-label="' + T.cl + '">&times;</button>' + html + "</div>";
    document.body.appendChild(ov);
    ov.querySelector(".pg-x").onclick = close;
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    return ov.querySelector(".pg-card");
  }
  function download() { var a = document.createElement("a"); a.href = url; a.download = url.split("/").pop(); document.body.appendChild(a); a.click(); a.remove(); }
  function welcome(u) {
    var card = open('<div class="pg-who"></div><h3>' + T.wt + '</h3><p>' + T.wp + '</p>' +
      '<div class="pg-sub"><div class="g-ytsubscribe" data-channelid="' + (C.YT_CHANNEL_ID || "") + '" data-layout="full" data-count="default"></div></div>' +
      '<a class="pg-btn alt" id="pgyt" target="_blank" rel="noopener" href="' + (C.SUBSCRIBE_URL || "https://www.youtube.com/@seckinduz") + '">' + T.yb + '</a>' +
      '<button class="pg-btn" type="button" id="pgdl">' + T.db + '</button><p class="pg-small">' + T.ws + '</p>');
    var who = card.querySelector(".pg-who"), nm = document.createElement("b"); nm.textContent = u.name || "Explorer";
    if (u.picture) { var im = document.createElement("img"); im.src = u.picture; im.alt = ""; im.referrerPolicy = "no-referrer"; who.appendChild(im); }
    who.appendChild(nm);
    card.querySelector("#pgdl").onclick = download;
    if (!document.getElementById("yt-platform")) { var s = document.createElement("script"); s.id = "yt-platform"; s.src = "https://apis.google.com/js/platform.js"; s.async = true; document.head.appendChild(s); }
    else if (window.gapi && gapi.ytsubscribe) { try { gapi.ytsubscribe.go(); } catch (e) {} }
    setTimeout(download, 700);
  }
  function loginCard() {
    var hasId = !!C.GOOGLE_CLIENT_ID;
    var card = open('<h3>' + T.lt + '</h3><p>' + (hasId ? T.lg : T.lq) +
      '</p><div id="pgg" style="min-height:44px"></div>' + (hasId ? "" : '<button class="pg-btn" type="button" id="pggst">' + T.gb + '</button>') +
      '<p class="pg-small">' + T.sm + '</p>');
    if (!hasId) { card.querySelector("#pggst").onclick = function () { var u = { name: "Explorer", guest: true }; save(u); welcome(u); }; return; }
    function init() {
      google.accounts.id.initialize({ client_id: C.GOOGLE_CLIENT_ID, callback: function (r) {
        try { var j = JSON.parse(decodeURIComponent(escape(atob(r.credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))))); var u = { name: j.name, picture: j.picture, email: j.email }; save(u); welcome(u); }
        catch (e) { card.querySelector("p").textContent = T.er; } } });
      google.accounts.id.renderButton(card.querySelector("#pgg"), { theme: "filled_black", size: "large", text: "signin_with", locale: (T === G.tr ? "tr" : T === G.es ? "es" : T === G.de ? "de" : "en") });
    }
    if (window.google && google.accounts && google.accounts.id) init();
    else { var s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = init; document.head.appendChild(s); }
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-pdf-download]"); if (!a) return;
    e.preventDefault(); url = a.getAttribute("href"); T = G[a.getAttribute("data-gate-lang")] || G.tr; var u = load();
    if (u && (u.name || u.email)) welcome(u); else loginCard();
  });
})();
