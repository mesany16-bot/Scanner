/* PRG WMS – sdílené boční menu. Stránka má <nav id="wms-nav" data-active="klíč"></nav>.
   Nová stránka WMS se přidává jen sem (ITEMS). Nastavení a utility patří do skupiny Setup (group:'setup'). */
(function(){
  var ITEMS=[
    {k:'hub',      i:'📊', t:'Hub',        u:'wms_dashboard.html'},
    {k:'wms',      i:'🏭', t:'PRG WMS',    u:'wms_dashboard.html?app=wms'},
    {k:'stock',    i:'🏷️', t:'SKU Setup',  u:'wms_stock.html'},
    {k:'balances', i:'🧮', t:'Zásoby',     u:'wms_balances.html'},
    {k:'adjustments',i:'🔧', t:'Adjustments', u:'wms_adjustments.html'},
    {k:'history',  i:'🕘', t:'Historie',   u:'wms_history.html'},
    {k:'clients',  i:'🏢', t:'Klienti',    u:'wms_clients.html'},
    {k:'receipts', i:'📥', t:'Příjmy',     u:'wms_receipts.html'},
    {k:'deliveries',i:'📤',t:'Výdeje',     u:'wms_deliveries.html'},
    {k:'yard',     i:'🚛', t:'Yard',       u:'wms_yard.html'},
    {k:'scans',    i:'📱', t:'Skeny',      u:'wms_scans.html'},
    {group:'setup', i:'⚙️', t:'Setup', items:[
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
})();
