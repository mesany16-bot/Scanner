/* PRG WMS – sdílené boční menu. Stránka má <nav id="wms-nav" data-active="klíč"></nav>.
   Nová stránka WMS se přidává jen sem (ITEMS). */
(function(){
  var ITEMS=[
    {k:'hub',      i:'📊', t:'Hub',        u:'wms_dashboard.html'},
    {k:'wms',      i:'🏭', t:'PRG WMS',    u:'wms_dashboard.html?app=wms'},
    {k:'stock',    i:'🏷️', t:'SKU Setup',  u:'wms_stock.html'},
    {k:'balances', i:'🧮', t:'Zásoby',     u:'wms_balances.html'},
    {k:'adjustments',i:'🔧', t:'Adjustments', u:'wms_adjustments.html'},
    {k:'dc',       i:'🏬', t:'DC',         u:'wms_warehouses.html'},
    {k:'locations',i:'📍', t:'Lokace',     u:'wms_locations.html'},
    {k:'clients',  i:'🏢', t:'Klienti',    u:'wms_clients.html'},
    {k:'receipts', i:'📥', t:'Příjmy',     u:'wms_receipts.html'},
    {k:'deliveries',i:'📤',t:'Výdeje',     u:'wms_deliveries.html'},
    {k:'scans',    i:'📱', t:'Skeny',      u:'wms_scans.html'},
    {sep:true},
    {k:'inventura',i:'📋', t:'Inventory Tool', u:'wms_inventura.html'},
    {k:'users',    i:'👥', t:'Uživatelé',  u:'wms_users.html', admin:true}
  ];
  function build(){
    var nav=document.getElementById('wms-nav');if(!nav)return;
    var act=nav.getAttribute('data-active')||'';
    nav.innerHTML=ITEMS.map(function(it){
      if(it.sep)return '<div style="height:1px;background:rgba(255,255,255,0.15);margin:8px 18px"></div>';
      return '<div class="nav-item'+(it.k===act?' active':'')+(it.admin?' admin-only':'')+'" onclick="go(\''+it.u+'\')"><span class="nav-icon">'+it.i+'</span> '+it.t+'</div>';
    }).join('');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
