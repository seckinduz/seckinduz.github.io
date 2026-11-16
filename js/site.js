(function(){
var KEY='lang';
function $(i){return document.getElementById(i);}
function getLang(){try{var s=localStorage.getItem(KEY);if(s==='es'||s==='en')return s;}catch(e){}return 'en';}
function apply(l){
  var h=document.documentElement;h.setAttribute('lang',l);h.setAttribute('data-lang',l);
  var n=document.querySelectorAll('[data-en]');
  for(var i=0;i<n.length;i++){var v=n[i].getAttribute('data-'+l);if(v!==null)n[i].textContent=v;}
  var b=document.querySelectorAll('.lang button');
  for(var j=0;j<b.length;j++){b[j].setAttribute('aria-pressed',String(b[j].getAttribute('data-lang')===l));}
  window.SITE_LANG=l;
  document.dispatchEvent(new CustomEvent('sitelangchange',{detail:l}));
}
window.setSiteLang=function(l){try{localStorage.setItem(KEY,l);}catch(e){}apply(l);};
var bs=document.querySelectorAll('.lang button');
for(var k=0;k<bs.length;k++){(function(x){x.addEventListener('click',function(){window.setSiteLang(x.getAttribute('data-lang'));});})(bs[k]);}
apply(getLang());

var btn=$('menuBtn'),dr=$('drawer'),sc=$('scrim'),cl=$('drawerClose');
function openD(){dr.classList.add('open');sc.classList.add('show');btn.setAttribute('aria-expanded','true');dr.setAttribute('aria-hidden','false');document.body.classList.add('noscroll');var f=dr.querySelector('a');if(f)f.focus();}
function closeD(ret){dr.classList.remove('open');sc.classList.remove('show');btn.setAttribute('aria-expanded','false');dr.setAttribute('aria-hidden','true');document.body.classList.remove('noscroll');if(ret)btn.focus();}
btn.addEventListener('click',function(){if(dr.classList.contains('open'))closeD(true);else openD();});
sc.addEventListener('click',function(){closeD(true);});
cl.addEventListener('click',function(){closeD(true);});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&dr.classList.contains('open'))closeD(true);});
var links=dr.querySelectorAll('a');
for(var m=0;m<links.length;m++){(function(a){a.addEventListener('click',function(e){
  var c=a.getAttribute('data-cat');
  if(c&&window.setCategory){e.preventDefault();window.setCategory(c,true);}
  closeD(false);
});})(links[m]);}

var rp=$('rp'),art=document.querySelector('article.post');
if(rp&&art){
  $('rpWrap').hidden=false;
  var tick=false;
  function upd(){tick=false;var r=art.getBoundingClientRect(),vh=window.innerHeight,tot=r.height-vh*0.6;var p=tot>0?(-r.top+vh*0.1)/tot:1;if(p<0)p=0;if(p>1)p=1;rp.style.width=(p*100)+'%';}
  window.addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(upd);}},{passive:true});
  window.addEventListener('resize',upd);upd();
}
})();
