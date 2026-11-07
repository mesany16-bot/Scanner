/* PRG WMS – editor příjmového / výdejového dokladu (wms_receipt.html, wms_delivery.html).
   Upravovat jde jen doklad ve stavu Nový. Další stavy mění scanner (příjem, zaskladnění, vychystání) – web jen alokuje a uvolňuje výdej,
   admin může ručně zasáhnout (override s důvodem). Pozor na neuložené změny při odchodu ze stránky. */
(function(){
  var F=function(){return window.PRG_FLOW;};
  var esc=function(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  var up=function(s){return String(s==null?'':s).trim().toUpperCase();};
  var nf=function(n){return (Number(n)||0).toLocaleString('cs-CZ');};
  var PEOPLE=[],E={},O=null,doc=null,items=[],skus=[],skuBy={},clients=[],whs=[],attrs=[],attrVals={},dirty=false,rowSeq=0,leaving=false;

  function css(){
    if(document.getElementById('docedit-css'))return;
    var s=document.createElement('style');s.id='docedit-css';
    s.textContent=''
      +'.de-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;align-items:start}'
      +'.de-items td{vertical-align:top}.de-items td input{padding:7px 8px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;width:100%;outline:none;font-family:inherit;background:#fff}'
      +'.de-items td input:focus{border-color:var(--accent)}.de-items td input:disabled{background:#f8f9fb;color:var(--text)}'
      +'.de-items .bad{border-color:var(--danger)!important;background:#fff5f4!important}.de-items .warn{border-color:var(--warning)!important}'
      +'.de-hint{font-size:11px;margin-top:3px;line-height:1.3}.de-hint.err{color:var(--danger)}.de-hint.mut{color:var(--muted)}'
      +'.de-ac{position:absolute;z-index:500;background:#fff;border:1.5px solid var(--accent);border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.15);max-height:280px;overflow:auto;min-width:260px}'
      +'.de-ac div{padding:8px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid #f0f2f5}.de-ac div.on,.de-ac div:hover{background:var(--accent-light)}'
      +'.de-ac b{font-family:JetBrains Mono,monospace}.de-ac small{color:var(--muted)}'
      +'.de-st{padding:16px}.de-st .big{font-size:15px;margin-bottom:6px}.de-st .acts{display:flex;flex-direction:column;gap:8px;margin-top:12px}.de-st .acts .btn{justify-content:center}'
      +'.de-prob{background:#fdecea;color:#c0392b;border-radius:8px;padding:8px 10px;font-size:13px;margin-top:10px;word-break:break-word}'
      +'.de-del{background:none;border:none;color:var(--danger);cursor:pointer;font-size:20px;line-height:1;padding:4px 6px}'
      +'@media(max-width:900px){.de-grid{grid-template-columns:minmax(0,1fr)}}'
      +'@media(max-width:640px){'
      +'.de-items thead{display:none}.de-items,.de-items tbody{display:block;width:100%}'
      +'.de-items tr{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px;padding:12px 14px;border-bottom:1px solid var(--border);position:relative}'
      +'.de-items td{display:block;padding:0!important;border:none!important;min-width:0}'
      +'.de-items td::before{content:attr(data-label);display:block;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);margin-bottom:3px}'
      +'.de-items td.c-sku{grid-column:1/-1;padding-right:34px!important}.de-items td.c-desc{grid-column:1/-1}.de-items td.c-note{grid-column:1/-1}'
      +'.de-items td.c-del{position:absolute;top:8px;right:8px}.de-items td.c-del::before{display:none}'
      +'.de-items td.c-desc:empty{display:none}'
      +'.de-scan tr{grid-template-columns:1fr 1fr}'
      +'}';
    document.head.appendChild(s);
  }
  function toast(m){if(window.toast)window.toast(m);else alert(m);}
  function isEditable(){return !doc||F().norm(O.kind,doc.status)==='new';}
  function isAdmin(){var p=O.profile();return !!(p&&p.role==='admin');}
  function uid(){var u=O.user();return u&&u.id;}
  function T(){return O.kind==='receipt'?'receipts':'deliveries';}
  function TI(){return O.kind==='receipt'?'receipt_items':'delivery_items';}
  function FK(){return O.kind==='receipt'?'receipt_id':'delivery_id';}
  function NUM(){return O.kind==='receipt'?'receipt_number':'delivery_number';}
  function page(){return O.kind==='receipt'?'wms_receipt.html':'wms_delivery.html';}
  function listPage(){return O.kind==='receipt'?'wms_receipts.html':'wms_deliveries.html';}

  async function selAll(build){var out=[],from=0;while(true){var r=await build().range(from,from+999);if(r.error)throw r.error;var d=r.data||[];out=out.concat(d);if(d.length<1000)break;from+=1000;}return out;}

  async function init(o){
    O=o;css();
    var root=document.getElementById('doc-root');
    var p=new URLSearchParams(location.search);var id=parseInt(p.get('id'))||null;
    var cr=await O.supa.from('clients').select('*').order('name');clients=cr.data||[];
    try{PEOPLE=(await O.supa.from('profiles').select('id,name,role').order('name')).data||[];}catch(e){PEOPLE=[];}
    if(window.PRG_DC&&PRG_DC.list().length)whs=PRG_DC.list();else{var wr=await O.supa.from('warehouses').select('id,name,code').order('name');whs=wr.data||[];}
    if(id){
      var dr=await O.supa.from(T()).select('*').eq('id',id).single();
      if(dr.error||!dr.data){root.innerHTML='<div class="card" style="padding:30px;text-align:center">Doklad nenalezen.</div>';return;}
      doc=dr.data;
      var ir=await O.supa.from(TI()).select('*').eq(FK(),id).order('id');items=ir.data||[];
      var av=await O.supa.from('document_attribute_values').select('*').eq('doc_type',O.kind).eq('doc_id',id);
      (av.data||[]).forEach(function(v){attrVals[v.attribute_id]=v.value;});
      if(whs.every(function(w){return String(w.id)!==String(doc.warehouse_id);})){var w2=await O.supa.from('warehouses').select('id,name,code').eq('id',doc.warehouse_id);if(w2.data)whs=whs.concat(w2.data);}
    }
    render(root);
    if(doc&&doc.client_id)await loadClient(doc.client_id,true);
    if(!items.length)addRow();else items.forEach(function(it){addRow(it);});
    applyMode();
    await refreshLive();
    dirty=false;
    guard();
  }

  function render(root){
    var K=O.kind,c=function(){return clients.map(function(x){return '<option value="'+x.id+'">'+esc(x.name)+'</option>';}).join('');};
    var w=whs.map(function(x){return '<option value="'+x.id+'">'+esc(x.code?x.code+(x.name?' – '+x.name:''):x.name)+'</option>';}).join('');
    var dt=function(v){if(!v)return '';var d=new Date(v);if(isNaN(d))return '';d=new Date(d.getTime()-d.getTimezoneOffset()*60000);return d.toISOString().slice(0,16);};
    var head='<div class="card" style="margin-bottom:16px"><div class="card-header"><h3>Hlavička dokladu</h3></div><div style="padding:18px">'
      +'<div class="form-row triple">'
      +'<div class="form-group"><label>Číslo dokladu</label><input id="f-num" type="text" readonly placeholder="Automaticky" style="background:#f8f9fb;font-family:JetBrains Mono,monospace;font-weight:700"></div>'
      +'<div class="form-group"><label>Klient <span class="required-mark">*</span></label><select id="f-client"><option value="">– vyberte klienta –</option>'+c()+'</select></div>'
      +'<div class="form-group"><label>DC <span class="required-mark">*</span></label><select id="f-wh"><option value="">– vyberte –</option>'+w+'</select></div>'
      +'</div><div class="form-row triple">'
      +(K==='receipt'
        ?'<div class="form-group"><label>Dodavatel</label><input id="f-supplier" type="text" placeholder="Název dodavatele"></div>'
         +'<div class="form-group"><label>Očekávaný příjezd</label><input id="f-when" type="datetime-local"></div>'
         +'<div class="form-group"><label>Priorita</label><select id="f-prio"><option value="">Normální</option><option value="high">Vysoká</option><option value="low">Nízká</option></select></div>'
        :'<div class="form-group"><label>Plánovaný odjezd</label><input id="f-when" type="datetime-local"></div>'
         +'<div class="form-group"><label>Priorita</label><select id="f-prio"><option value="">Normální</option><option value="high">Vysoká</option><option value="low">Nízká</option></select></div>'
         +'<div class="form-group"><label>Příznak</label><select id="f-special"><option value="">Bez příznaku</option><option value="preorder">Předobjednávka</option><option value="hold">Hold</option></select></div>')
      +'</div><div class="form-row single"><div class="form-group"><label>Poznámka</label><input id="f-note" type="text"></div></div>'
      +'<div id="f-flowinfo" style="font-size:12px;color:var(--muted)"></div>'
      +'</div></div>'
      +'<div id="attrs-card" class="card" style="display:none;margin-bottom:16px"><div class="card-header"><h3>📋 Atributy klienta</h3></div><div style="padding:18px" id="attrs-body"></div></div>';
    var cols=K==='receipt'
      ?['SKU','Popis','EAN','Množství','LOT','Cena/ks','Poznámka']
      :['SKU','Popis','EAN','Množství','LOT','Pref. lokace','Poznámka'];
    var tbl='<div class="card"><div class="card-header"><h3>Položky</h3><button class="btn btn-secondary btn-sm" id="add-row-btn" type="button">+ Přidat položku</button></div>'
      +'<div style="overflow-x:auto"><table class="de-items no-stack"><thead><tr>'+cols.map(function(h,i){return '<th'+(i===0?' style="min-width:190px"':'')+'>'+h+'</th>';}).join('')+'<th></th></tr></thead><tbody id="items-tbody"></tbody></table></div>'
      +'<div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">'
      +'<span style="font-size:13px;color:var(--muted)">Položek: <b id="row-count">0</b> · celkem <b id="row-qty">0</b> ks</span>'
      +'<div id="save-btns" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" type="button" id="btn-save">💾 Uložit</button></div></div></div>'
      +'<div class="card" id="work-card" style="display:none"><div class="card-header"><h3 id="work-title"></h3><span id="work-sum" style="font-size:13px;color:var(--muted)"></span></div><div style="overflow-x:auto" id="work-body"></div></div>';
    var side='<div><div class="card" style="margin-bottom:16px"><div class="card-header"><h3>Stav dokladu</h3></div><div class="de-st" id="st-body"><span class="badge badge-gray">Nový (neuložený)</span><div class="acts" id="st-acts"></div></div></div>'
      +(O.kind==='delivery'?'<div class="card" id="cr-card" style="display:none;margin-bottom:16px"><div class="card-header"><h3>🚚 Doprava a štítky</h3></div><div id="cr-body" style="padding:10px 16px"></div></div>':'')
      +'<div class="card" id="ph-card" style="display:none"><div class="card-header"><h3>📷 Fotky a výjimky</h3></div><div id="ph-body" style="padding:10px 16px"></div></div>'
      +'<div class="card"><div class="card-header"><h3>🕘 Historie</h3></div><div style="padding:6px 16px 10px;max-height:420px;overflow:auto" id="tl-body"><div style="color:var(--muted);font-size:13px;padding:8px 0">Po uložení se tu objeví průběh dokladu.</div></div></div></div>';
    root.innerHTML='<div class="de-grid"><div>'+head+tbl+'</div>'+side+'</div>';
    if(doc){
      g('f-num').value=doc[NUM()]||'';g('f-client').value=doc.client_id||'';g('f-wh').value=doc.warehouse_id||'';g('f-note').value=doc.note||'';
      g('f-prio').value=(doc.priority==='high'||doc.priority==='low')?doc.priority:'';
      if(K==='receipt'){g('f-supplier').value=doc.supplier||'';g('f-when').value=dt(doc.expected_at);}
      else{g('f-when').value=dt(doc.planned_at);g('f-special').value=doc.special_status||'';}
      var t=document.getElementById('page-title');if(t)t.textContent=(K==='receipt'?'📥 Příjem ':'📤 Výdej ')+(doc[NUM()]||'');
    }else{
      if(window.PRG_DC&&PRG_DC.currentId&&PRG_DC.currentId()!=null)g('f-wh').value=PRG_DC.currentId();
      if(whs.length===1)g('f-wh').value=whs[0].id;
    }
    g('add-row-btn').onclick=function(){var tr=addRow();var i=tr.querySelector('.in-sku');if(i)i.focus();markDirty();};
    g('btn-save').onclick=function(){save();};
    g('f-client').onchange=function(){loadClient(parseInt(this.value)||null,false);};
    root.addEventListener('input',function(e){if(e.target.closest('#items-tbody,.form-group,#attrs-body'))markDirty();});
    root.addEventListener('change',function(e){if(e.target.closest('#items-tbody,.form-group,#attrs-body'))markDirty();});
  }
  function g(id){return document.getElementById(id);}
  function markDirty(){if(isEditable())dirty=true;}

  async function loadClient(cid,initial){
    skus=[];skuBy={};attrs=[];
    var info=g('f-flowinfo');
    if(!cid){renderAttrs();revalidate();if(info)info.textContent='';return;}
    try{skus=await selAll(function(){return O.supa.from('stock_items').select('*').or('client_id.eq.'+cid+',client_id.is.null').order('sku');});
    }catch(e){skus=[];toast('❌ SKU klienta se nenačetla: '+(e.message||e));}
    skus=skus.filter(function(s){return s.is_active!==false&&s.sku;});
    skus.forEach(function(s){var k=up(s.sku);if(!skuBy[k]||skuBy[k].client_id==null)skuBy[k]=s;});
    var ar=await O.supa.from('client_attributes').select('*').eq('client_id',cid).order('sort_order');
    attrs=(ar.data||[]).filter(function(a){return a.doc_type===O.kind||a.doc_type==='both';});
    renderAttrs();
    var cl=clients.find(function(c){return c.id===cid;})||{};
    if(info){
      info.textContent=O.kind==='receipt'
        ?(cl.receipt_flow==='one_step'?'Příjem tohoto klienta: rovnou na lokaci (1 krok).':'Příjem tohoto klienta: přijmout na UNASSIGNED → zaskladnit (2 kroky).')+(cl.lot_required?' LOT je povinný.':'')
        :(cl.auto_release?'Výdeje tohoto klienta se po uložení samy alokují a uvolní do skladu.':'Po uložení výdej alokuj a uvolni do skladu.')+(cl.round_full_pallets?' Vydává se po celých paletách.':'')+({pick_load_ship:' Postup: vychystat → naložit skenem → odjezd.',pick_pack_load_ship:' Postup: vychystat → zabalit → naložit skenem → odjezd.'}[cl.delivery_flow]||'');
    }
    if(!initial)revalidate();
  }
  function renderAttrs(){
    var card=g('attrs-card');if(!attrs.length){card.style.display='none';g('attrs-body').innerHTML='';return;}
    card.style.display='block';
    g('attrs-body').innerHTML='<div class="form-row" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">'+attrs.map(function(a){
      return '<div class="form-group"><label>'+esc(a.name)+(a.is_required?' <span class="required-mark">*</span>':'')+'</label><input type="text" id="attr-'+a.id+'" value="'+esc(attrVals[a.id]||'')+'"'+(isEditable()?'':' disabled')+'></div>';
    }).join('')+'</div>';
  }

  // ---------- řádky ----------
  function cell(cls,label,html){return '<td class="'+cls+'" data-label="'+label+'">'+html+'</td>';}
  function addRow(it){
    it=it||{};var K=O.kind,id=++rowSeq;
    var tr=document.createElement('tr');tr.dataset.row=id;
    var ex={};['pallets','pallet_type','full_pallet'].forEach(function(f){if(it[f]!==undefined&&it[f]!==null)ex[f]=it[f];});tr.dataset.extra=JSON.stringify(ex);
    var sku=it.sku||'';
    if(!sku&&it.stock_item_id){var s0=skus.find(function(s){return s.id===it.stock_item_id;});if(s0)sku=s0.sku;}
    tr.innerHTML=cell('c-sku','SKU','<input class="in-sku" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Začni psát SKU / EAN…" value="'+esc(sku)+'"><div class="de-hint"></div>')
      +cell('c-desc','Popis','')
      +cell('c-ean','EAN','<input class="in-ean" type="text" value="'+esc(it.ean||'')+'" readonly tabindex="-1" style="background:#f8f9fb">')
      +cell('c-qty','Množství','<input class="in-qty" type="number" min="1" inputmode="numeric" value="'+esc(it.quantity!=null?it.quantity:1)+'">')
      +cell('c-lot','LOT','<input class="in-lot" type="text" value="'+esc(it.lot||'')+'">')
      +(K==='receipt'?cell('c-price','Cena/ks','<input class="in-price" type="number" step="0.01" inputmode="decimal" value="'+esc(it.price!=null?it.price:'')+'">')
                     :cell('c-loc','Pref. lokace','<input class="in-loc" type="text" autocapitalize="characters" value="'+esc(it.location_code||'')+'">'))
      +cell('c-note','Poznámka','<input class="in-note" type="text" value="'+esc(it.note||'')+'">')
      +cell('c-del','','<button class="de-del" type="button" title="Odebrat řádek">×</button>');
    g('items-tbody').appendChild(tr);
    tr.dataset.sid=it.stock_item_id||'';
    var inp=tr.querySelector('.in-sku');
    inp.addEventListener('input',function(){tr.dataset.sid='';showAc(inp);});
    inp.addEventListener('focus',function(){if(inp.value)showAc(inp);else hint(tr);});
    inp.addEventListener('keydown',acKey);
    inp.addEventListener('blur',function(){setTimeout(function(){if(AC.inp===inp)hideAc();resolve(tr,false);},180);});
    tr.querySelector('.in-qty').addEventListener('input',count);
    tr.querySelector('.de-del').onclick=function(){if(g('items-tbody').children.length<=1){clearRow(tr);}else tr.remove();count();markDirty();};
    if(sku)resolve(tr,true);else hint(tr);
    count();
    return tr;
  }
  function clearRow(tr){tr.querySelectorAll('input').forEach(function(i){i.value=i.classList.contains('in-qty')?'1':'';});tr.dataset.sid='';tr.querySelector('.c-desc').textContent='';hint(tr);}
  function count(){
    var rows=g('items-tbody').children,q=0;for(var i=0;i<rows.length;i++)q+=Number(rows[i].querySelector('.in-qty').value)||0;
    g('row-count').textContent=rows.length;g('row-qty').textContent=nf(q);
  }
  function hint(tr,msg,cls){var h=tr.querySelector('.de-hint');var cid=parseInt(g('f-client').value);
    if(msg==null&&!cid&&isEditable()){msg='Nejdřív vyber klienta';cls='mut';}
    h.className='de-hint'+(cls?' '+cls:'');h.textContent=msg||'';}
  function findSku(v){
    var k=up(v);if(!k)return null;
    if(skuBy[k])return skuBy[k];
    return skus.find(function(s){return up(s.ean)===k||up(s.gtin_carton)===k||up(s.gtin_pallet)===k;})||null;
  }
  function resolve(tr,initial){
    var inp=tr.querySelector('.in-sku'),v=inp.value.trim(),cid=parseInt(g('f-client').value);
    inp.classList.remove('bad','warn');
    if(!v){tr.dataset.sid='';tr.querySelector('.c-desc').textContent='';hint(tr);return true;}
    if(!cid){hint(tr,'Nejdřív vyber klienta','err');inp.classList.add('bad');return false;}
    var s=findSku(v);
    if(!s){
      if(initial&&!isEditable()){hint(tr);return true;}
      hint(tr,'SKU „'+v+'“ klient nemá v SKU Setup','err');inp.classList.add('bad');tr.dataset.sid='';tr.querySelector('.c-desc').textContent='';return false;
    }
    inp.value=s.sku;tr.dataset.sid=s.id;
    tr.querySelector('.c-desc').textContent=s.description||'';
    var e=tr.querySelector('.in-ean');if(!e.value||!initial)e.value=s.ean||'';
    hint(tr);return true;
  }
  function revalidate(){var rows=g('items-tbody').children;for(var i=0;i<rows.length;i++){resolve(rows[i],false);}}

  // ---------- našeptávač ----------
  var AC={el:null,inp:null,list:[],on:-1};
  function showAc(inp){
    var tr=inp.closest('tr'),q=up(inp.value),cid=parseInt(g('f-client').value);
    if(!q){hideAc();hint(tr);return;}
    if(!cid){hideAc();hint(tr,'Nejdřív vyber klienta','err');return;}
    hint(tr);
    var a=[],b=[];
    for(var i=0;i<skus.length&&a.length+b.length<200;i++){var s=skus[i],S=up(s.sku);
      if(S.indexOf(q)===0||up(s.ean).indexOf(q)===0)a.push(s);
      else if(S.indexOf(q)>-1||up(s.description).indexOf(q)>-1||up(s.ean).indexOf(q)>-1)b.push(s);}
    var list=a.concat(b).slice(0,30);
    if(!AC.el){AC.el=document.createElement('div');AC.el.className='de-ac';document.body.appendChild(AC.el);
      AC.el.addEventListener('mousedown',function(e){e.preventDefault();});}
    AC.inp=inp;AC.list=list;AC.on=list.length?0:-1;
    if(!list.length){AC.el.innerHTML='<div style="cursor:default;color:var(--muted)">Nic nenalezeno u tohoto klienta</div>';}
    else AC.el.innerHTML=list.map(function(s,i){return '<div data-i="'+i+'" class="'+(i===0?'on':'')+'"><b>'+esc(s.sku)+'</b>'+(s.description?' · '+esc(s.description):'')+(s.ean?'<br><small>EAN '+esc(s.ean)+'</small>':'')+'</div>';}).join('');
    AC.el.querySelectorAll('[data-i]').forEach(function(d){d.onclick=function(){pick(parseInt(d.getAttribute('data-i')));};});
    var r=inp.getBoundingClientRect();
    AC.el.style.left=(r.left+window.scrollX)+'px';AC.el.style.top=(r.bottom+window.scrollY+2)+'px';
    AC.el.style.width=Math.max(r.width,Math.min(360,window.innerWidth-r.left-12))+'px';AC.el.style.display='block';
  }
  function hideAc(){if(AC.el)AC.el.style.display='none';AC.inp=null;}
  function pick(i){var s=AC.list[i],inp=AC.inp;if(!s||!inp)return;inp.value=s.sku;var tr=inp.closest('tr');hideAc();resolve(tr,false);markDirty();
    var q=tr.querySelector('.in-qty');if(q){q.focus();q.select();}}
  function acKey(e){
    if(!AC.el||AC.el.style.display==='none'||AC.inp!==e.target){if(e.key==='Enter'){e.preventDefault();resolve(e.target.closest('tr'),false);}return;}
    var n=AC.list.length;
    if(e.key==='ArrowDown'){e.preventDefault();AC.on=(AC.on+1)%n;}
    else if(e.key==='ArrowUp'){e.preventDefault();AC.on=(AC.on-1+n)%n;}
    else if(e.key==='Enter'||e.key==='Tab'){if(AC.on>-1&&n){e.preventDefault();pick(AC.on);}return;}
    else if(e.key==='Escape'){hideAc();return;}else return;
    AC.el.querySelectorAll('[data-i]').forEach(function(d,i){d.classList.toggle('on',i===AC.on);if(i===AC.on)d.scrollIntoView({block:'nearest'});});
  }
  window.addEventListener('scroll',function(){if(AC.inp)showAc(AC.inp);},{passive:true});

  // ---------- režim (upravit / jen číst) ----------
  function applyMode(){
    var ed=isEditable();
    document.querySelectorAll('#doc-root .form-group input:not(#f-num),#doc-root .form-group select,#doc-root .form-group textarea,#items-tbody input:not(.in-ean)').forEach(function(el){el.disabled=!ed;});
    g('add-row-btn').style.display=ed?'':'none';
    document.querySelectorAll('.de-del').forEach(function(b){b.style.display=ed?'':'none';});
    g('save-btns').style.display=ed?'flex':'none';
    if(!ed){var rows=g('items-tbody').children;for(var i=rows.length-1;i>=0;i--){if(!rows[i].querySelector('.in-sku').value)rows[i].remove();}
      document.querySelectorAll('.de-hint').forEach(function(h){h.textContent='';});}
    count();
  }

  // ---------- uložení ----------
  function collect(){
    var out=[],bad=0,rows=g('items-tbody').children;
    for(var i=0;i<rows.length;i++){
      var tr=rows[i],v=tr.querySelector('.in-sku').value.trim(),qty=Number(tr.querySelector('.in-qty').value)||0;
      var other=tr.querySelector('.in-lot').value.trim()||tr.querySelector('.in-note').value.trim();
      if(!v&&!other)continue;
      if(!resolve(tr,false)){bad++;continue;}
      if(!v){hint(tr,'Vyplň SKU','err');tr.querySelector('.in-sku').classList.add('bad');bad++;continue;}
      if(qty<=0){tr.querySelector('.in-qty').classList.add('bad');bad++;continue;}
      tr.querySelector('.in-qty').classList.remove('bad');
      var ex={};try{ex=JSON.parse(tr.dataset.extra||'{}');}catch(e){}
      var row=Object.assign({},ex,{stock_item_id:parseInt(tr.dataset.sid)||null,sku:tr.querySelector('.in-sku').value.trim(),
        ean:tr.querySelector('.in-ean').value.trim()||null,quantity:qty,lot:tr.querySelector('.in-lot').value.trim()||null,note:tr.querySelector('.in-note').value.trim()||null});
      if(O.kind==='receipt'){var pr=tr.querySelector('.in-price').value;row.price=pr===''?null:Number(pr);}
      else row.location_code=up(tr.querySelector('.in-loc').value)||null;
      out.push(row);
    }
    return {rows:out,bad:bad};
  }
  async function save(opts){
    opts=opts||{};
    if(!isEditable()){toast('Doklad už není ve stavu Nový – upravovat nejde.');return false;}
    var cid=parseInt(g('f-client').value)||null,wh=g('f-wh').value||null;
    if(!cid){toast('Vyber klienta');g('f-client').focus();return false;}
    if(!wh){toast('Vyber DC');g('f-wh').focus();return false;}
    var okA=true;attrs.forEach(function(a){var el=g('attr-'+a.id);if(a.is_required&&el&&!el.value.trim()){el.style.borderColor='var(--danger)';okA=false;}else if(el)el.style.borderColor='';});
    if(!okA){toast('Vyplň povinné atributy klienta');return false;}
    var c=collect();
    if(c.bad){toast('Oprav červeně označené řádky');return false;}
    if(!c.rows.length){toast('Přidej aspoň jednu položku');return false;}
    var when=g('f-when').value?new Date(g('f-when').value).toISOString():null;
    var payload={client_id:cid,warehouse_id:isNaN(Number(wh))?wh:Number(wh),note:g('f-note').value.trim()||null,priority:g('f-prio').value||null};
    if(O.kind==='receipt'){payload.supplier=g('f-supplier').value.trim()||null;payload.expected_at=when;}
    else{payload.planned_at=when;payload.special_status=g('f-special').value||null;}
    var btn=g('btn-save');btn.disabled=true;
    try{
      var res;
      if(doc){res=await O.supa.from(T()).update(payload).eq('id',doc.id).eq('status','new').select().single();
        if((res.error&&/rows|PGRST116/i.test(res.error.message||res.error.code||''))||(!res.error&&!res.data))throw {message:'Doklad mezitím změnil stav – obnov stránku.'};}
      else{payload[NUM()]=(O.kind==='receipt'?'PRI-':'VYD-')+Date.now();payload.status='new';payload.created_by=uid();
        res=await O.supa.from(T()).insert(payload).select().single();}
      if(res.error)throw res.error;
      doc=res.data;
      var d1=await O.supa.from(TI()).delete().eq(FK(),doc.id);if(d1.error)throw d1.error;
      var i1=await O.supa.from(TI()).insert(c.rows.map(function(r){var o={};o[FK()]=doc.id;return Object.assign(o,r);}));if(i1.error)throw i1.error;
      await O.supa.from('document_attribute_values').delete().eq('doc_type',O.kind).eq('doc_id',doc.id);
      var av=[];attrs.forEach(function(a){var el=g('attr-'+a.id);if(el&&el.value.trim())av.push({doc_type:O.kind,doc_id:doc.id,attribute_id:a.id,value:el.value.trim()});});
      if(av.length)await O.supa.from('document_attribute_values').insert(av);
      dirty=false;
      g('f-num').value=doc[NUM()];
      history.replaceState(null,'',page()+'?id='+doc.id);
      var t=document.getElementById('page-title');if(t)t.textContent=(O.kind==='receipt'?'📥 Příjem ':'📤 Výdej ')+doc[NUM()];
      toast('Uloženo');
      var cl=clients.find(function(x){return x.id===cid;})||{};
      if(O.kind==='delivery'&&cl.auto_release&&!opts.noAuto){await act('allocate',true);if(F().norm('delivery',doc.status)==='allocated')await act('release',true);}
      await refreshLive();
      return true;
    }catch(e){toast('❌ '+F().errMsg(e));return false;}
    finally{btn.disabled=false;}
  }

  // ---------- akce ----------
  async function act(what,quiet){
    var u=uid(),r;
    if(what==='allocate'){if(dirty&&!(await save({noAuto:true})))return;
      r=await O.supa.rpc('wms_delivery_allocate',{p_id:doc.id,p_user:u});
      if(!r.error){var m=r.data&&r.data.missing;toast(m?'⚠ Alokováno částečně – chybí: '+m:'✅ Zásoba alokována');}}
    else if(what==='release'){r=await O.supa.rpc('wms_delivery_release',{p_id:doc.id,p_user:u});if(!r.error&&!quiet)toast('✅ Uvolněno do skladu – je ve frontě scanneru');}
    else if(what==='deallocate'){if(!confirm('Zrušit alokaci? Rezervace zásoby se uvolní a doklad půjde znovu upravit.'))return;
      r=await O.supa.rpc('wms_delivery_deallocate',{p_id:doc.id,p_user:u});if(!r.error)toast('Alokace zrušena');}
    if(r&&r.error){toast('❌ '+F().errMsg(r.error));}
    await reloadDoc();
  }
  async function reloadDoc(){
    var dr=await O.supa.from(T()).select('*').eq('id',doc.id).single();if(dr.data)doc=dr.data;
    applyMode();renderAttrs();await refreshLive();
  }
  function emergency(){
    if(!window.PRG_POST){toast('Modul zaúčtování se nenačetl');return;}
    if(!confirm(O.kind==='receipt'?'Nouzově zaúčtovat příjem bez scanneru? Použij jen když scanner nejde – zboží se zaskladní hned a doklad bude Hotovo.':'Nouzově vyskladnit bez scanneru? Použij jen když scanner nejde – zásoba se odepíše hned a doklad bude Odesláno.'))return;
    var f=O.kind==='receipt'?PRG_POST.receipt:PRG_POST.delivery;
    f({supa:O.supa,docId:doc.id,userId:uid(),onDone:function(){toast('Zaúčtováno');reloadDoc();}});
  }

  // ---------- stav, průběh, historie ----------
  async function refreshLive(){
    var st=g('st-body');if(!st)return;
    if(!doc){st.innerHTML='<span class="badge badge-gray">Nový (neuložený)</span><div style="font-size:12px;color:var(--muted);margin-top:8px">Vyplň hlavičku a položky a ulož. Další stavy pak mění scanner.</div>';return;}
    if(!dirty){var dr=await O.supa.from(T()).select('*').eq('id',doc.id).single();if(dr.data){var was=doc.status;doc=dr.data;if(was!==doc.status)applyMode();}}
    var K=O.kind,s=F().norm(K,doc.status),m=F().meta(K,s);
    var pr=await F().fetchProgress(O.supa,K,[doc.id]);var p=pr[doc.id];
    var steps=F().ORDER[K];var idx=steps.indexOf(s);
    var bar='<div style="display:flex;gap:3px;margin:10px 0 4px">'+steps.map(function(x,i){return '<div title="'+esc(F().meta(K,x).t)+'" style="flex:1;height:6px;border-radius:3px;background:'+(s==='cancelled'?'#f3c6c1':(i<=idx?'var(--accent)':'#e2e6ed'))+'"></div>';}).join('')+'</div>';
    var h='<div class="big">'+F().badge(K,s)+' <span style="font-size:13px;color:var(--muted)">'+esc(F().progress(K,doc,p))+'</span></div>'+bar
      +'<div style="font-size:12px;color:var(--muted)">'+esc(m.h)+'</div>'
      +(doc.problem?'<div class="de-prob">⚠ '+esc(doc.problem)+'</div>':'')
      +(K==='delivery'&&(doc.door||doc.plate||doc.seal)?'<div style="font-size:12px;margin-top:8px">🚚 '+[doc.door?'vrata '+esc(doc.door):'',doc.plate?'SPZ '+esc(doc.plate):'',doc.seal?'plomba '+esc(doc.seal):''].filter(Boolean).join(' · ')+'</div>':'');
    var a=[];
    if(K==='delivery'){
      if(s==='new')a.push('<button class="btn btn-primary" data-a="allocate">📦 Alokovat zásobu</button>');
      if(s==='allocated')a.push('<button class="btn btn-primary" data-a="release">▶ Uvolnit do skladu</button>');
      if(s==='allocated'||s==='released')a.push('<button class="btn btn-secondary" data-a="deallocate">↩ Zrušit alokaci</button>');
    }
    if(s==='new'&&K==='receipt')a.push('<div style="font-size:12px;color:var(--muted)">Příjem zahájí skladník ve scanneru (PRG WMS → Příjem).</div>');
    if(isAdmin()&&s!=='done'&&s!=='shipped'&&s!=='cancelled')a.push('<label style="font-size:12px;color:var(--muted)">👤 Přiřazeno<select id="st-assign" style="display:block;width:100%;margin-top:3px;padding:7px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:13px"><option value="">– komukoli –</option>'+PEOPLE.filter(function(x){return x.role!=='client';}).map(function(x){return '<option value="'+x.id+'"'+(doc.assigned_to===x.id?' selected':'')+'>'+esc(x.name||'')+'</option>';}).join('')+'</select></label>');
    else if(doc.assigned_to){var pa=PEOPLE.find(function(x){return x.id===doc.assigned_to;});a.push('<div style="font-size:12px;color:var(--muted)">👤 Přiřazeno: '+esc(pa?pa.name:'')+'</div>');}
    a.push('<button class="btn btn-secondary" data-a="problem">⚠ '+(doc.problem?'Upravit / vyřešit problém':'Nahlásit problém')+'</button>');
    if(isAdmin()){
      a.push('<button class="btn btn-secondary" data-a="override">🛠 Ruční zásah (admin)</button>');
      if((K==='receipt'&&(s==='new'||s==='arrived')&&!(p&&Number(p.scans_cnt)))||(K==='delivery'&&(s==='new'||s==='allocated'||s==='released')))
        a.push('<button class="btn btn-secondary" data-a="emergency" style="color:#b35a00">'+(K==='receipt'?'🆘 Nouzově zaúčtovat bez scanneru':'🆘 Nouzově vyskladnit bez scanneru')+'</button>');
    }
    h+='<div class="acts">'+a.join('')+'</div>';
    st.innerHTML=h;
    var asg=g('st-assign');if(asg)asg.onchange=async function(){var r=await O.supa.rpc('wms_assign',{p_type:K,p_ids:[doc.id],p_to:this.value||null,p_user:uid()});toast(r.error?'❌ '+F().errMsg(r.error):'Přiřazeno');reloadDoc();};
    st.querySelectorAll('[data-a]').forEach(function(b){b.onclick=function(){var x=b.getAttribute('data-a');
      if(x==='override')F().overrideDialog({supa:O.supa,type:K,doc:doc,userId:uid(),onDone:function(){toast('Status změněn');reloadDoc();}});
      else if(x==='problem')F().problemDialog({supa:O.supa,type:K,doc:doc,userId:uid(),onDone:reloadDoc});
      else if(x==='emergency')emergency();
      else act(x);};});
    await work();
    F().timeline(O.supa,K,doc.id,g('tl-body'));
    photosBox();
    carrierBox();
  }
  async function photosBox(){
    var card=g('ph-card'),body=g('ph-body'),K=O.kind;if(!card)return;
    try{
      var ex=await O.supa.from('exceptions').select('*').eq('ref_kind',K).eq('ref_id',String(doc.id)).order('created_at',{ascending:false});
      if(ex.error){card.style.display='none';return;}
      var ids=(ex.data||[]).map(function(x){return x.id;});
      var ph=await O.supa.from('photos').select('*').eq('kind',K).eq('ref_id',String(doc.id)).order('taken_at');
      var P=ph.data||[],X=ex.data||[];
      if(ids.length){var ph2=await O.supa.from('photos').select('*').in('exception_id',ids).order('taken_at');P=P.concat(ph2.data||[]);}
      if(!P.length&&!X.length){card.style.display='none';return;}
      var urls={};if(P.length){var su=await O.supa.storage.from('prg-photos').createSignedUrls(P.map(function(p){return p.path;}),3600);(su.data||[]).forEach(function(u){urls[u.path]=u.signedUrl;});}
      var ST={open:'🔴 otevřená',in_progress:'🟠 řeší se',resolved:'🟢 vyřešená',closed:'⚪ uzavřená'};
      card.style.display='block';
      body.innerHTML=X.map(function(x){return '<div style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--border)"><a href="wms_exceptions.html" style="font-weight:700">⚠️ '+esc(x.title)+'</a> · '+(ST[x.status]||esc(x.status))+(x.description?'<br><span style="color:var(--muted)">'+esc(String(x.description).slice(0,140))+'</span>':'')+'</div>';}).join('')
        +(P.length?'<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">'+P.map(function(p){var u=urls[p.path]||'';return '<a href="'+u+'" target="_blank"><img src="'+u+'" title="'+esc((p.taken_by||'')+' '+new Date(p.taken_at).toLocaleString('cs-CZ'))+'" style="width:96px;height:96px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"></a>';}).join('')+'</div>':'');
    }catch(e){card.style.display='none';}
  }
  // ── doprava: adresa příjemce, zásilky UPS / FedEx, štítky ──
  var CR_SV={ups:[['11','UPS Standard'],['65','UPS Express Saver'],['07','UPS Express'],['54','UPS Express Plus'],['08','UPS Expedited']],fedex:[['FEDEX_REGIONAL_ECONOMY','FedEx Regional Economy'],['INTERNATIONAL_ECONOMY','FedEx International Economy'],['FEDEX_INTERNATIONAL_PRIORITY','FedEx International Priority']]};
  function crTrack(c,t){return c==='ups'?'https://www.ups.com/track?tracknum='+encodeURIComponent(t):'https://www.fedex.com/fedextrack/?trknbr='+encodeURIComponent(t);}
  async function crInvoke(body){var r=await O.supa.functions.invoke('prg-carrier',{body:body});if(r.error){var m=r.error.message||String(r.error);try{var j=await r.error.context.json();if(j&&j.error)m=j.error;}catch(e){}throw new Error(m);}if(r.data&&r.data.error)throw new Error(r.data.error);return r.data;}
  async function carrierBox(){
    var card=g('cr-card'),body=g('cr-body');if(!card||!doc)return;
    if(card.contains(document.activeElement)&&/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;   // uživatel právě píše
    try{
      var sh=await O.supa.from('carrier_shipments').select('*').eq('delivery_id',doc.id).order('id',{ascending:false});
      if(sh.error){card.style.display='none';return;}
      var ac=(await O.supa.from('carrier_accounts').select('id,carrier,name,default_service,client_id,dc_id').eq('is_active',true).order('name')).data||[];
      ac=ac.filter(function(a){return (a.client_id==null||a.client_id===doc.client_id)&&(a.dc_id==null||String(a.dc_id)===String(doc.warehouse_id));});
      var pr=(await O.supa.from('printers').select('id,name').eq('is_active',true).order('name')).data||[];
      var S=sh.data||[],live=S.filter(function(x){return x.status==='created';});
      var lastPr='';try{lastPr=localStorage.getItem('prg_web_printer')||'';}catch(e){}
      var want=/fedex/i.test(doc.carrier||'')?'fedex':(/ups/i.test(doc.carrier||'')?'ups':'');
      var acSel=(ac.find(function(a){return a.carrier===want;})||ac[0]||{}).id;
      var inp=function(id,ph,v,w){return '<input id="'+id+'" placeholder="'+ph+'" value="'+esc(v||'')+'" style="width:'+(w||'100%')+';padding:7px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;margin-bottom:6px;box-sizing:border-box">';};
      card.style.display='block';
      body.innerHTML='<div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:4px">Příjemce</div>'
        +inp('cr-name','Firma / jméno',doc.ship_to_name)+inp('cr-street','Ulice a číslo',doc.ship_to_street)
        +'<div style="display:flex;gap:6px">'+inp('cr-zip','PSČ',doc.ship_to_zip,'34%')+inp('cr-city','Město',doc.ship_to_city,'46%')+inp('cr-cc','Země',doc.ship_to_country||'CZ','20%')+'</div>'
        +'<div style="display:flex;gap:6px">'+inp('cr-contact','Kontakt',doc.ship_to_contact,'50%')+inp('cr-phone','Telefon',doc.ship_to_phone,'50%')+'</div>'+inp('cr-email','E-mail',doc.ship_to_email)
        +'<button class="btn btn-secondary btn-sm" type="button" id="cr-save">💾 Uložit adresu</button>'
        +'<div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;margin:12px 0 4px">Zásilka u dopravce</div>'
        +(ac.length?'<select id="cr-acc" style="width:100%;padding:7px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;margin-bottom:6px">'+ac.map(function(a){return '<option value="'+a.id+'" data-c="'+a.carrier+'"'+(a.id===acSel?' selected':'')+'>'+esc(a.name)+'</option>';}).join('')+'</select>'
          +'<select id="cr-svc" style="width:100%;padding:7px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;margin-bottom:6px"></select>'
          +'<select id="cr-pr" style="width:100%;padding:7px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;margin-bottom:6px"><option value="">– netisknout, jen založit –</option>'+pr.map(function(p){return '<option value="'+p.id+'"'+(String(p.id)===lastPr?' selected':'')+'>🖨️ '+esc(p.name)+'</option>';}).join('')+'</select>'
          +'<button class="btn btn-primary btn-sm" type="button" id="cr-ship" style="width:100%">🚚 Vytvořit zásilku a vytisknout štítky</button>'
          :'<div style="font-size:13px;color:var(--muted)">Žádný účet dopravce – nastav ho v <a href="wms_integrations.html">Integrace → Dopravci</a>.</div>')
        +'<div id="cr-msg" style="font-size:12.5px;margin-top:6px"></div>'
        +(S.length?'<div style="margin-top:10px">'+S.map(function(x){var st={created:'🟢',requested:'⏳',error:'🔴',voided:'⚪'}[x.status]||'';
            return '<div style="font-size:13px;padding:6px 0;border-top:1px solid var(--border)">'+st+' <b>'+(x.carrier==='ups'?'UPS':'FedEx')+'</b> '+(x.tracking_main?'<a href="'+crTrack(x.carrier,x.tracking_main)+'" target="_blank">'+esc(x.tracking_main)+'</a>':'')+(x.status==='voided'?' (stornováno)':'')
              +(x.pieces&&x.pieces.length>1?'<div style="font-size:12px;color:var(--muted)">'+x.pieces.length+' balíky: '+x.pieces.map(function(p){return esc(p.tracking);}).join(', ')+'</div>':'')
              +(x.track_status?'<div style="font-size:12px;color:var(--muted)">'+esc(x.track_status)+(x.delivered_at?' · doručeno':'')+'</div>':'')+(x.error?'<div style="font-size:12px;color:var(--danger)">'+esc(x.error)+'</div>':'')
              +(x.status==='created'?'<div style="margin-top:4px;display:flex;gap:6px"><button class="btn btn-secondary btn-sm" type="button" data-rp="'+x.id+'">🖨️ Znovu tisk</button><button class="btn btn-secondary btn-sm" type="button" data-vd="'+x.id+'">✕ Storno</button></div>':'')+'</div>';}).join('')+'</div>':'');
      var fillSvc=function(){var a=g('cr-acc');if(!a)return;var c=a.options[a.selectedIndex].getAttribute('data-c'),acc=ac.find(function(x){return String(x.id)===a.value;})||{},cur=doc.carrier_service||acc.default_service||'';
        g('cr-svc').innerHTML=(CR_SV[c]||[]).map(function(s){return '<option value="'+s[0]+'"'+(s[0]===cur?' selected':'')+'>'+s[1]+'</option>';}).join('');};
      if(g('cr-acc')){g('cr-acc').onchange=fillSvc;fillSvc();}
      var msg=function(t,bad){g('cr-msg').innerHTML='<span style="color:'+(bad?'var(--danger)':'var(--accent)')+'">'+esc(t)+'</span>';};
      g('cr-save').onclick=async function(){var u={ship_to_name:g('cr-name').value.trim()||null,ship_to_street:g('cr-street').value.trim()||null,ship_to_zip:g('cr-zip').value.replace(/\s+/g,'')||null,ship_to_city:g('cr-city').value.trim()||null,
          ship_to_country:(g('cr-cc').value.trim().toUpperCase()||null),ship_to_contact:g('cr-contact').value.trim()||null,ship_to_phone:g('cr-phone').value.trim()||null,ship_to_email:g('cr-email').value.trim()||null};
        if(u.ship_to_country&&!/^[A-Z]{2}$/.test(u.ship_to_country)){msg('Země = 2 písmena (CZ, DE, SK…)',true);return;}
        var r=await O.supa.from('deliveries').update(u).eq('id',doc.id);if(r.error){msg(r.error.message,true);return;}Object.assign(doc,u);msg('Adresa uložena');};
      if(g('cr-ship'))g('cr-ship').onclick=async function(){var b=this;if(live.length&&!confirm('Výdej už má zásilku '+live[0].tracking_main+'. Vytvořit další?'))return;
        try{localStorage.setItem('prg_web_printer',g('cr-pr').value);}catch(e){}
        b.disabled=true;b.textContent='⏳ Zakládám zásilku…';
        try{var d=await crInvoke({action:'ship',delivery_id:doc.id,account_id:Number(g('cr-acc').value),service:g('cr-svc').value,printer_id:g('cr-pr').value?Number(g('cr-pr').value):null});
          toast('Zásilka '+d.tracking+(d.printed?' · tisknu '+d.printed+' štítků':''));await carrierBox();}
        catch(e){msg(e.message||String(e),true);b.disabled=false;b.textContent='🚚 Vytvořit zásilku a vytisknout štítky';}};
      body.querySelectorAll('[data-rp]').forEach(function(b){b.onclick=async function(){var p=g('cr-pr')&&g('cr-pr').value;if(!p){msg('Vyber tiskárnu',true);return;}try{var d=await crInvoke({action:'reprint',shipment_id:Number(b.getAttribute('data-rp')),printer_id:Number(p)});msg('Tisknu '+d.printed+' štítků');}catch(e){msg(e.message,true);}};});
      body.querySelectorAll('[data-vd]').forEach(function(b){b.onclick=async function(){if(!confirm('Stornovat zásilku u dopravce?'))return;try{await crInvoke({action:'void',shipment_id:Number(b.getAttribute('data-vd'))});toast('Zásilka stornována');await carrierBox();}catch(e){msg(e.message,true);}};});
    }catch(e){card.style.display='none';}
  }
  async function work(){
    var card=g('work-card'),K=O.kind;
    if(K==='receipt'){
      var r=await O.supa.from('receipt_scans').select('*').eq('receipt_id',doc.id).order('id');
      var d=r.data||[];if(!d.length){card.style.display='none';return;}
      card.style.display='block';g('work-title').textContent='📥 Přijato scannerem';
      var q=d.reduce(function(a,x){return a+Number(x.qty);},0),pa=d.filter(function(x){return x.putaway_at;}).length;
      g('work-sum').textContent=nf(q)+' ks · '+d.length+' LPN · zaskladněno '+pa+'/'+d.length;
      g('work-body').innerHTML='<table><thead><tr><th>SKU</th><th>Ks</th><th>Balení</th><th>LOT</th><th>LPN</th><th>Lokace</th><th>Čas</th></tr></thead><tbody>'+d.map(function(x){
        var pk=x.uom&&x.uom!=='ks'?(nf(x.uom_count)+' × '+({inner:'inner',outer:'outer',pallet:'paleta'}[x.uom]||x.uom)+(x.uom_factor?' à '+nf(x.uom_factor):'')+(Number(x.loose_qty)>0?' + '+nf(x.loose_qty)+' ks':'')):'';
        return '<tr><td><b>'+esc(x.sku)+'</b></td><td>'+nf(x.qty)+'</td><td style="font-size:12px;color:var(--muted)">'+esc(pk)+'</td><td>'+esc(x.lot||'–')+'</td><td style="font-family:JetBrains Mono,monospace;font-size:12px">'+esc(x.lpn||'')+'</td>'
          +'<td>'+(x.putaway_at?'<span class="badge badge-green">'+esc(x.putaway_location)+'</span>':(x.balance_id?'<span class="badge badge-orange">UNASSIGNED</span>':'<span class="badge badge-gray">'+esc(x.location_code||'čeká na dokončení')+'</span>'))+'</td>'
          +'<td style="font-size:12px;color:var(--muted)">'+new Date(x.created_at).toLocaleString('cs-CZ',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})+'</td></tr>';}).join('')+'</tbody></table>';
    }else{
      var r2=await O.supa.from('delivery_allocations').select('*').eq('delivery_id',doc.id).order('id');
      var a=r2.data||[];if(!a.length){card.style.display='none';return;}
      card.style.display='block';g('work-title').textContent='📦 Alokace a vychystání';
      var tq=0,tp=0;a.forEach(function(x){tq+=Number(x.qty);tp+=Number(x.picked_qty);});
      g('work-sum').textContent='vychystáno '+nf(tp)+' / '+nf(tq)+' ks';
      var SB={open:'<span class="badge badge-gray">Čeká</span>',picked:'<span class="badge badge-green">Vychystáno</span>',short:'<span class="badge badge-red">Short</span>',shipped:'<span class="badge badge-green">Odesláno</span>'};
      g('work-body').innerHTML='<table><thead><tr><th>SKU</th><th>Lokace</th><th>LPN</th><th>LOT</th><th>Ks</th><th>Vychystáno</th><th>Stav</th></tr></thead><tbody>'+a.map(function(x){
        return '<tr><td><b>'+esc(x.sku)+'</b></td><td>'+esc(x.location_code||'')+'</td><td style="font-family:JetBrains Mono,monospace;font-size:12px">'+esc(x.lpn||'–')+'</td><td>'+esc(x.lot||'–')+'</td>'
          +'<td>'+nf(x.qty)+'</td><td>'+nf(x.picked_qty)+(Number(x.short_qty)?' <span style="color:#c0392b">(short '+nf(x.short_qty)+')</span>':'')+'</td><td>'+(SB[x.status]||esc(x.status))+'</td></tr>';}).join('')+'</tbody></table>';
      var pk=await O.supa.from('packages').select('*,package_lines(*)').eq('delivery_id',doc.id).order('id');
      if(!pk.error&&pk.data&&pk.data.length){
        var KN={pallet:'Paleta',carton:'Karton',other:'Jiné'};
        g('work-body').innerHTML+='<div style="padding:12px 16px 4px;font-weight:700;font-size:13px">📦 Obaly ('+pk.data.length+')</div><table><thead><tr><th>Kód</th><th>Typ</th><th>Obsah</th><th>Váha</th><th>Rozměry</th><th>Nakládka</th></tr></thead><tbody>'+pk.data.map(function(p){
          return '<tr><td style="font-family:JetBrains Mono,monospace;font-weight:700">'+esc(p.code)+'</td><td>'+esc(KN[p.kind]||p.kind)+'</td><td style="font-size:12px">'+(p.package_lines||[]).map(function(l){return esc(l.sku)+' '+nf(l.qty);}).join(', ')+'</td><td>'+(p.weight_kg!=null?nf(p.weight_kg)+' kg':'–')+'</td><td>'+(p.length_cm?nf(p.length_cm)+'×'+nf(p.width_cm)+'×'+nf(p.height_cm)+' cm':'–')+'</td><td>'+(p.status==='loaded'?'<span class="badge badge-green">Naloženo</span>':'<span class="badge badge-gray">Čeká</span>')+'</td></tr>';}).join('')+'</tbody></table>';
      }
    }
  }

  // ---------- odchod bez uložení ----------
  function guard(){
    window.addEventListener('beforeunload',function(e){if(dirty&&!leaving){e.preventDefault();e.returnValue='';return '';}});
    var origGo=window.go;
    window.go=function(u){ask(function(){leaving=true;if(origGo)origGo(u);else location.href=u;});};
    document.addEventListener('click',function(e){
      var a=e.target.closest&&e.target.closest('a[href]');if(!a||a.target==='_blank'||e.ctrlKey||e.metaKey)return;
      var href=a.getAttribute('href');if(!href||href.charAt(0)==='#'||/^javascript:/i.test(href))return;
      if(!dirty)return;
      e.preventDefault();ask(function(){leaving=true;location.href=href;});
    },true);
  }
  function ask(proceed){
    if(!dirty){proceed();return;}
    var w=F().overlay('<h3 style="font-family:Barlow Condensed,sans-serif;font-size:20px;margin-bottom:8px">Neuložené změny</h3>'
      +'<p style="font-size:14px;margin-bottom:16px">Doklad má neuložené změny. Chceš je před odchodem uložit?</p>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn btn-secondary" id="lv-stay">Zůstat</button><button class="btn btn-secondary" id="lv-no" style="color:#c0392b">Neukládat</button><button class="btn btn-primary" id="lv-yes">💾 Uložit</button></div>');
    w.querySelector('#lv-stay').onclick=function(){w.remove();};
    w.querySelector('#lv-no').onclick=function(){w.remove();dirty=false;proceed();};
    w.querySelector('#lv-yes').onclick=async function(){this.disabled=true;var ok=await save();w.remove();if(ok)proceed();};
  }

  window.PRG_DOCEDIT={init:init,refreshLive:function(){if(!doc||dirty||AC.inp)return;return refreshLive();},isDirty:function(){return dirty;},save:save,_state:function(){return {doc:doc,dirty:dirty,skus:skus};}};
})();
