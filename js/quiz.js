(function(){
var Q=[{"name": "Llívia", "lat": 42.4636, "lon": 1.983, "opts": ["Spain", "France", "Andorra", "Portugal"], "ans": 0, "slug": "llivia-the-spanish-town-inside-france", "why": "Llívia is a Spanish town completely surrounded by France, kept Spanish by a 1659 treaty technicality."}, {"name": "Campione d'Italia", "lat": 45.9667, "lon": 8.9667, "opts": ["Switzerland", "Italy", "Austria", "Germany"], "ans": 1, "slug": "campione-ditalia-italian-enclave-in-switzerland", "why": "Campione d'Italia is an Italian exclave on Lake Lugano, surrounded by Swiss territory."}, {"name": "Point Roberts", "lat": 48.9857, "lon": -123.0653, "opts": ["Canada", "United States", "Russia", "Iceland"], "ans": 1, "slug": "point-roberts-washington", "why": "Point Roberts, Washington is American, but by land you can only reach it through Canada."}, {"name": "Büsingen am Hochrhein", "lat": 47.6967, "lon": 8.6819, "opts": ["Switzerland", "Austria", "Germany", "Liechtenstein"], "ans": 2, "slug": "busingen-am-hochrhein-german-village-in-switzerland", "why": "Büsingen is a German village inside Switzerland and part of the Swiss customs area."}, {"name": "Kaliningrad", "lat": 54.7104, "lon": 20.4522, "opts": ["Poland", "Lithuania", "Germany", "Russia"], "ans": 3, "slug": "kaliningrad-russian-exclave-on-the-baltic", "why": "Kaliningrad is a Russian region separated from the rest of Russia by Poland and Lithuania."}, {"name": "Ceuta", "lat": 35.8894, "lon": -5.3213, "opts": ["Morocco", "Spain", "Portugal", "Algeria"], "ans": 1, "slug": "ceuta-spanish-city-in-africa", "why": "Ceuta is a Spanish city on the African coast with a land border with Morocco."}, {"name": "Northwest Angle", "lat": 49.384, "lon": -95.15, "opts": ["Canada", "United States", "Denmark", "Russia"], "ans": 1, "slug": "northwest-angle-minnesota-the-us-exclave-in-canada", "why": "The Northwest Angle belongs to Minnesota, USA, even though it sits north of the 49th parallel."}, {"name": "Tristan da Cunha", "lat": -37.1052, "lon": -12.2777, "opts": ["South Africa", "Brazil", "United Kingdom", "Namibia"], "ans": 2, "slug": "tristan-da-cunha-the-most-remote-inhabited-island", "why": "Tristan da Cunha is a British Overseas Territory in the South Atlantic."}, {"name": "Gibraltar", "lat": 36.1408, "lon": -5.3536, "opts": ["Spain", "United Kingdom", "Morocco", "Portugal"], "ans": 1, "slug": "gibraltar-the-rock-and-its-runway", "why": "Gibraltar is a British Overseas Territory at the southern tip of Spain."}, {"name": "Bir Tawil", "lat": 21.8667, "lon": 33.75, "opts": ["Egypt", "Sudan", "Egypt and Sudan share it", "No country claims it"], "ans": 3, "slug": "bir-tawil-the-land-no-country-claims", "why": "Bir Tawil is a desert that neither Egypt nor Sudan claims, because of two conflicting British border lines."}], SITE="https://seckinduz.github.io", GUME="https://seckinspire7.gumroad.com/l/25-weirdest-borders", GUMS="https://seckinspire7.gumroad.com/l/25-fronteras-extranas";
var i=0,score=0,answered=false;
var map=L.map('qmap',{zoomControl:true,scrollWheelZoom:false,minZoom:3}).setView([30,10],4);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
var marker=null;
function $(id){return document.getElementById(id);}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;}
function show(){
  var q=Q[i];answered=false;
  $('qnum').textContent='Question '+(i+1)+' of '+Q.length;
  $('bar').style.width=(i/Q.length*100)+'%';
  $('qtext').textContent='Which country does "'+q.name+'" belong to?';
  $('explain').className='explain hidden';$('next').className='btn hidden';
  if(marker)map.removeLayer(marker);
  marker=L.circleMarker([q.lat,q.lon],{radius:9,color:'#ffb347',fillColor:'#ffb347',fillOpacity:.6}).addTo(map);
  map.setView([q.lat,q.lon],5);
  var box=$('opts');box.textContent='';
  q.opts.forEach(function(o,k){var b=el('button','opt',o);b.type='button';b.addEventListener('click',function(){pick(k,b);});box.appendChild(b);});
}
function pick(k,btn){
  if(answered)return;answered=true;var q=Q[i];
  var all=$('opts').children;for(var j=0;j<all.length;j++){all[j].disabled=true;}
  if(k===q.ans){score++;btn.classList.add('ok');}else{btn.classList.add('bad');all[q.ans].classList.add('ok');}
  var ex=$('explain');ex.className='explain';ex.textContent='';
  ex.appendChild(el('strong',null,(k===q.ans?'Correct! ':'Not quite. ')));ex.appendChild(document.createTextNode(q.why+' '));
  var a=el('a',null,'Read the full article');a.href='articles/'+q.slug+'.html';ex.appendChild(a);
  $('next').className='btn';$('next').textContent=(i===Q.length-1)?'See my score':'Next question';
}
function finish(){
  $('game').className='hidden';var r=$('result');r.className='';
  $('score').textContent=score+' / '+Q.length;
  var msg=score>=9?'Border expert! You know your maps.':score>=6?'Great job, a true map lover.':score>=3?'Not bad. Our articles will help you level up.':'Every explorer starts somewhere. Try again!';
  $('msg').textContent=msg;
  var text='I scored '+score+'/'+Q.length+' on the Weird Borders quiz. Can you beat me?';
  var u=encodeURIComponent(SITE+'/quiz.html'),t=encodeURIComponent(text);
  $('sh-x').href='https://twitter.com/intent/tweet?text='+t+'&url='+u;
  $('sh-fb').href='https://www.facebook.com/sharer/sharer.php?u='+u;
  $('sh-wa').href='https://wa.me/?text='+encodeURIComponent(text+' '+SITE+'/quiz.html');
  $('sh-cp').onclick=function(){var s=text+' '+SITE+'/quiz.html';
    if(navigator.clipboard){navigator.clipboard.writeText(s).then(function(){$('sh-cp').textContent='Copied!';});}else{window.prompt('Copy this link',s);}};
}
$('next').addEventListener('click',function(){i++;if(i>=Q.length){finish();}else{show();}});
$('again').addEventListener('click',function(){i=0;score=0;$('result').className='hidden';$('game').className='';show();});
show();
})();
