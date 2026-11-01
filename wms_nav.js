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
    'wms_inventura.html':function(){return hasFn('loadInvPage')&&loadInvPage(true);}
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
