(function(){
var P=window.PLACES,LK=window.LINKS,CT={},byId={};window.CATS.forEach(function(c){CT[c.id]=c;});P.forEach(function(p){byId[p.id]=p;});
var lang=window.SITE_LANG||'en',cat='all',selId=null;
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var T={en:{insp:'LOCATION INSPECTOR',tip:'Visitor tip',coords:'Coordinates',copy:'Copy',copied:'Copied!',gm:'Open in Google Maps',read:'Read Full Article',buyen:'E-Book (English)',buyes:'E-Book (Spanish)',hub:'All our channels',none:'No places match your search.',shown:'places shown',story:'Story',seen:'Marked as explored'},
       es:{insp:'INSPECTOR DE LUGAR',tip:'Consejo',coords:'Coordenadas',copy:'Copiar',copied:'¡Copiado!',gm:'Abrir en Google Maps',read:'Leer artículo completo',buyen:'E-Book (inglés)',buyes:'E-Book (español)',hub:'Todos nuestros canales',none:'Ningún lugar coincide.',shown:'lugares mostrados',story:'Historia',seen:'Marcado como explorado'}};
var map=L.map('map-el',{worldCopyJump:true,minZoom:2,zoomSnap:.5}).setView([30,10],2);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
function el(t,a,x){var e=document.createElement(t);if(a){for(var k in a){if(k==='class')e.className=a[k];else e.setAttribute(k,a[k]);}}if(x!=null)e.textContent=x;return e;}
function fmt(la,lo){return Math.abs(la).toFixed(4)+'°'+(la>=0?'N':'S')+', '+Math.abs(lo).toFixed(4)+'°'+(lo>=0?'E':'W');}
var markers={};
function baseStyle(p){var col=CT[p.cat].color;return {radius:8,color:col,weight:2,fillColor:col,fillOpacity:.5};}
P.forEach(function(p){
  var m=L.circleMarker([p.lat,p.lon],baseStyle(p));
  m.bindTooltip(p.name);m.on('click',function(){openPlace(p.id,false);});markers[p.id]=m;
});
function styleSel(){P.forEach(function(p){var m=markers[p.id];m.setStyle(baseStyle(p));if(p.id===selId){m.setStyle({radius:11,weight:4,fillOpacity:.9,color:'#fff'});m.bringToFront();}});}

/* inspector */
var insp=document.getElementById('insp'),iscrim=document.getElementById('inspScrim'),ibody=document.getElementById('inspBody'),iclose=document.getElementById('inspClose'),ititle=document.getElementById('inspTitle');
function openInspector(p){
  selId=p.id;styleSel();var t=T[lang],c=CT[p.cat];
  ititle.textContent=t.insp;ibody.textContent='';
  var b=el('span',{class:'badge '+p.cat},c.icon+' '+(lang==='es'?c.es:c.en));b.style.alignSelf='flex-start';ibody.appendChild(b);
  ibody.appendChild(el('h2',null,p.name));
  ibody.appendChild(el('div',{class:'c'},lang==='es'?p.c_es:p.c_en));
  var cb=el('div',{class:'coordbox'});var cl=el('div');cl.appendChild(el('small',null,t.coords));cl.appendChild(el('span',{class:'mono'},fmt(p.lat,p.lon)));cb.appendChild(cl);
  var cp=el('button',{class:'btn alt sm',type:'button'},t.copy);
  cp.addEventListener('click',function(){var s=p.lat+', '+p.lon;
    function done(){cp.textContent=t.copied;setTimeout(function(){cp.textContent=t.copy;},1500);}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(done,function(){window.prompt('Copy',s);});}else{window.prompt('Copy',s);}});
  cb.appendChild(cp);ibody.appendChild(cb);
  ibody.appendChild(el('p',null,lang==='es'?p.s_es:p.s_en));
  var tp=el('p',{class:'insp-tip'});tp.appendChild(el('strong',null,t.tip+': '));tp.appendChild(document.createTextNode(lang==='es'?p.t_es:p.t_en));ibody.appendChild(tp);
  var act=el('div',{class:'insp-actions'});
  if(p.article)act.appendChild(el('a',{class:'btn',href:'articles/'+p.article+'.html'},t.read+' →'));
  act.appendChild(el('a',{class:'btn alt',href:'https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lon,target:'_blank',rel:'noopener'},'📍 '+t.gm));
  var r2=el('div',{class:'row2'});r2.appendChild(el('a',{class:'btn',href:LK.gumEN,target:'_blank',rel:'noopener'},'📘 '+t.buyen));r2.appendChild(el('a',{class:'btn',href:LK.gumES,target:'_blank',rel:'noopener'},'📗 '+t.buyes));act.appendChild(r2);
  act.appendChild(el('a',{class:'btn alt',href:LK.beacons,target:'_blank',rel:'noopener'},'🔗 '+t.hub));
  ibody.appendChild(act);
  ibody.appendChild(el('div',{class:'explored-note'},'✓ '+t.seen+' · '+(window.Explored.has(p.id)?window.Explored.count():window.Explored.count()+1)+'/25'));
  window.Explored.add(p.id);
  insp.classList.add('open');iscrim.classList.add('show');insp.setAttribute('aria-hidden','false');document.body.classList.add('insp-open');
  setTimeout(function(){iclose.focus();},50);
}
function closeInspector(){insp.classList.remove('open');iscrim.classList.remove('show');insp.setAttribute('aria-hidden','true');document.body.classList.remove('insp-open');selId=null;styleSel();}
iclose.addEventListener('click',closeInspector);iscrim.addEventListener('click',closeInspector);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&insp.classList.contains('open')&&document.getElementById('palOv').hidden)closeInspector();});

function visible(p){
  var term=(q.value||'').toLowerCase();
  return (cat==='all'||p.cat===cat)&&(!term||(p.name+' '+p.c_en+' '+p.c_es).toLowerCase().indexOf(term)>-1);
}
var listEl=document.getElementById('list'),q=document.getElementById('q'),stat=document.getElementById('stat');
function render(fit){
  listEl.textContent='';var n=0,pts=[];
  P.forEach(function(p){
    if(visible(p)){n++;pts.push([p.lat,p.lon]);markers[p.id].addTo(map);
      var b=el('button',{type:'button'});b.appendChild(document.createTextNode(p.name));b.appendChild(el('small',null,lang==='es'?p.c_es:p.c_en));
      b.addEventListener('click',function(){openPlace(p.id,true);});listEl.appendChild(b);
    }else{map.removeLayer(markers[p.id]);}
  });
  if(!n)listEl.appendChild(el('p',{class:'note',style:'padding:10px'},T[lang].none));
  var cards=document.querySelectorAll('.card2[data-cat]');
  for(var i=0;i<cards.length;i++){var cc=cards[i].getAttribute('data-cat');cards[i].hidden=!(cat==='all'||cc===cat);}
  if(stat)stat.textContent=n+' '+T[lang].shown;
  var chips=document.querySelectorAll('.chip[data-cat]');
  for(var j=0;j<chips.length;j++){chips[j].setAttribute('aria-pressed',String(chips[j].getAttribute('data-cat')===cat));}
  if(fit){if(pts.length>1&&cat!=='all'){map.fitBounds(pts,{padding:[40,40],maxZoom:5});}else if(cat==='all'){map.setView([30,10],2);}else if(pts.length===1){map.setView(pts[0],5);}}
}
function setCat(c){if(c!=='all'&&!CT[c])c='all';cat=c;}
window.setCategory=function(c,scroll){
  setCat(c);
  try{history.replaceState(null,'',location.pathname+(cat==='all'?'':'?cat='+cat)+location.hash);}catch(e){}
  closeInspector();render(true);
  if(scroll){var m=document.getElementById('map');if(m)m.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});}
};
function openPlace(id,fly){
  var p=byId[id];if(!p)return;
  if(!visible(p)){setCat('all');q.value='';render(false);}
  if(fly){
    var z=Math.max(5,map.getZoom());
    if(reduce)map.setView([p.lat,p.lon],z);else map.flyTo([p.lat,p.lon],z,{duration:1.6});
    var m=document.getElementById('map');if(m){var rc=m.getBoundingClientRect();if(rc.top>window.innerHeight*0.55||rc.bottom<120)m.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});}
  }
  openInspector(p);
}
window.openPlace=openPlace;
function teleport(){
  var pool=P.filter(visible);if(pool.length<2)pool=P.slice();
  var p;do{p=pool[Math.floor(Math.random()*pool.length)];}while(p.id===selId&&pool.length>1);
  closeInspector();
  var m=document.getElementById('map');if(m)m.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
  selId=p.id;styleSel();
  map.once('moveend',function(){openInspector(p);});
  if(reduce){map.setView([p.lat,p.lon],5);}else{map.flyTo([p.lat,p.lon],5.5,{duration:2.4});}
}
var tbs=document.querySelectorAll('[data-teleport]');
for(var t=0;t<tbs.length;t++)tbs[t].addEventListener('click',teleport);
var pv=document.querySelectorAll('[data-preview]');
for(var v=0;v<pv.length;v++){(function(b){b.addEventListener('click',function(){openPlace(b.getAttribute('data-preview'),true);});})(pv[v]);}
var chips=document.querySelectorAll('.chip[data-cat],.cbar[data-cat]');
for(var i=0;i<chips.length;i++){(function(b){b.addEventListener('click',function(e){e.preventDefault();window.setCategory(b.getAttribute('data-cat'),b.classList.contains('cbar'));});})(chips[i]);}
q.addEventListener('input',function(){render(false);});
document.addEventListener('sitelangchange',function(e){lang=e.detail;if(insp.classList.contains('open')&&selId)openInspector(byId[selId]);render(false);});
var m1=/[?&]cat=([a-z]+)/.exec(location.search);if(m1&&CT[m1[1]])cat=m1[1];
render(cat!=='all');
var m2=/[?&]place=([a-z0-9-]+)/.exec(location.search);
if(m2&&byId[m2[1]])setTimeout(function(){openPlace(m2[1],true);},400);
})();
