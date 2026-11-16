(function(){
var KEY='lang',XK='explored';
function $(i){return document.getElementById(i);}
var root=document.documentElement.getAttribute('data-root')||'';
function getLang(){try{var s=localStorage.getItem(KEY);if(s==='es'||s==='en')return s;}catch(e){}return 'en';}
function apply(l){
  var h=document.documentElement;h.setAttribute('lang',l);h.setAttribute('data-lang',l);
  var n=document.querySelectorAll('[data-en]');
  for(var i=0;i<n.length;i++){var v=n[i].getAttribute('data-'+l);if(v!==null)n[i].textContent=v;}
  var b=document.querySelectorAll('.lang button');
  for(var j=0;j<b.length;j++){b[j].setAttribute('aria-pressed',String(b[j].getAttribute('data-lang')===l));}
  window.SITE_LANG=l;document.dispatchEvent(new CustomEvent('sitelangchange',{detail:l}));
}
window.setSiteLang=function(l){try{localStorage.setItem(KEY,l);}catch(e){}apply(l);};
var bs=document.querySelectorAll('.lang button');
for(var k=0;k<bs.length;k++){(function(x){x.addEventListener('click',function(){window.setSiteLang(x.getAttribute('data-lang'));});})(bs[k]);}

/* explored store */
function xread(){try{var a=JSON.parse(localStorage.getItem(XK)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function xui(){
  var c=xread().length;
  var els=document.querySelectorAll('[data-explored-count]');for(var i=0;i<els.length;i++)els[i].textContent=c;
  var bars=document.querySelectorAll('[data-explored-bar]');for(var j=0;j<bars.length;j++)bars[j].style.width=(c/25*100)+'%';
  document.dispatchEvent(new CustomEvent('exploredchange',{detail:c}));
}
window.Explored={ids:xread,count:function(){return xread().length;},has:function(id){return xread().indexOf(id)>-1;},
  add:function(id){var a=xread();if(a.indexOf(id)<0){a.push(id);try{localStorage.setItem(XK,JSON.stringify(a));}catch(e){}}xui();}};
var art=document.querySelector('article.post[data-place]');
if(art)window.Explored.add(art.getAttribute('data-place'));

/* drawer */
var btn=$('menuBtn'),dr=$('drawer'),sc=$('scrim'),cl=$('drawerClose');
function openD(){dr.classList.add('open');sc.classList.add('show');btn.setAttribute('aria-expanded','true');dr.setAttribute('aria-hidden','false');document.body.classList.add('noscroll');var f=dr.querySelector('a');if(f)f.focus();}
function closeD(ret){dr.classList.remove('open');sc.classList.remove('show');btn.setAttribute('aria-expanded','false');dr.setAttribute('aria-hidden','true');document.body.classList.remove('noscroll');if(ret)btn.focus();}
btn.addEventListener('click',function(){if(dr.classList.contains('open'))closeD(true);else openD();});
sc.addEventListener('click',function(){closeD(true);});cl.addEventListener('click',function(){closeD(true);});
var links=dr.querySelectorAll('a');
for(var m=0;m<links.length;m++){(function(a){a.addEventListener('click',function(e){
  var c=a.getAttribute('data-cat');
  if(c&&window.setCategory){e.preventDefault();window.setCategory(c,true);}
  closeD(false);});})(links[m]);}

/* reading progress */
var rp=$('rp'),post=document.querySelector('article.post');
if(rp&&post){
  $('rpWrap').hidden=false;var tick=false;
  function upd(){tick=false;var r=post.getBoundingClientRect(),vh=window.innerHeight,tot=r.height-vh*0.6;var p=tot>0?(-r.top+vh*0.1)/tot:1;if(p<0)p=0;if(p>1)p=1;rp.style.width=(p*100)+'%';}
  window.addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(upd);}},{passive:true});
  window.addEventListener('resize',upd);upd();
}

/* spotlight hover */
var spots=document.querySelectorAll('.card,.card2,.cta,.nextcard,.tile');
for(var s=0;s<spots.length;s++)spots[s].classList.add('spot');
document.addEventListener('pointermove',function(e){
  var t=e.target&&e.target.closest?e.target.closest('.spot'):null;if(!t)return;
  var r=t.getBoundingClientRect();t.style.setProperty('--mx',(e.clientX-r.left)+'px');t.style.setProperty('--my',(e.clientY-r.top)+'px');
},{passive:true});

/* command palette */
var ov=$('palOv'),inp=$('palIn'),res=$('palRes'),cur=[],sel=0,lastFocus=null;
function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function score(it,q){
  var t=norm(it.title),k=norm(it.kw||'');
  if(t===q)return 100;if(t.indexOf(q)===0)return 80;if(t.indexOf(q)>-1)return 60;if(k.indexOf(q)>-1)return 30;
  var toks=q.split(/\s+/).filter(Boolean);
  if(toks.length>1&&toks.every(function(x){return t.indexOf(x)>-1||k.indexOf(x)>-1;}))return 40;
  return 0;
}
var GN={place:'Places',article:'Articles',category:'Categories',page:'Pages'};
function pal(q){
  var I=window.SEARCH_INDEX||[],out=[];
  q=norm(q.trim());
  if(!q){
    ['page','category','place'].forEach(function(t){var lim=t==='place'?5:t==='page'?5:3;var n=0;I.forEach(function(it){if(it.t===t&&n<lim){out.push(it);n++;}});});
  }else{
    var sc=[];I.forEach(function(it){var s=score(it,q);if(s>0)sc.push([s,it]);});
    sc.sort(function(a,b){return b[0]-a[0];});
    var cnt={};sc.forEach(function(x){var t=x[1].t;cnt[t]=(cnt[t]||0)+1;if(cnt[t]<=6)out.push(x[1]);});
    var order=['place','article','category','page'];out.sort(function(a,b){return order.indexOf(a.t)-order.indexOf(b.t);});
  }
  cur=out;sel=0;render();
}
function render(){
  res.textContent='';
  if(!cur.length){var e=document.createElement('div');e.className='pal-empty';e.textContent='No results';res.appendChild(e);return;}
  var last='';
  cur.forEach(function(it,i){
    if(it.t!==last){last=it.t;var g=document.createElement('div');g.className='pal-g';g.textContent=GN[it.t];res.appendChild(g);}
    var a=document.createElement('div');a.className='pal-i'+(i===sel?' sel':'');a.setAttribute('role','option');a.setAttribute('data-i',i);
    var ic=document.createElement('span');ic.className='ic';ic.textContent=it.icon;a.appendChild(ic);
    a.appendChild(document.createTextNode(it.title));
    var sm=document.createElement('small');sm.textContent=it.sub;a.appendChild(sm);
    a.addEventListener('click',function(){go(i);});a.addEventListener('mousemove',function(){if(sel!==i){sel=i;mark();}});
    res.appendChild(a);
  });
}
function mark(){var x=res.querySelectorAll('.pal-i');for(var i=0;i<x.length;i++){x[i].classList.toggle('sel',i===sel);if(i===sel&&x[i].scrollIntoView)x[i].scrollIntoView({block:'nearest'});}}
function go(i){
  var it=cur[i];if(!it)return;closeP();
  if(it.t==='place'&&window.openPlace){window.openPlace(it.id,true);return;}
  if(/^https?:/.test(it.href)){window.open(it.href,'_blank','noopener');return;}
  location.href=root+it.href;
}
function openP(){lastFocus=document.activeElement;ov.hidden=false;document.body.classList.add('noscroll');inp.value='';pal('');setTimeout(function(){inp.focus();},0);}
function closeP(){ov.hidden=true;document.body.classList.remove('noscroll');if(lastFocus&&lastFocus.focus)lastFocus.focus();}
$('cmdkBtn').addEventListener('click',openP);
ov.addEventListener('mousedown',function(e){if(e.target===ov)closeP();});
inp.addEventListener('input',function(){pal(inp.value);});
document.addEventListener('keydown',function(e){
  var k=e.key;
  if((e.ctrlKey||e.metaKey)&&(k==='k'||k==='K')){e.preventDefault();if(ov.hidden)openP();else closeP();return;}
  if(!ov.hidden){
    if(k==='Escape'){e.preventDefault();closeP();}
    else if(k==='ArrowDown'){e.preventDefault();if(cur.length){sel=(sel+1)%cur.length;mark();}}
    else if(k==='ArrowUp'){e.preventDefault();if(cur.length){sel=(sel-1+cur.length)%cur.length;mark();}}
    else if(k==='Enter'){e.preventDefault();go(sel);}
    return;
  }
  if(k==='Escape'&&dr.classList.contains('open'))closeD(true);
  var tg=(e.target&&e.target.tagName)||'';
  if(k==='/'&&tg!=='INPUT'&&tg!=='TEXTAREA'){e.preventDefault();openP();}
});
var isMac=/Mac|iPhone|iPad/.test(navigator.platform||'');
if(isMac){var kb=document.querySelectorAll('.cmdk kbd');for(var q2=0;q2<kb.length;q2++)kb[q2].textContent='⌘ K';}

apply(getLang());xui();
})();
