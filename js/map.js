
(function(){
  var lang='en';
  try{var saved=localStorage.getItem('lang');if(saved==='es'||saved==='en'){lang=saved;}}catch(e){}
  var P=window.PLACES, LK=window.LINKS;
  var T={en:{story:'Story',tip:'Visitor tip',coords:'Coordinates',gm:'Open in Google Maps',buyen:'E-Book (English)',buyes:'E-Book (Spanish)',hub:'All our channels',read:'Read the full article',noresult:'No places match your search.'},
         es:{story:'Historia',tip:'Consejo',coords:'Coordenadas',gm:'Abrir en Google Maps',buyen:'E-Book (ingl\u00e9s)',buyes:'E-Book (espa\u00f1ol)',hub:'Todos nuestros canales',read:'Leer el art\u00edculo completo',noresult:'Ning\u00fan lugar coincide.'}};
  var map=L.map('map-el',{worldCopyJump:true,minZoom:2}).setView([30,10],2);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  function el(tag,attrs,text){var e=document.createElement(tag);if(attrs){for(var k in attrs){if(k==='class')e.className=attrs[k];else e.setAttribute(k,attrs[k]);}}if(text!=null)e.textContent=text;return e;}
  function fmt(lat,lon){return Math.abs(lat).toFixed(4)+'\u00b0'+(lat>=0?'N':'S')+', '+Math.abs(lon).toFixed(4)+'\u00b0'+(lon>=0?'E':'W');}
  function popup(p){
    var t=T[lang],root=el('div',{class:'pop'});
    root.appendChild(el('h3',null,p.name));
    root.appendChild(el('div',{class:'c'},lang==='es'?p.c_es:p.c_en));
    root.appendChild(el('p',null,lang==='es'?p.s_es:p.s_en));
    var tip=el('p',{class:'tip'});tip.appendChild(el('strong',null,t.tip+': '));tip.appendChild(document.createTextNode(lang==='es'?p.t_es:p.t_en));root.appendChild(tip);
    var c=el('p');c.appendChild(el('strong',null,t.coords+': '));c.appendChild(document.createTextNode(fmt(p.lat,p.lon)));root.appendChild(c);
    var row=el('div',{class:'row'});
    row.appendChild(el('a',{class:'btn',href:'https://www.google.com/maps/search/?api=1&query='+p.lat+','+p.lon,target:'_blank',rel:'noopener'},t.gm));
    if(p.article){row.appendChild(el('a',{class:'btn alt',href:'articles/'+p.article+'.html'},t.read));}
    row.appendChild(el('a',{class:'btn',href:LK.gumEN,target:'_blank',rel:'noopener'},t.buyen));
    row.appendChild(el('a',{class:'btn',href:LK.gumES,target:'_blank',rel:'noopener'},t.buyes));
    row.appendChild(el('a',{class:'btn alt',href:LK.beacons,target:'_blank',rel:'noopener'},t.hub));
    root.appendChild(row);return root;
  }
  var markers={};
  P.forEach(function(p){
    var m=L.circleMarker([p.lat,p.lon],{radius:8,color:'#ffb347',weight:2,fillColor:'#ffb347',fillOpacity:.55}).addTo(map);
    m.bindPopup(function(){return popup(p);},{maxWidth:300});
    m.bindTooltip(p.name);markers[p.id]=m;
  });
  var listEl=document.getElementById('list'),q=document.getElementById('q');
  function render(){
    var term=(q.value||'').toLowerCase();listEl.textContent='';var n=0;
    P.forEach(function(p){
      var hay=(p.name+' '+p.c_en+' '+p.c_es).toLowerCase();
      var show=!term||hay.indexOf(term)>-1;
      if(show){n++;markers[p.id].addTo(map);
        var b=el('button',{type:'button'});b.appendChild(document.createTextNode(p.name));b.appendChild(el('small',null,lang==='es'?p.c_es:p.c_en));
        b.addEventListener('click',function(){map.setView([p.lat,p.lon],Math.max(map.getZoom(),5));markers[p.id].openPopup();});
        listEl.appendChild(b);
      }else{map.removeLayer(markers[p.id]);}
    });
    if(!n)listEl.appendChild(el('p',{class:'note',style:'padding:10px'},T[lang].noresult));
  }
  function setLang(l){
    lang=l;try{localStorage.setItem('lang',l);}catch(e){}
    document.getElementById('l-en').setAttribute('aria-pressed',String(l==='en'));
    document.getElementById('l-es').setAttribute('aria-pressed',String(l==='es'));
    document.documentElement.lang=l;map.closePopup();render();
  }
  document.getElementById('l-en').addEventListener('click',function(){setLang('en');});
  document.getElementById('l-es').addEventListener('click',function(){setLang('es');});
  q.addEventListener('input',render);
  setLang(lang);
})();
