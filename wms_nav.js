/* PRG WMS – sdílené boční menu. Stránka má <nav id="wms-nav" data-active="klíč"></nav>.
   Nová stránka WMS se přidává jen sem (ITEMS). Nastavení a utility patří do skupiny Setup (group:'setup'). */
(function(){
  var ITEMS=[
    {k:'hub',      i:'📊', t:'Hub',        u:'wms_dashboard.html'},
    {k:'wms',      i:'🏭', t:'PRG WMS',    u:'wms_dashboard.html?app=wms'},
    {k:'balances', i:'🧮', t:'Zásoby',     u:'wms_balances.html'},
    {k:'adjustments',i:'🔧', t:'Adjustments', u:'wms_adjustments.html'},
    {k:'history',  i:'🕘', t:'Historie',   u:'wms_history.html'},
    {k:'clients',  i:'🏢', t:'Klienti',    u:'wms_clients.html'},
    {k:'receipts', i:'📥', t:'Příjmy',     u:'wms_receipts.html'},
    {k:'deliveries',i:'📤',t:'Výdeje',     u:'wms_deliveries.html'},
    {k:'yard',     i:'🚛', t:'Yard',       u:'wms_yard.html'},
    {k:'scans',    i:'📱', t:'Skeny',      u:'wms_scans.html'},
    {group:'setup', i:'⚙️', t:'Setup', items:[
      {k:'stock',    i:'🏷️', t:'SKU Setup',     u:'wms_stock.html'},
      {k:'dc',       i:'🏬', t:'DC',            u:'wms_warehouses.html'},
      {k:'locations',i:'📍', t:'Lokace',        u:'wms_locations.html'},
      {k:'print',    i:'🖨️', t:'Šablony tisku', u:'wms_print.html', admin:true}
    ]},
    {sep:true},
    {k:'inventura',i:'📋', t:'Inventory Tool', u:'wms_inventura.html'},
    {k:'users',    i:'👥', t:'Uživatelé',  u:'wms_users.html', admin:true}
  ];
  var KEY='prg_nav_open_';
  function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  function item(it,act,sub){
    return '<div class="nav-item'+(it.k===act?' active':'')+(it.admin?' admin-only':'')+'" onclick="go(\''+it.u+'\')"'+(sub?' style="padding-left:34px;font-size:13.5px"':'')+'><span class="nav-icon">'+it.i+'</span> '+it.t+'</div>';
  }
  function build(){
    var nav=document.getElementById('wms-nav');if(!nav)return;
    var act=nav.getAttribute('data-active')||'';
    nav.innerHTML=ITEMS.map(function(it){
      if(it.sep)return '<div style="height:1px;background:rgba(255,255,255,0.15);margin:8px 18px"></div>';
      if(it.group){
        var inside=it.items.some(function(x){return x.k===act;});
        var open=inside||lsGet(KEY+it.group)==='1';
        return '<div class="nav-item nav-group'+(inside?' nav-group-in':'')+'" data-group="'+it.group+'" style="'+(inside?'color:#fff;':'')+'"><span class="nav-icon">'+it.i+'</span> <span style="flex:1">'+it.t+'</span><span class="nav-caret" style="font-size:11px;opacity:.8;transition:transform .15s;display:inline-block;transform:rotate('+(open?'90':'0')+'deg)">▶</span></div>'
          +'<div class="nav-sub" data-sub="'+it.group+'" style="display:'+(open?'block':'none')+'">'+it.items.map(function(x){return item(x,act,true);}).join('')+'</div>';
      }
      return item(it,act,false);
    }).join('');
    nav.querySelectorAll('.nav-group').forEach(function(g){
      g.onclick=function(){
        var name=g.getAttribute('data-group'),sub=nav.querySelector('[data-sub="'+name+'"]'),open=sub.style.display==='none';
        sub.style.display=open?'block':'none';
        g.querySelector('.nav-caret').style.transform='rotate('+(open?'90':'0')+'deg)';
        lsSet(KEY+name,open?'1':'0');
      };
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();

  /* ── Automatické obnovení dat každých 15 s ──
     Jen na přehledových stránkách. Neobnovuje, když uživatel píše, má otevřené okno, označené řádky
     nebo s myší/klávesnicí pracoval před chvílí. Během obnovení nenechá tabulky bliknout na „Načítám…"
     a vrátí stránkování i pozici posunu. Vypnutí: localStorage prg_autorefresh = '0'. */
  /* ── Mobilní zobrazení (telefon do 640 px), společné pro všechny stránky ──
     Horní lišta se zalomí (nadpis nahoře, tlačítka pod ním), tabulky se přehledů změní na karty
     (každý řádek = karta, u hodnoty je název sloupce). Tabulky se vstupními poli zůstanou jako tabulka s posunem do strany.
     Tabulku lze vyřadit třídou no-stack. */
  (function mobileCss(){
    var css='@media(max-width:640px){'
      +'.topbar{flex-wrap:wrap;row-gap:8px;}'
      +'.topbar h2{flex:1 1 0;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:20px;}'
      +'.topbar-actions{flex:1 1 100%;flex-wrap:wrap;gap:6px;}'
      +'.topbar-actions .btn,.topbar-actions button{padding:6px 10px;font-size:13px;}'
      +'.topbar-actions select{max-width:100%;min-width:0;}'
      +'.card-header{flex-wrap:wrap;gap:8px;padding:12px 14px;}'
      +'.content{padding:10px !important;}'
      +'table.m-stack,table.m-stack tbody{display:block;width:100%;}'
      +'table.m-stack thead{display:none;}'
      +'table.m-stack tr{display:block;border-bottom:1px solid var(--border,#e2e6ed);padding:8px 12px;}'
      +'table.m-stack tbody tr:last-child{border-bottom:none;}'
      +'table.m-stack td{display:block;border:none !important;padding:4px 0 !important;text-align:right !important;min-height:26px;white-space:normal !important;overflow:hidden;}'
      +'table.m-stack td::before{content:attr(data-label);float:left;max-width:45%;margin-right:10px;padding-top:3px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:var(--muted,#7a8090);}'
      +'table.m-stack td[data-label=""]::before{display:none;}'
      +'table.m-stack td .btn,table.m-stack td button{margin:2px 0 2px 4px;}'
      +'table.m-stack td:first-child{font-size:15px;text-align:left !important;padding-bottom:6px !important;}'
      +'table.m-stack td:first-child::before{display:none;}'
      +'table.m-stack tr.empty-row td,table.m-stack td[colspan]{display:block;text-align:center !important;padding:18px 0 !important;}'
      +'table.m-stack tr.empty-row td::before,table.m-stack td[colspan]::before{display:none;}'
      +'}';
    var st=document.createElement('style');st.id='prg-mobile-css';st.textContent=css;
    (document.head||document.documentElement).appendChild(st);
  })();
  function labelTables(root){
    var ts=(root||document).querySelectorAll?(root||document).querySelectorAll('table'):[];
    for(var i=0;i<ts.length;i++){
      var t=ts[i];if(t.classList.contains('no-stack'))continue;
      var ths=t.querySelectorAll('thead th');if(!ths.length)continue;
      if(t.querySelector('tbody input:not([type=checkbox]),tbody select,tbody textarea')){t.classList.remove('m-stack');continue;}
      if(t.querySelector('tbody input[type=checkbox]'))continue;   // výběr řádků – nechat jako tabulku
      var labels=[].map.call(ths,function(h){return (h.textContent||'').replace(/\s+/g,' ').trim();});
      t.classList.add('m-stack');
      var rows=t.querySelectorAll('tbody tr');
      for(var r=0;r<rows.length;r++){var c=0,cells=rows[r].children;for(var k=0;k<cells.length;k++){var td=cells[k];var lab=labels[c]||'';if(td.getAttribute('data-label')!==lab)td.setAttribute('data-label',lab);c+=td.colSpan||1;}}
    }
  }
  var ltTimer=null;
  function scheduleLabel(){clearTimeout(ltTimer);ltTimer=setTimeout(function(){labelTables(document);},30);}
  function startLabeler(){labelTables(document);try{new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var n=ms[i].target;if(n.closest&&n.closest('table')||n.tagName==='TABLE'||n.tagName==='TBODY'){scheduleLabel();return;}if(ms[i].addedNodes.length){scheduleLabel();return;}}}).observe(document.body,{childList:true,subtree:true});}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startLabeler);else startLabeler();
  window.PRG_LABEL_TABLES=labelTables;

  /* ── Odhlášení po 60 min nečinnosti (stejně jako scanner) ──
     Čas poslední aktivity je v localStorage, takže platí napříč stránkami a záložkami
     a funguje i po uspání PC nebo zavření prohlížeče. Automatické obnovení dat se jako aktivita nepočítá. */
  var IDLE_MS=60*60*1000,ACT_KEY='prg_web_last_act',actWritten=0,loggingOut=false;
  function lastAct0(){var v=parseInt(lsGet(ACT_KEY)||'0',10);return isNaN(v)?0:v;}
  function markAct(){var n=Date.now();if(n-actWritten<10000)return;actWritten=n;lsSet(ACT_KEY,String(n));}
  function hasSession(){try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^sb-.*-auth-token$/.test(k))return true;}}catch(e){}return false;}
  async function idleLogout(){
    if(loggingOut)return;loggingOut=true;
    try{sessionStorage.clear();}catch(e){}
    try{if(window.supa&&supa.auth)await Promise.race([supa.auth.signOut(),new Promise(function(r){setTimeout(r,3000);})]);}catch(e){}
    try{Object.keys(localStorage).forEach(function(k){if(/^sb-.*-auth-token$/.test(k))localStorage.removeItem(k);});}catch(e){}
    try{localStorage.removeItem(ACT_KEY);}catch(e){}
    alert('Byl jsi odhlášen po 60 minutách nečinnosti. Přihlas se znovu.');
    window.location.href='wms_dashboard.html';
  }
  function idleCheck(){
    var l=lastAct0();
    if(l&&Date.now()-l>IDLE_MS&&hasSession()){idleLogout();return true;}
    return false;
  }
  window.PRG_IDLE={check:idleCheck,ms:IDLE_MS,key:ACT_KEY};
  if(!idleCheck()){
    if(!lastAct0()||!hasSession())lsSet(ACT_KEY,String(Date.now()));
    else markAct();   // otevření stránky = aktivita
  }
  ['mousedown','keydown','touchstart','wheel','scroll','mousemove'].forEach(function(ev){document.addEventListener(ev,function(){if(!loggingOut&&!idleCheck())markAct();},{passive:true,capture:true});});
  setInterval(idleCheck,30000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)idleCheck();});
  window.addEventListener('pageshow',idleCheck);
  // po odhlášení nenechávat heslo vyplněné
  function clearPass(){var p=document.getElementById('login-pass');if(p){p.value='';p.setAttribute('autocomplete','new-password');}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clearPass);else clearPass();

  var EVERY=15000;
  function hasFn(n){return typeof window[n]==='function';}
  function hVal(id){var e=document.getElementById(id);return e?String(e.value||'').trim():'';}
  var PAGES={
    'wms_dashboard.html':function(){return hasFn('loadDashboard')&&loadDashboard();},
    'wms_balances.html':'load','wms_clients.html':'load','wms_receipts.html':'load','wms_deliveries.html':'load',
    'wms_scans.html':'load','wms_locations.html':'load','wms_warehouses.html':'load','wms_yard.html':'load',
    'wms_stock.html':'load','wms_users.html':'load',
    'wms_adjustments.html':'loadHistory',
    'wms_history.html':function(){return hVal('h-q')&&hasFn('runSearch')&&runSearch();},
    'wms_inventura.html':function(){return hasFn('loadInvPage')&&loadInvPage(true);},
    'wms_receipt.html':function(){return window.PRG_DOCEDIT&&PRG_DOCEDIT.refreshLive();},
    'wms_delivery.html':function(){return window.PRG_DOCEDIT&&PRG_DOCEDIT.refreshLive();}
  };
  var file=(location.pathname.split('/').pop()||'wms_dashboard.html').toLowerCase();
  var job=PAGES[file];
  if(job){
    var lastAct=Date.now(),running=false;
    ['mousedown','keydown','touchstart','wheel'].forEach(function(ev){document.addEventListener(ev,function(){lastAct=Date.now();},{passive:true,capture:true});});
    function visible(el){if(!el)return false;var cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden';}
    function busy(){
      if(document.hidden)return 'hidden';
      if(lsGet('prg_autorefresh')==='0')return 'off';
      if(Date.now()-lastAct<4000)return 'activity';
      var app=document.getElementById('app');if(app&&!visible(app))return 'login';var au=document.getElementById('auth-screen');if(au&&visible(au))return 'login';
      var ae=document.activeElement;
      if(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)&&!ae.readOnly&&ae.type!=='button'&&ae.type!=='checkbox')return 'typing';
      if(ae&&ae.isContentEditable)return 'typing';
      var ms=document.querySelectorAll('.modal-backdrop,.modal-overlay,.modal,[id^="modal"]');
      for(var i=0;i<ms.length;i++){var m=ms[i];if(m.style.display==='none')continue;if(/modal-(box|body|header|footer|close)/.test(m.className))continue;if(visible(m)&&m.offsetWidth>0&&getComputedStyle(m).position==='fixed')return 'modal';}
      if(document.querySelector('tbody input[type=checkbox]:checked'))return 'selection';
      var sel=window.getSelection&&window.getSelection();if(sel&&String(sel).length)return 'text';
      return '';
    }
    var ihD=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML'),tcD=Object.getOwnPropertyDescriptor(Node.prototype,'textContent'),quiet=false;
    var LOADING=/^\s*(<[^>]*>\s*)*[^<]{0,12}Načítám/;
    if(ihD&&ihD.set)Object.defineProperty(Element.prototype,'innerHTML',{configurable:true,enumerable:ihD.enumerable,get:ihD.get,set:function(v){if(quiet&&typeof v==='string'&&v.length<400&&LOADING.test(v))return;ihD.set.call(this,v);}});
    if(tcD&&tcD.set)Object.defineProperty(Node.prototype,'textContent',{configurable:true,enumerable:tcD.enumerable,get:tcD.get,set:function(v){if(quiet&&typeof v==='string'&&v.length<60&&LOADING.test(v))return;tcD.set.call(this,v);}});
    async function tick(){
      if(running||busy())return;
      running=true;
      var y=window.scrollY,pg=(typeof window.page==='number')?window.page:null;
      var mains=[].slice.call(document.querySelectorAll('.main,.content,.page-content,.table-wrap,.tbl-wrap')).map(function(e){return [e,e.scrollTop];});
      document.body.style.minHeight=document.body.scrollHeight+'px';
      quiet=true;
      try{
        var r=typeof job==='string'?(hasFn(job)&&window[job]()):job();
        await Promise.race([Promise.resolve(r),new Promise(function(res){setTimeout(res,10000);})]);
        await new Promise(function(res){setTimeout(res,50);});
      }catch(e){console.warn('auto-refresh',e);}
      quiet=false;
      try{
        if(pg&&typeof window.page==='number'&&window.page!==pg&&hasFn('render')){window.page=pg;render();}
      }catch(e){}
      mains.forEach(function(m){m[0].scrollTop=m[1];});
      window.scrollTo(0,y);
      document.body.style.minHeight='';
      running=false;
    }
    window.PRG_AUTOREFRESH={tick:tick,busy:busy,every:EVERY};
    setInterval(tick,EVERY);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(tick,300);});
  }
})();
