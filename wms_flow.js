/* PRG WMS – statusy příjmů a výdejů (sdílené pro seznamy, detail dokladu a dashboard).
   Status se mění jen scannerem; web zakládá doklady (New), alokuje a uvolňuje výdeje, admin může zasáhnout (override s důvodem). */
(function(){
  var S={
    receipt:{
      'new':{t:'Nový',c:'gray',h:'Založeno, čeká na příjezd'},
      arrived:{t:'Dorazilo',c:'blue',h:'Auto dorazilo, čeká na příjem'},
      receiving:{t:'Přijímá se',c:'orange',h:'Skladník páruje zboží ve scanneru'},
      received:{t:'Přijato',c:'blue',h:'Zboží je na skladě (UNASSIGNED), čeká na zaskladnění'},
      putaway:{t:'Zaskladňuje se',c:'orange',h:'Palety se zaskladňují na lokace'},
      done:{t:'Hotovo',c:'green',h:'Vše zaskladněno'},
      cancelled:{t:'Zrušeno',c:'red',h:'Doklad zrušen'}
    },
    delivery:{
      'new':{t:'Nový',c:'gray',h:'Založeno, zásoba není rezervovaná'},
      allocated:{t:'Alokováno',c:'blue',h:'Zásoba je rezervovaná, čeká na uvolnění do skladu'},
      released:{t:'Uvolněno',c:'blue',h:'Ve frontě úloh scanneru'},
      picking:{t:'Vychystává se',c:'orange',h:'Skladník vychystává ve scanneru'},
      picked:{t:'Vychystáno',c:'green',h:'Vše vychystáno, čeká na odeslání'},
      shipped:{t:'Odesláno',c:'green',h:'Odjelo, odepsáno ze skladu'},
      cancelled:{t:'Zrušeno',c:'red',h:'Doklad zrušen'}
    }
  };
  var ORDER={receipt:['new','arrived','receiving','received','putaway','done'],delivery:['new','allocated','released','picking','picked','shipped']};
  var LEGACY={draft:'new',confirmed:'done',loaded:'shipped',ready:'new'};
  function norm(type,s){s=s||'new';if(S[type][s])return s;if(type==='delivery'&&s==='confirmed')return 'shipped';return LEGACY[s]||s;}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function meta(type,s){s=norm(type,s);return S[type][s]||{t:s,c:'gray',h:''};}
  function badge(type,s){var m=meta(type,s);return '<span class="badge badge-'+m.c+'" title="'+esc(m.h)+'">'+esc(m.t)+'</span>';}
  function problemIcon(doc){return doc&&doc.problem?' <span title="'+esc(doc.problem)+'" style="color:#c0392b;font-weight:700;cursor:help">⚠</span>':'';}
  function nf(n){return (Number(n)||0).toLocaleString('cs-CZ');}
  function progress(type,doc,p){
    if(!p)return '';var s=norm(type,doc.status);
    if(type==='receipt'){
      if(s==='receiving')return nf(p.scanned_qty)+' / '+nf(p.expected_qty)+' ks';
      if(s==='received'||s==='putaway')return 'zaskladněno '+nf(p.putaway_cnt)+' / '+nf(p.scans_cnt)+' LPN';
      if(s==='done')return nf(p.scanned_qty||p.expected_qty)+' ks';
      return nf(p.expected_qty)+' ks';
    }
    if(s==='picking'||s==='picked')return nf(p.picked_qty)+' / '+nf(p.alloc_qty)+' ks'+(Number(p.short_qty)?' · short '+nf(p.short_qty):'');
    if(s==='allocated'||s==='released')return nf(p.alloc_qty)+' / '+nf(p.ordered_qty)+' ks';
    return nf(p.ordered_qty)+' ks';
  }
  async function fetchProgress(supa,type,ids){
    var out={};if(!ids||!ids.length)return out;
    var view=type==='receipt'?'v_receipt_progress':'v_delivery_progress',key=type==='receipt'?'receipt_id':'delivery_id';
    for(var i=0;i<ids.length;i+=200){
      var r=await supa.from(view).select('*').in(key,ids.slice(i,i+200));
      if(r.error)return out;
      (r.data||[]).forEach(function(x){out[x[key]]=x;});
    }
    return out;
  }
  var ERR={
    NOT_FOUND:'Doklad nebo záznam nebyl nalezen.',DOC_CLOSED:'Doklad je uzavřený.',NO_SCANS:'Zatím není nic naskenováno.',
    QTY_RANGE:'Neplatné množství.',NOT_ADMIN:'Tohle smí jen administrátor.',REASON_REQUIRED:'Zadej důvod.',
    CANCEL_POSTED:'Zboží z dokladu už je na skladě – zrušit nejde. Případné opravy udělej v Adjustments.',
    PICKED_EXISTS:'Už se začalo vychystávat – alokaci nejde zrušit.',NO_DC:'Doklad nemá zvolené DC.',NO_LINES:'Doklad nemá položky.',
    LOCATION_REQUIRED:'Klient má příjem rovnou na lokaci – naskenuj lokaci.',ALREADY_CONFIRMED:'Doklad už je zaúčtovaný.'
  };
  function errMsg(e){
    var m=String((e&&(e.message||e.msg))||e||'');
    var k=m.match(/([A-Z_]{4,})(?::([^:]*))?(?::(.*))?/);
    if(/function .* does not exist|schema cache|v_receipt_progress|v_delivery_progress|doc_events|receipt_scans|delivery_allocations/i.test(m))return 'Chybí databázové funkce – spusť v Supabase SQL flow_setup-01.sql.';
    if(!k)return m;
    var c=k[1],a=k[2]||'',b=k[3]||'';
    if(ERR[c])return ERR[c];
    if(c==='DOC_STATE')return 'V tomhle stavu dokladu ('+meta('receipt',a).t+' / '+meta('delivery',a).t+') to nejde.';
    if(c==='UNKNOWN_SKU')return 'SKU '+a+' klient nemá v SKU Setup.';
    if(c==='LOT_REQUIRED')return 'U SKU '+a+' je povinný LOT.';
    if(c==='NO_LOCATION')return 'Lokace '+(a?a+' ':'')+'neexistuje.';
    if(c==='LPN_EXISTS')return 'LPN '+a+' už na skladě je.';
    if(c==='LPN_NOT_PENDING')return 'LPN '+a+' nečeká na zaskladnění.';
    if(c==='NO_STOCK')return 'Na skladě není volná zásoba'+(a?' ('+a+')':'')+'.';
    if(c==='BAD_TRANSITION')return 'Ze stavu „'+(meta('receipt',a).t)+'“ nejde přejít na „'+(meta('receipt',b).t)+'“.';
    if(c==='MIX_BULK')return 'Na bulk lokaci '+a+' je jiné SKU nebo LOT.';
    if(c==='BELOW_AVAILABLE')return 'Na lokaci '+a+' je dostupných jen '+b+'.';
    return m;
  }
  var EV={status:'Status',pick:'Vychystáno',short:'Short',putaway:'Zaskladněno',override:'Ruční zásah',problem:'Problém',note:'Poznámka',scan:'Sken'};
  async function timeline(supa,type,id,el){
    if(!el)return;
    var r=await supa.from('doc_events').select('*').eq('doc_type',type).eq('doc_id',id).order('created_at',{ascending:false}).limit(300);
    if(r.error){el.innerHTML='<div style="color:var(--muted);font-size:13px">'+esc(errMsg(r.error))+'</div>';return;}
    var d=r.data||[];
    if(!d.length){el.innerHTML='<div style="color:var(--muted);font-size:13px">Zatím žádné události.</div>';return;}
    el.innerHTML=d.map(function(e){
      var what=e.event==='status'?(badge(type,e.status_from)+' → '+badge(type,e.status_to)):
               e.event==='override'?('<b>Ruční zásah</b> '+badge(type,e.status_from)+' → '+badge(type,e.status_to)):
               '<b>'+esc(EV[e.event]||e.event)+'</b>';
      return '<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;align-items:flex-start">'
        +'<div style="flex:0 0 118px;color:var(--muted);font-size:12px">'+new Date(e.created_at).toLocaleString('cs-CZ',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})+'</div>'
        +'<div style="flex:1;min-width:0">'+what+(e.note?'<div style="color:var(--muted);font-size:12px;word-break:break-word">'+esc(e.note)+'</div>':'')+'</div>'
        +'<div style="flex:0 0 auto;color:var(--muted);font-size:12px">'+esc(e.user_name||'')+'</div></div>';
    }).join('');
  }
  function overlay(html){
    var w=document.createElement('div');
    w.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:300;padding:16px';
    w.className='modal-backdrop';
    w.innerHTML='<div style="background:#fff;border-radius:14px;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,.25);padding:20px;max-height:90vh;overflow:auto">'+html+'</div>';
    document.body.appendChild(w);return w;
  }
  var TARGETS={
    receipt:{'new':['arrived','cancelled'],arrived:['new','cancelled'],receiving:['new','cancelled'],received:['done'],putaway:['done'],cancelled:['new']},
    delivery:{allocated:['new','cancelled'],released:['new','cancelled'],picking:['released','picked','new','cancelled'],picked:['shipped','released','new','cancelled'],'new':['cancelled'],cancelled:['new']}
  };
  var THELP={
    receipt:{done:'Zbytek palet zůstane na lokaci UNASSIGNED.',cancelled:'Jen když zboží ještě není na skladě.','new':'Smaže skeny, které ještě nejsou zaúčtované.'},
    delivery:{'new':'Zruší rezervaci zásoby a vychystané kusy (zboží zůstává na lokacích).',cancelled:'Zruší rezervaci zásoby.',released:'Vynuluje vychystané kusy – vychystá se znovu.',picked:'Nevychystaný zbytek se uvolní (bez PIR).',shipped:'Odepíše vychystané kusy ze skladu.'}
  };
  function overrideDialog(o){
    var type=o.type,cur=norm(type,o.doc.status),opts=(TARGETS[type][cur]||[]);
    if(!opts.length){alert('Z tohoto stavu není ruční zásah možný.');return;}
    var w=overlay('<h3 style="font-family:Barlow Condensed,sans-serif;font-size:20px;margin-bottom:6px">Ruční zásah do statusu</h3>'
      +'<p style="font-size:13px;color:#7a8090;margin-bottom:12px">Nyní: '+badge(type,cur)+'. Běžně status mění scanner – ruční zásah se zapíše do historie dokladu.</p>'
      +'<label style="font-size:12px;font-weight:600;color:#7a8090">NOVÝ STATUS</label><select id="ov-to" style="width:100%;padding:9px;border:1.5px solid #e2e6ed;border-radius:7px;margin:4px 0 6px">'
      +opts.map(function(s){return '<option value="'+s+'">'+esc(meta(type,s).t)+'</option>';}).join('')+'</select>'
      +'<div id="ov-help" style="font-size:12px;color:#b35a00;min-height:16px;margin-bottom:8px"></div>'
      +'<label style="font-size:12px;font-weight:600;color:#7a8090">DŮVOD *</label><textarea id="ov-reason" style="width:100%;padding:9px;border:1.5px solid #e2e6ed;border-radius:7px;min-height:70px;margin-top:4px"></textarea>'
      +'<div id="ov-err" style="color:#c0392b;font-size:13px;min-height:18px;margin:6px 0"></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-secondary" id="ov-x">Zavřít</button><button class="btn btn-primary" id="ov-ok">Provést</button></div>');
    var sel=w.querySelector('#ov-to'),help=w.querySelector('#ov-help');
    function h(){help.textContent=(THELP[type]||{})[sel.value]||'';}sel.onchange=h;h();
    w.querySelector('#ov-x').onclick=function(){w.remove();};
    w.querySelector('#ov-ok').onclick=async function(){
      var reason=w.querySelector('#ov-reason').value.trim();
      if(!reason){w.querySelector('#ov-err').textContent='Zadej důvod.';return;}
      this.disabled=true;
      var r=await o.supa.rpc('wms_doc_override',{p_type:type,p_id:o.doc.id,p_to:sel.value,p_reason:reason,p_user:o.userId});
      if(r.error){this.disabled=false;w.querySelector('#ov-err').textContent=errMsg(r.error);return;}
      w.remove();if(o.onDone)o.onDone(sel.value);
    };
  }
  function problemDialog(o){
    var w=overlay('<h3 style="font-family:Barlow Condensed,sans-serif;font-size:20px;margin-bottom:10px">⚠ Problém u dokladu</h3>'
      +'<textarea id="pr-t" style="width:100%;padding:9px;border:1.5px solid #e2e6ed;border-radius:7px;min-height:80px">'+esc(o.doc.problem||'')+'</textarea>'
      +'<div id="pr-err" style="color:#c0392b;font-size:13px;min-height:18px;margin:6px 0"></div>'
      +'<div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap"><button class="btn btn-secondary" id="pr-clr">✅ Vyřešeno (smazat)</button><span style="display:flex;gap:8px"><button class="btn btn-secondary" id="pr-x">Zavřít</button><button class="btn btn-primary" id="pr-ok">Uložit</button></span></div>');
    async function save(t){
      var r=await o.supa.rpc('wms_doc_problem',{p_type:o.type,p_id:o.doc.id,p_text:t,p_user:o.userId});
      if(r.error){w.querySelector('#pr-err').textContent=errMsg(r.error);return;}
      w.remove();if(o.onDone)o.onDone();
    }
    w.querySelector('#pr-x').onclick=function(){w.remove();};
    w.querySelector('#pr-ok').onclick=function(){save(w.querySelector('#pr-t').value);};
    w.querySelector('#pr-clr').onclick=function(){save('');};
  }
  function statusOptions(type,withAll){
    return (withAll?'<option value="">Všechny stavy</option><option value="open">Otevřené</option>':'')
      +ORDER[type].concat(['cancelled']).map(function(s){return '<option value="'+s+'">'+esc(meta(type,s).t)+'</option>';}).join('')
      +'<option value="problem">⚠ S problémem</option>';
  }
  function isOpen(type,s){s=norm(type,s);return type==='receipt'?(s!=='done'&&s!=='cancelled'):(s!=='shipped'&&s!=='cancelled');}
  window.PRG_FLOW={S:S,ORDER:ORDER,norm:norm,meta:meta,badge:badge,problemIcon:problemIcon,progress:progress,fetchProgress:fetchProgress,
    errMsg:errMsg,timeline:timeline,overrideDialog:overrideDialog,problemDialog:problemDialog,statusOptions:statusOptions,isOpen:isOpen,esc:esc,overlay:overlay};
})();
