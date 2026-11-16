(function(){
var P=window.PLACES,LK=window.LINKS,CT={};window.CATS.forEach(function(c){CT[c.id]=c;});
var lang=window.SITE_LANG||'en',cat='all';
var T={en:{tip:'Visitor tip',coords:'Coordinates',gm:'Open in Google Maps',buyen:'E-Book (English)',buyes:'E-Book (Spanish)',hub:'All our channels',read:'Read the full article',none:'No places match your search.',all:'All places',shown:'places shown'},
       es:{tip:'Consejo',coords:'Coordenadas',gm:'Abrir en Google Maps',buyen:'E-Book (inglés)',buyes:'E-Book (español)',hub:'Todos nuestros canales',read:'Leer el artículo completo',none:'Ningún lugar coincide.',all:'Todos los lugares',shown:'lugares mostrados'}};
var map=L.map('map-el',{worldCopyJump:true,minZoom:2}).setView([30,10],2);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
function el(t,a,x){var e=document.createElement(t);if(a){for(var k in a){if(k==='class')e.className=a[k];else e.setAttribute(k,a[k]);}}if(x!=null)e.textContent=x;return e;}
function fmt(la,lo){return Math.abs(la).toFixed(4)+'°'+(la>=0?'N':'S')+', '+Math.abs(lo).toFixed(4)+'°'+(lo>=0?'E':'W');}
function popup(p){
  var t=T[lang],root=el('div',{class:'pop'}),c=CT[p.cat];
  var b=el('span',{class:'badge '+p.cat},c.icon+' '+(lang==='es'?c.es:c.en));b.style.marginBottom='6px';root.appendChild(b);
  root.appendChild(el('h3',null,p.name));
  root.appendChild(el('div',{class:'c'},lang==='es'?p.c_es:p.c_en));
  root.appendChild(el('p',null,lang==='es'?p.s_es:p.s_en));
  var tip=el('p',{class:'tip'});tip.appendChild(el('strong',null,t.tip+': '));tip.appendChild(document.createTextNode(lang==='es'?p.t_es:p.t_en));root.appendChild(tip);
  var cc=el('p');cc.appendChild(el('strong',null,t.coords+': '));cc.appendChild(document.createTextNode(fmt(p.lat,p.lon)));root.appendChild(cc);
  var row=el('div',{class:'row'});
  row.appendChild(el('a',{class:'btn',href:'https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lon,target:'_blank',rel:'noopener'},t.gm));
  if(p.article)row.appendChild(el('a',{class:'btn alt',href:'articles/'+p.article+'.html'},t.read));
  row.appendChild(el('a',{class:'btn',href:LK.gumEN,target:'_blank',rel:'noopener'},t.buyen));
  row.appendChild(el('a',{class:'btn',href:LK.gumES,target:'_blank',rel:'noopener'},t.buyes));
  row.appendChild(el('a',{class:'btn alt',href:LK.beacons,target:'_blank',rel:'noopener'},t.hub));
  root.appendChild(row);return root;
}
var markers={};
P.forEach(function(p){
  var col=CT[p.cat].color;
  var m=L.circleMarker([p.lat,p.lon],{radius:8,color:col,weight:2,fillColor:col,fillOpacity:.55});
  m.bindPopup(function(){return popup(p);},{maxWidth:300});m.bindTooltip(p.name);markers[p.id]=m;
});
var listEl=document.getElementById('list'),q=document.getElementById('q'),stat=document.getElementById('stat');
function visible(p){
  var term=(q.value||'').toLowerCase();
  var ok=cat==='all'||p.cat===cat;
  return ok&&(!term||(p.name+' '+p.c_en+' '+p.c_es).toLowerCase().indexOf(term)>-1);
}
function render(fit){
  listEl.textContent='';var n=0,pts=[];
  P.forEach(function(p){
    var show=visible(p);
    if(show){n++;pts.push([p.lat,p.lon]);markers[p.id].addTo(map);
      var b=el('button',{type:'button'});b.appendChild(document.createTextNode(p.name));b.appendChild(el('small',null,(lang==='es'?p.c_es:p.c_en)));
      b.addEventListener('click',function(){map.setView([p.lat,p.lon],Math.max(map.getZoom(),5));markers[p.id].openPopup();});
      listEl.appendChild(b);
    }else{map.removeLayer(markers[p.id]);}
  });
  if(!n)listEl.appendChild(el('p',{class:'note',style:'padding:10px'},T[lang].none));
  var cards=document.querySelectorAll('.card2[data-cat]');
  for(var i=0;i<cards.length;i++){var cc=cards[i].getAttribute('data-cat');cards[i].hidden=!(cat==='all'||cc===cat);}
  if(stat)stat.textContent=n+' '+T[lang].shown;
  var chips=document.querySelectorAll('.chip[data-cat]');
  for(var j=0;j<chips.length;j++){chips[j].setAttribute('aria-pressed',String(chips[j].getAttribute('data-cat')===cat));}
  if(fit){map.closePopup();if(pts.length>1&&cat!=='all'){map.fitBounds(pts,{padding:[40,40],maxZoom:5});}else if(cat==='all'){map.setView([30,10],2);}else if(pts.length===1){map.setView(pts[0],5);}}
}
window.setCategory=function(c,scroll){
  if(c!=='all'&&!CT[c])c='all';
  cat=c;
  try{var u=location.pathname+(c==='all'?'':'?cat='+c)+location.hash;history.replaceState(null,'',u);}catch(e){}
  render(true);
  if(scroll){var m=document.getElementById('map');if(m)m.scrollIntoView({behavior:'smooth',block:'start'});}
};
var chips=document.querySelectorAll('.chip[data-cat]');
for(var i=0;i<chips.length;i++){(function(b){b.addEventListener('click',function(){window.setCategory(b.getAttribute('data-cat'),false);});})(chips[i]);}
q.addEventListener('input',function(){render(false);});
document.addEventListener('sitelangchange',function(e){lang=e.detail;map.closePopup();render(false);});
var m=/[?&]cat=([a-z]+)/.exec(location.search);
if(m&&CT[m[1]])cat=m[1];
render(cat!=='all');
})();
