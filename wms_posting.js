/* PRG WMS - zauctovani prijmu (zaskladneni) a vydeju (vyskladneni) do Zasob po lokacich.
   Pouziti:
     PRG_POST.receipt({supa:supa, docId:id, userId:currentUser.id, onDone:function(){...}})
     PRG_POST.delivery({supa:supa, docId:id, userId:currentUser.id, onDone:function(){...}})
   Zapis probiha v databazi jednou operaci (funkce wms_post_receipt / wms_post_delivery z posting_setup.sql). */
(function(){
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function nf(n){return (Number(n)||0).toLocaleString('cs-CZ');}
  function up(s){return String(s==null?'':s).trim().toUpperCase();}
  function errMsg(e){
    var m=String((e&&e.message)||e||'');
    if(m.indexOf('NO_LOCATION:')===0)return 'Lokace „'+m.split(':')[1]+'“ v DC dokladu neexistuje nebo není aktivní.';
    if(m.indexOf('BELOW_AVAILABLE:')===0){var p=m.split(':');return 'V lokaci '+p[1]+' je dostupných jen '+p[2]+' ks (někdo mezitím změnil zásobu). Obnov okno.';}
    if(m.indexOf('LOT_REQUIRED:')===0)return 'Klient vyžaduje LOT – vyplň LOT u SKU '+m.split(':')[1]+'.';
    if(m.indexOf('MIX_BULK:')===0)return 'Do bulk lokace '+m.split(':')[1]+' nelze míchat jiné SKU nebo LOT.';
    if(m.indexOf('NOT_ALLOCATABLE:')===0)return 'Zásoba v lokaci '+m.split(':')[1]+' je ve stavu, který nejde vydat (poškozené, PIR, hold).';
    if(m.indexOf('ALREADY_CONFIRMED')===0)return 'Doklad už je potvrzený.';
    if(m.indexOf('NO_DC')===0)return 'Doklad nemá vybrané DC (sklad).';
    if(m.indexOf('NO_LINES')===0)return 'Není co zaúčtovat.';
    if(m.indexOf('QTY_RANGE')===0)return 'Množství musí být větší než 0.';
    if(m.indexOf('BAD_DC')===0)return 'Zásoba patří do jiného DC než doklad.';
    if(m.indexOf('NOT_FOUND')===0)return 'Doklad nebo zásoba už neexistuje. Obnov stránku.';
    if(/function .* does not exist|schema cache|stock_ledger/i.test(m))return 'Chybí databázové funkce – spusť SQL posting_setup.sql.';
    return m;
  }
  var CSS='.pp-box{max-width:1000px!important}.pp-box table{width:100%;border-collapse:collapse;font-size:12.5px}.pp-box th{text-align:left;font-size:10.5px;text-transform:uppercase;color:#7a8090;padding:6px;border-bottom:1px solid #e2e6ed}.pp-box td{padding:4px 6px;border-bottom:1px solid #eef0f4;vertical-align:middle}.pp-box td input{padding:6px 8px;border:1.5px solid #e2e6ed;border-radius:6px;font-size:12.5px;width:100%;outline:none;font-family:inherit;background:#fff}.pp-box td input:focus{border-color:#0a7c4e}.pp-box .num{text-align:right}.pp-grp td{background:#f6f8fa;font-weight:600}.pp-ok{color:#0a7c4e}.pp-warn{color:#e67e22}.pp-err{color:#c0392b}.pp-msg{font-size:13px;margin:8px 0;min-height:18px}.pp-x{background:none;border:none;color:#c0392b;cursor:pointer;font-size:17px}.pp-sm{padding:4px 8px!important;font-size:11.5px!important}';
  function modal(title){
    var old=document.getElementById('pp-modal');if(old)old.remove();
    if(!document.getElementById('pp-css')){var st=document.createElement('style');st.id='pp-css';st.textContent=CSS;document.head.appendChild(st);}
    var m=document.createElement('div');m.id='pp-modal';m.className='modal-backdrop';m.style.display='flex';
    m.innerHTML='<div class="modal-box pp-box"><div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e2e6ed"><h3 style="font-size:17px">'+esc(title)+'</h3><button class="modal-close" id="pp-x" style="background:none;border:none;font-size:20px;cursor:pointer">✕</button></div><div class="modal-body" id="pp-body" style="padding:16px 20px">Načítám…</div><div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid #e2e6ed"><span id="pp-sum" style="flex:1;font-size:13px;align-self:center"></span><button class="btn btn-secondary" id="pp-cancel">Zrušit</button><button class="btn btn-primary" id="pp-go" disabled>Potvrdit</button></div></div>';
    document.body.appendChild(m);
    var close=function(){m.remove();};
    document.getElementById('pp-x').onclick=close;document.getElementById('pp-cancel').onclick=close;
    return {el:m,body:document.getElementById('pp-body'),go:document.getElementById('pp-go'),sum:document.getElementById('pp-sum'),close:close};
  }
  async function selAll(q){var out=[],from=0;while(true){var r=await q().range(from,from+999);if(r.error)throw r.error;var d=r.data||[];out=out.concat(d);if(d.length<1000)break;from+=1000;}return out;}
  async function skuMap(supa,items){
    var ids=items.map(function(i){return i.stock_item_id;}).filter(function(x){return x!=null;}),m={};
    if(ids.length){var r=await supa.from('stock_items').select('id,sku').in('id',ids);(r.data||[]).forEach(function(s){m[s.id]=s.sku;});}
    return m;
  }

  /* ================= PRIJEM ================= */
  async function receipt(o){
    var supa=o.supa,M=modal('Zaskladnění příjmu'),rows=[],doc=null,plan={};
    try{
      var dr=await supa.from('receipts').select('*').eq('id',o.docId).single();if(dr.error||!dr.data)throw new Error('Doklad nenalezen');doc=dr.data;
      if(doc.warehouse_id==null){M.body.innerHTML='<p class="pp-err">Doklad nemá vybrané DC (sklad). Vyber ho ve formuláři a ulož.</p>';return;}
      var ir=await supa.from('receipt_items').select('*').eq('receipt_id',o.docId);var items=ir.data||[];
      if(!items.length){M.body.innerHTML='<p class="pp-err">Doklad nemá žádné položky.</p>';return;}
      var sm=await skuMap(supa,items);
      var locs=await selAll(function(){return supa.from('locations').select('code').eq('dc_id',doc.warehouse_id).eq('is_active',true).order('code');});
      var lotReq=false;if(doc.client_id!=null){try{var cr=await supa.from('clients').select('lot_required').eq('id',doc.client_id).single();lotReq=!!(cr.data&&cr.data.lot_required);}catch(e){}}
      var exempt={};if(lotReq){try{var skl=items.map(function(it){return it.sku||sm[it.stock_item_id]||'';}).filter(Boolean);var er=await supa.from('stock_items').select('sku,lot_exempt').in('sku',skl);(er.data||[]).forEach(function(x){if(x.lot_exempt)exempt[up(x.sku)]=true;});}catch(e){}}
      items.forEach(function(it){
        var sku=it.sku||sm[it.stock_item_id]||'',q=Number(it.quantity)||0,n=Math.max(1,Math.min(Number(it.pallets)||1,q||1));
        plan[up(sku)]=(plan[up(sku)]||0)+q;
        var base=Math.floor(q/n),rest=q-base*n;
        for(var k=0;k<n;k++)rows.push({sku:sku,qty:base+(k<rest?1:0),lot:it.lot||'',location:'',lpn:'',condition:''});
      });
      M.body.innerHTML='<p style="font-size:13px;color:#555;margin-bottom:10px">Každý řádek = jedna paleta v jedné lokaci. Řádek můžeš rozdělit (➕), např. na víc palet. Prázdná lokace = zboží půjde do <b>UNASSIGNED</b> a zaskladní se později přesunem.'+(lotReq?' <b style="color:#c0392b">Klient vyžaduje LOT.</b>':'')+'</p>'
        +'<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap"><button class="btn btn-secondary pp-sm" id="pp-lpn">Vyplnit LPN automaticky</button><input id="pp-loc-all" list="pp-locs" placeholder="Jedna lokace pro všechny prázdné" style="padding:6px 8px;border:1.5px solid #e2e6ed;border-radius:6px;font-size:12.5px;text-transform:uppercase;min-width:220px"><button class="btn btn-secondary pp-sm" id="pp-loc-fill">Doplnit</button></div>'
        +'<datalist id="pp-locs">'+locs.map(function(l){return '<option value="'+esc(l.code)+'">';}).join('')+'</datalist>'
        +'<div style="overflow-x:auto"><table><thead><tr><th>SKU</th><th>LOT</th><th class="num" style="width:90px">Množství</th><th style="width:170px">Lokace *</th><th style="width:150px">LPN</th><th style="width:90px">Kondice</th><th style="width:60px"></th></tr></thead><tbody id="pp-tb"></tbody></table></div><div class="pp-msg" id="pp-msg"></div>';
      document.getElementById('pp-lpn').onclick=function(){rows.forEach(function(r,i){if(!r.lpn)r.lpn=(doc.receipt_number||'PRI')+'-'+String(i+1).padStart(3,'0');});draw();};
      document.getElementById('pp-loc-fill').onclick=function(){var v=up(document.getElementById('pp-loc-all').value);if(!v)return;rows.forEach(function(r){if(!r.location)r.location=v;});draw();};
      draw();M.go.disabled=false;M.go.textContent='Zaskladnit a potvrdit';
    }catch(e){M.body.innerHTML='<p class="pp-err">'+esc(errMsg(e))+'</p>';return;}

    function draw(){
      var tb=document.getElementById('pp-tb');
      tb.innerHTML=rows.map(function(r,i){return '<tr><td><b>'+esc(r.sku)+'</b></td><td><input data-i="'+i+'" data-f="lot" value="'+esc(r.lot)+'"></td><td><input class="num" type="number" min="1" step="1" data-i="'+i+'" data-f="qty" value="'+esc(r.qty)+'"></td><td><input list="pp-locs" style="text-transform:uppercase" data-i="'+i+'" data-f="location" value="'+esc(r.location)+'"></td><td><input data-i="'+i+'" data-f="lpn" value="'+esc(r.lpn)+'"></td><td><input data-i="'+i+'" data-f="condition" value="'+esc(r.condition)+'"></td><td style="white-space:nowrap"><button class="pp-x" title="Rozdělit řádek" data-split="'+i+'" style="color:#0a7c4e">➕</button>'+(rows.length>1?'<button class="pp-x" title="Odebrat" data-del="'+i+'">×</button>':'')+'</td></tr>';}).join('');
      tb.querySelectorAll('input').forEach(function(inp){inp.oninput=function(){var r=rows[+inp.dataset.i],f=inp.dataset.f;r[f]=f==='qty'?(parseFloat(inp.value)||0):(f==='location'?up(inp.value):inp.value);summary();};});
      tb.querySelectorAll('[data-split]').forEach(function(b){b.onclick=function(){var i=+b.dataset.split,r=rows[i];if((Number(r.qty)||0)<2)return;var half=Math.floor((Number(r.qty)||0)/2);var nr=Object.assign({},r,{qty:(Number(r.qty)||0)-half,lpn:'',location:''});r.qty=half;rows.splice(i+1,0,nr);draw();};});
      tb.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){rows.splice(+b.dataset.del,1);draw();};});
      summary();
    }
    function totals(){var t={};rows.forEach(function(r){t[up(r.sku)]=(t[up(r.sku)]||0)+(Number(r.qty)||0);});return t;}
    function summary(){
      var t=totals(),diff=Object.keys(plan).concat(Object.keys(t)).filter(function(k,i,a){return a.indexOf(k)===i&&(plan[k]||0)!==(t[k]||0);});
      var sumAll=rows.reduce(function(a,r){return a+(Number(r.qty)||0);},0),planAll=Object.keys(plan).reduce(function(a,k){return a+plan[k];},0);
      M.sum.innerHTML='Palet: <b>'+rows.length+'</b> · Kusů: <b>'+nf(sumAll)+'</b> / plán '+nf(planAll)+(diff.length?' <span class="pp-warn">· rozdíl u: '+esc(diff.join(', '))+'</span>':' <span class="pp-ok">· sedí s plánem</span>');
    }
    M.go.onclick=async function(){
      var msg=document.getElementById('pp-msg');
      var bad=rows.filter(function(r){return !(Number(r.qty)>0);});
      if(bad.length){msg.innerHTML='<span class="pp-err">Každý řádek musí mít množství větší než 0.</span>';return;}
      var noLot=rows.filter(function(r){return lotReq&&!String(r.lot||'').trim()&&!exempt[up(r.sku)];});
      if(noLot.length){msg.innerHTML='<span class="pp-err">Klient vyžaduje LOT – chybí u: '+esc(noLot.map(function(r){return r.sku;}).filter(function(v,i,a){return a.indexOf(v)===i;}).join(', '))+'</span>';return;}
      var unas=rows.filter(function(r){return !r.location;}).length;
      if(unas&&!confirm(unas+' řádků nemá lokaci a půjde do UNASSIGNED. Pokračovat?'))return;
      var t=totals(),diff=Object.keys(plan).concat(Object.keys(t)).filter(function(k,i,a){return a.indexOf(k)===i&&(plan[k]||0)!==(t[k]||0);});
      if(diff.length&&!confirm('Přijímané množství se liší od plánu u: '+diff.join(', ')+'. Přesto potvrdit?'))return;
      M.go.disabled=true;M.go.textContent='Zapisuji…';
      var r=await supa.rpc('wms_post_receipt',{p_receipt_id:o.docId,p_lines:rows.map(function(x){return {sku:x.sku,qty:Number(x.qty),location:x.location,lpn:x.lpn||null,lot:x.lot||null,condition:x.condition||null};}),p_user:o.userId||null});
      if(r.error){msg.innerHTML='<span class="pp-err">'+esc(errMsg(r.error))+'</span>';M.go.disabled=false;M.go.textContent='Zaskladnit a potvrdit';return;}
      M.close();if(typeof o.onDone==='function')o.onDone(r.data);
    };
  }

  /* ================= VYDEJ ================= */
  async function delivery(o){
    var supa=o.supa,M=modal('Vyskladnění výdeje'),groups=[],alloc={},doc=null,blockedQty={};
    try{
      var dr=await supa.from('deliveries').select('*').eq('id',o.docId).single();if(dr.error||!dr.data)throw new Error('Doklad nenalezen');doc=dr.data;
      if(doc.warehouse_id==null){M.body.innerHTML='<p class="pp-err">Doklad nemá vybrané DC (sklad). Vyber ho ve formuláři a ulož.</p>';return;}
      var ir=await supa.from('delivery_items').select('*').eq('delivery_id',o.docId);var items=ir.data||[];
      if(!items.length){M.body.innerHTML='<p class="pp-err">Doklad nemá žádné položky.</p>';return;}
      var sm=await skuMap(supa,items);
      items.forEach(function(it){it._sku=it.sku||sm[it.stock_item_id]||'';});
      var skus=items.map(function(i){return i._sku;}).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;});
      var balAll=skus.length?await selAll(function(){return supa.from('stock_balances').select('id,sku,location_code,lpn,lot,condition_code,units_available,units_total,received_at').eq('dc_id',doc.warehouse_id).in('sku',skus).gt('units_available',0).order('received_at',{ascending:true}).order('location_code');}):[];
      var blocked={DAMAGE:1,PIR:1,HOLD:1,QUARANTINE:1};
      try{var cc=await supa.from('condition_codes').select('code,allocatable');if(!cc.error&&cc.data){blocked={};cc.data.forEach(function(c){if(!c.allocatable)blocked[up(c.code)]=1;});}}catch(e){}
      var bal=balAll.filter(function(b){return !blocked[up(b.condition_code)];});
      blockedQty={};balAll.forEach(function(b){if(blocked[up(b.condition_code)])blockedQty[up(b.sku)]=(blockedQty[up(b.sku)]||0)+(Number(b.units_available)||0);});
      var prim={};try{var pr=await supa.from('stock_items').select('sku,primary_location').in('sku',skus);(pr.data||[]).forEach(function(x){if(x.primary_location)prim[up(x.sku)]=up(x.primary_location);});}catch(e){}
      var fullPal=false;if(doc.client_id!=null){try{var cr=await supa.from('clients').select('round_full_pallets').eq('id',doc.client_id).single();fullPal=!!(cr.data&&cr.data.round_full_pallets);}catch(e){}}
      var left={};bal.forEach(function(b){left[b.id]=Number(b.units_available)||0;});
      items.forEach(function(it){
        var c=bal.filter(function(b){return up(b.sku)===up(it._sku)&&(!it.lot||String(b.lot||'')===String(it.lot));});
        var pref=function(b){return it.location_code&&up(b.location_code)===up(it.location_code)?2:(prim[up(it._sku)]&&up(b.location_code)===prim[up(it._sku)]?1:0);};
        c=c.map(function(b,i){return {b:b,i:i};}).sort(function(x,y){return pref(y.b)-pref(x.b)||x.i-y.i;}).map(function(x){return x.b;});
        var need=Number(it.quantity)||0,g={item:it,cands:c.slice(0,40),primary:prim[up(it._sku)]||''};
        g.cands.forEach(function(b){if(need<=0)return;var take=fullPal?(left[b.id]>=Number(b.units_available)?left[b.id]:0):Math.min(need,left[b.id]);if(take>0){alloc[it.id+'|'+b.id]=take;left[b.id]-=take;need-=take;}});
        groups.push(g);
      });
      M.body.innerHTML='<p style="font-size:13px;color:#555;margin-bottom:10px">Návrh odběru: zadaná lokace, pak pick lokace SKU, pak FIFO (nejstarší příjem první), s ohledem na LOT.'+(fullPal?' <b>Klient: výdej po celých paletách</b> (množství se zaokrouhlí nahoru).':'')+' Zboží ve stavu DAMAGE, PIR, HOLD a QUARANTINE se nenabízí. Když v lokaci zboží chybí, klikni ⚠ – celá lokace přejde do PIR.</p><div style="overflow-x:auto"><table><thead><tr><th>Lokace</th><th>LPN</th><th>LOT</th><th>Kondice</th><th>Příjem</th><th class="num">Dostupné</th><th class="num" style="width:100px">Vydat</th></tr></thead><tbody id="pp-tb"></tbody></table></div><div class="pp-msg" id="pp-msg"></div>';
      draw();M.go.disabled=false;M.go.textContent='Vyskladnit a potvrdit';
    }catch(e){M.body.innerHTML='<p class="pp-err">'+esc(errMsg(e))+'</p>';return;}

    function given(g){return g.cands.reduce(function(a,b){return a+(Number(alloc[g.item.id+'|'+b.id])||0);},0);}
    function draw(){
      var tb=document.getElementById('pp-tb'),h='';
      groups.forEach(function(g,gi){
        var q=Number(g.item.quantity)||0;
        h+='<tr class="pp-grp"><td colspan="5">'+esc(g.item._sku)+(g.item.lot?' · LOT '+esc(g.item.lot):'')+(g.item.location_code?' · lokace '+esc(g.item.location_code):'')+'</td><td class="num">objednáno '+nf(q)+'</td><td class="num" id="pp-g'+gi+'"></td></tr>';
        if(!g.cands.length)h+='<tr><td colspan="7" class="pp-err">Žádná dostupná zásoba tohoto SKU v DC dokladu.</td></tr>';
        if(blockedQty[up(g.item._sku)])h+='<tr><td colspan="7" class="pp-warn" style="font-size:12px">'+nf(blockedQty[up(g.item._sku)])+' ks tohoto SKU je ve stavu, který nejde vydat (poškozené, PIR, hold).</td></tr>';
        g.cands.forEach(function(b){var k=g.item.id+'|'+b.id;h+='<tr><td><b>'+esc(b.location_code||'–')+'</b>'+(g.primary&&up(b.location_code)===g.primary?' <span style="font-size:10.5px;color:#2980b9">pick</span>':'')+' <button class="pp-x" title="V lokaci zboží chybí – přepnout lokaci do PIR" data-short="'+b.id+'" style="color:#e67e22;font-size:13px">⚠</button></td><td style="font-size:11px">'+esc(b.lpn||'')+'</td><td>'+esc(b.lot||'')+'</td><td>'+esc(b.condition_code||'')+'</td><td>'+esc(b.received_at?new Date(b.received_at).toLocaleDateString('cs-CZ'):'')+'</td><td class="num">'+nf(b.units_available)+'</td><td><input class="num" type="number" min="0" step="1" max="'+b.units_available+'" data-k="'+k+'" value="'+(alloc[k]||'')+'"></td></tr>';});
      });
      tb.innerHTML=h;
      tb.querySelectorAll('input').forEach(function(inp){inp.oninput=function(){var v=parseFloat(inp.value);if(v>0)alloc[inp.dataset.k]=v;else delete alloc[inp.dataset.k];summary();};});
      tb.querySelectorAll('[data-short]').forEach(function(btn){btn.onclick=async function(){
        var note=prompt('V lokaci zboží chybí. Celá lokace přejde do stavu PIR (nepůjde alokovat, dokud se zboží nenajde). Poznámka:','');
        if(note===null)return;
        var r=await supa.rpc('wms_report_short',{p_balance_id:+btn.dataset.short,p_note:note||null,p_user:o.userId||null});
        if(r.error){document.getElementById('pp-msg').innerHTML='<span class="pp-err">'+esc(errMsg(r.error))+'</span>';return;}
        M.close();delivery(o);
      };});
      summary();
    }
    function summary(){
      var short=0,over=0,tot=0;
      groups.forEach(function(g,gi){var q=Number(g.item.quantity)||0,a=given(g);tot+=a;var el=document.getElementById('pp-g'+gi);
        if(el)el.innerHTML='<span class="'+(a===q?'pp-ok':a<q?'pp-warn':'pp-err')+'">vydat '+nf(a)+'</span>';if(a<q)short++;if(a>q)over++;});
      M.sum.innerHTML='Celkem k výdeji: <b>'+nf(tot)+'</b> ks'+(short?' <span class="pp-warn">· nedostatek u '+short+' položek</span>':'')+(over?' <span class="pp-err">· víc než objednáno u '+over+' položek</span>':'')+(!short&&!over?' <span class="pp-ok">· sedí s objednávkou</span>':'');
      return {short:short,over:over,tot:tot};
    }
    M.go.onclick=async function(){
      var msg=document.getElementById('pp-msg');
      var lines=[],per={},err='';
      Object.keys(alloc).forEach(function(k){var bid=+k.split('|')[1];per[bid]=(per[bid]||0)+alloc[k];});
      groups.forEach(function(g){g.cands.forEach(function(b){if(per[b.id]>Number(b.units_available))err='V lokaci '+(b.location_code||'?')+' je dostupných jen '+b.units_available+' ks.';});});
      if(err){msg.innerHTML='<span class="pp-err">'+esc(err)+'</span>';return;}
      Object.keys(per).forEach(function(bid){if(per[bid]>0)lines.push({balance_id:+bid,qty:per[bid]});});
      if(!lines.length){msg.innerHTML='<span class="pp-err">Není vybrané žádné množství k výdeji.</span>';return;}
      var s=summary();
      if((s.short||s.over)&&!confirm('Vydávané množství neodpovídá objednávce'+(s.short?' (nedostatek u '+s.short+' položek)':'')+(s.over?' (víc u '+s.over+' položek)':'')+'. Přesto potvrdit?'))return;
      M.go.disabled=true;M.go.textContent='Zapisuji…';
      var r=await supa.rpc('wms_post_delivery',{p_delivery_id:o.docId,p_lines:lines,p_user:o.userId||null});
      if(r.error){msg.innerHTML='<span class="pp-err">'+esc(errMsg(r.error))+'</span>';M.go.disabled=false;M.go.textContent='Vyskladnit a potvrdit';return;}
      M.close();if(typeof o.onDone==='function')o.onDone(r.data);
    };
  }

  window.PRG_POST={receipt:receipt,delivery:delivery,_errMsg:errMsg};
})();
