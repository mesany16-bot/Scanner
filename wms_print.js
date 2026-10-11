/* PRG WMS - tisk dokumentu a stitku (sdileny modul)
   Sablony jsou HTML + CSS s promennymi:
     {{pole.cesta}}  vypis (escapovany)      {{{pole}}} vypis bez escapovani
     {{#each items}} ... {{/each}}            cyklus, uvnitr {{sku}}, {{@index1}} (cislo radku), {{@first}}, {{@last}}
     {{#if pole}} ... {{else}} ... {{/if}}    podminka
     {{barcode hodnota hmm=12 dots=2 text=0}} Code 128 (dots = sirka cary v bodech tiskarny 203 dpi)
     {{gs1 hodnota hmm=20}}                   GS1-128 (napr. SSCC, jen cislice)
     {{qr hodnota size=80}}                   QR kod (nacte se knihovna)
     {{date pole}} {{datetime pole}} {{num pole}} {{upper pole}}
   Pouziti:  PRG_PRINT.printDocument(supa,'pick_list',deliveryId,{profile,user})
             PRG_PRINT.printLabels(supa,'label_pallet',[{...},{...}],{profile,user})   */
(function(){
  /* ============ typy dokumentu ============ */
  var TYPES=[
    {k:'pick_list',     l:'Pick list',        kind:'doc',   src:'delivery', paper:'A4',      margin:10},
    {k:'packing_list',  l:'Packing list',     kind:'doc',   src:'delivery', paper:'A4',      margin:10},
    {k:'delivery_note', l:'Dodací list',      kind:'doc',   src:'delivery', paper:'A4',      margin:10},
    {k:'receipt_note',  l:'Příjemka',         kind:'doc',   src:'receipt',  paper:'A4',      margin:10},
    {k:'label_pallet',  l:'Štítek palety',    kind:'label', src:'label',    paper:'100x150', margin:4},
    {k:'label_location',l:'Štítek lokace',    kind:'label', src:'label',    paper:'100x50',  margin:3},
    {k:'label_sku',     l:'Štítek SKU',       kind:'label', src:'label',    paper:'100x50',  margin:3}
  ];
  function typeInfo(k){for(var i=0;i<TYPES.length;i++)if(TYPES[i].k===k)return TYPES[i];return null;}

  /* ============ pomocne ============ */
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function pad(n){return n<10?'0'+n:''+n;}
  function toDate(v){if(!v)return null;var d=v instanceof Date?v:new Date(v);return isNaN(d.getTime())?null:d;}
  function fDate(v){var d=toDate(v);return d?pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear():'';}
  function fDateTime(v){var d=toDate(v);return d?fDate(d)+' '+pad(d.getHours())+':'+pad(d.getMinutes()):'';}
  function fNum(v){var n=Number(v);return isNaN(n)?String(v==null?'':v):n.toLocaleString('cs-CZ');}

  /* ============ Code 128 ============ */
  var P=["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"];
  function code128Codes(value,gs1){
    var s=String(value),codes=[],i;
    if(gs1){
      if(!/^\d+$/.test(s)||s.length%2)return null;
      codes.push(105,102);
      for(i=0;i<s.length;i+=2)codes.push(parseInt(s.substr(i,2),10));
    }else if(/^\d{4,}$/.test(s)&&s.length%2===0){
      codes.push(105);for(i=0;i<s.length;i+=2)codes.push(parseInt(s.substr(i,2),10));
    }else{
      codes.push(104);
      for(i=0;i<s.length;i++){var c=s.charCodeAt(i);if(c<32||c>126)c=63;codes.push(c-32);}
    }
    var sum=codes[0];for(i=1;i<codes.length;i++)sum+=codes[i]*i;
    codes.push(sum%103);codes.push(106);
    return codes;
  }
  /* rozliseni tiskarny: Honeywell PM45 = 203 dpi (8 bodu/mm). Sirka modulu = cely pocet bodu, jinak se kod hure cte. */
  var DPI=203;
  function code128Svg(value,gs1,o){
    o=o||{};var ai=gs1?String(o.ai!=null?o.ai:'00'):'';var codes=code128Codes(gs1?ai+String(value):value,gs1);
    if(!codes)return '<span style="color:#c00">[kód ?]</span>';
    var dpi=+o.dpi||DPI,quiet=10,x=quiet,rects='';
    codes.forEach(function(c){var p=P[c];for(var i=0;i<p.length;i++){var wd=+p[i];if(i%2===0)rects+='<rect x="'+x+'" y="0" width="'+wd+'" height="1"/>';x+=wd;}});
    var modules=x+quiet,dotMm=25.4/dpi;
    var dots=+o.dots||+o.w||0;
    if(!dots&&o.width){dots=Math.max(1,Math.floor((+o.width)/(modules*dotMm)));}
    if(!dots)dots=2;
    var wMm=+(modules*dots*dotMm).toFixed(3),hMm=o.hmm?+o.hmm:+((o.h||40)*0.2646).toFixed(2);
    var showText=o.text!==0&&o.text!=='0';
    var txt=showText?'<div style="font:9pt Arial,Helvetica,sans-serif;text-align:center;margin-top:0.6mm;width:'+wMm+'mm">'+esc(gs1?'('+ai+') '+String(value).replace(/^(\d)(\d{7})(\d{9})(\d)$/,'$1 $2 $3 $4'):value)+'</div>':'';
    return '<span style="display:inline-block;vertical-align:top"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+modules+' 1" preserveAspectRatio="none" style="display:block;width:'+wMm+'mm;height:'+hMm+'mm" shape-rendering="crispEdges"><g fill="#000">'+rects+'</g></svg>'+txt+'</span>';
  }
  /* SSCC: 1 extension digit + GS1 prefix + serial = 17 cislic + kontrolni cislice */
  function ssccCheck(d17){var s=0,i;for(i=0;i<17;i++){s+=(+d17[16-i])*(i%2===0?3:1);}return String((10-(s%10))%10);}
  function sscc(ext,prefix,serial){
    var base=String(ext)+String(prefix);var left=17-base.length;if(left<1)return null;
    var ser=String(serial);if(ser.length>left)return null;while(ser.length<left)ser='0'+ser;
    var d=base+ser;return d+ssccCheck(d);
  }

  /* ============ QR (knihovna se nacte az kdyz je potreba) ============ */
  function qrSvg(value,size){
    if(typeof window==='undefined'||typeof window.qrcode!=='function')return '<span style="color:#c00">[QR nedostupný]</span>';
    var q=window.qrcode(0,'M');q.addData(String(value));q.make();
    var n=q.getModuleCount(),cell=Math.max(1,Math.floor((size||80)/n)),px=n*cell,r='';
    for(var y=0;y<n;y++)for(var x=0;x<n;x++)if(q.isDark(y,x))r+='<rect x="'+x*cell+'" y="'+y*cell+'" width="'+cell+'" height="'+cell+'"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+px+' '+px+'" width="'+px+'" height="'+px+'" shape-rendering="crispEdges"><g fill="#000">'+r+'</g></svg>';
  }

  /* ============ mini sablonovy engine ============ */
  var HELPERS={barcode:1,gs1:1,qr:1,date:1,datetime:1,num:1,upper:1};
  function tokenize(tpl){
    var out=[],re=/\{\{\{([\s\S]+?)\}\}\}|\{\{([\s\S]+?)\}\}/g,last=0,m;
    while((m=re.exec(tpl))){
      if(m.index>last)out.push({t:'text',v:tpl.slice(last,m.index)});
      out.push(m[1]!=null?{t:'tag',v:m[1].trim(),raw:true}:{t:'tag',v:m[2].trim()});
      last=re.lastIndex;
    }
    if(last<tpl.length)out.push({t:'text',v:tpl.slice(last)});
    return out;
  }
  function parse(tpl){
    var toks=tokenize(tpl),pos=0;
    function block(until){
      var nodes=[];
      while(pos<toks.length){
        var t=toks[pos];
        if(t.t==='text'){nodes.push(t);pos++;continue;}
        var v=t.v;
        if(v==='/each'||v==='/if'||v==='else'){if(until&&(v==='/'+until||(until==='if'&&v==='else')))return nodes;throw new Error('Neočekávané {{'+v+'}}');}
        pos++;
        if(v.indexOf('#each ')===0){var body=block('each');if(!toks[pos]||toks[pos].v!=='/each')throw new Error('Chybí {{/each}}');pos++;nodes.push({t:'each',p:v.slice(6).trim(),body:body});}
        else if(v.indexOf('#if ')===0){var thenB=block('if'),elseB=[];if(toks[pos]&&toks[pos].v==='else'){pos++;elseB=block('if');}if(!toks[pos]||toks[pos].v!=='/if')throw new Error('Chybí {{/if}}');pos++;nodes.push({t:'if',p:v.slice(4).trim(),a:thenB,b:elseB});}
        else nodes.push({t:'tag',v:v,raw:t.raw});
      }
      if(until)throw new Error('Chybí {{/'+until+'}}');
      return nodes;
    }
    return block(null);
  }
  function lookup(scopes,path){
    if(path==='this')return scopes[scopes.length-1].v;
    if(path.charAt(0)==='@'){var m=scopes[scopes.length-1].meta||{};return m[path.slice(1)];}
    var parts=path.split('.'),i,j;
    for(i=scopes.length-1;i>=0;i--){
      var cur=scopes[i].v;
      if(cur==null||typeof cur!=='object')continue;
      if(!(parts[0] in cur))continue;
      for(j=0;j<parts.length;j++){if(cur==null)return undefined;cur=cur[parts[j]];}
      return cur;
    }
    return undefined;
  }
  function splitArgs(s){var out=[],re=/"([^"]*)"|'([^']*)'|(\S+)/g,m;while((m=re.exec(s)))out.push(m[1]!=null?{q:m[1]}:m[2]!=null?{q:m[2]}:{w:m[3]});return out;}
  function evalArg(a,scopes){if(a.q!=null)return a.q;if(/^-?\d+(\.\d+)?$/.test(a.w))return Number(a.w);return lookup(scopes,a.w);}
  function runHelper(name,argStr,scopes){
    var args=splitArgs(argStr),pos=[],opt={};
    args.forEach(function(a){
      if(a.w&&a.w.indexOf('=')>0){var k=a.w.slice(0,a.w.indexOf('=')),val=a.w.slice(a.w.indexOf('=')+1);opt[k]=/^-?\d+(\.\d+)?$/.test(val)?Number(val):val;}
      else pos.push(evalArg(a,scopes));
    });
    var v=pos[0];
    switch(name){
      case 'barcode':return v==null||v===''?'':code128Svg(v,false,opt);
      case 'gs1':return v==null||v===''?'':code128Svg(v,true,opt);
      case 'qr':return v==null||v===''?'':qrSvg(v,opt.size);
      case 'date':return esc(fDate(v));
      case 'datetime':return esc(fDateTime(v));
      case 'num':return esc(fNum(v));
      case 'upper':return esc(String(v==null?'':v).toUpperCase());
    }
    return '';
  }
  function truthy(v){if(Array.isArray(v))return v.length>0;return !!v&&v!==0&&v!=='0';}
  function renderNodes(nodes,scopes){
    var out='';
    nodes.forEach(function(n){
      if(n.t==='text'){out+=n.v;return;}
      if(n.t==='each'){
        var arr=lookup(scopes,n.p);if(!Array.isArray(arr))return;
        arr.forEach(function(it,i){var sc=scopes.concat([{v:it,meta:{index:i,index1:i+1,first:i===0,last:i===arr.length-1}}]);out+=renderNodes(n.body,sc);});
        return;
      }
      if(n.t==='if'){out+=renderNodes(truthy(lookup(scopes,n.p))?n.a:n.b,scopes);return;}
      var v=n.v,sp=v.indexOf(' '),first=sp<0?v:v.slice(0,sp);
      if(HELPERS[first]&&!n.raw){out+=runHelper(first,sp<0?'':v.slice(sp+1),scopes);return;}
      var val=lookup(scopes,v);
      out+=n.raw?String(val==null?'':val):esc(val);
    });
    return out;
  }
  function render(body,ctx){return renderNodes(parse(body),[{v:ctx}]);}
  function validate(body){try{parse(body);return null;}catch(e){return e.message;}}

  /* ============ papir ============ */
  function pageCss(paper,margin){
    var m=(margin==null?10:margin)+'mm',p=String(paper||'A4').trim(),size;
    if(/^A[3-6]L$/i.test(p))size=p.slice(0,2).toUpperCase()+' landscape';
    else if(/^A[3-6]$/i.test(p))size=p.toUpperCase()+' portrait';
    else if(/^LETTER$/i.test(p))size='letter portrait';
    else{var mm=p.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);size=mm?mm[1]+'mm '+mm[2]+'mm':'A4 portrait';}
    return '@page{size:'+size+';margin:'+m+'}';
  }
  function wrapHtml(title,pages,paper,margin,auto){
    return '<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>'+esc(title)+'</title><style>*{box-sizing:border-box}body{margin:0}'+pageCss(paper,margin)+'.pg{page-break-after:always;break-after:page}.pg:last-child{page-break-after:auto;break-after:auto}@media screen{body{background:#e9ecef;padding:12px}.pg{background:#fff;margin:0 auto 12px;padding:6mm;box-shadow:0 1px 6px rgba(0,0,0,.2)}}</style></head><body>'+pages.map(function(p){return '<div class="pg">'+p+'</div>';}).join('')+(auto?'<script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},350);});<\/script>':'')+'</body></html>';
  }

  /* ============ vychozi sablony ============ */
  var CSS_DOC='<style>body,.pg{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#000}h1{font-size:20pt;margin:0 0 2mm}.meta{width:100%;border-collapse:collapse;margin-bottom:5mm}.meta td{padding:1mm 0;vertical-align:top;font-size:10pt}.r{text-align:right}table.l{width:100%;border-collapse:collapse}table.l th{background:#eee;text-align:left;font-size:9pt;border:1px solid #444;padding:1.5mm}table.l td{border:1px solid #444;padding:1.6mm;font-size:10pt;vertical-align:middle}.sig{margin-top:14mm;display:flex;gap:16mm}.sig div{flex:1;border-top:1px solid #000;padding-top:1mm;font-size:9pt}.small{font-size:8.5pt;color:#444}</style>';
  var BUILTIN={
    pick_list:CSS_DOC+'<table class="meta"><tr><td><h1>Pick list</h1><b style="font-size:14pt">{{doc.number}}</b><br>Klient: {{doc.client}}<br>DC: {{doc.dc}}{{#if doc.special}}<br><b>Stav: {{doc.special_cs}}</b>{{/if}}</td><td class="r">{{barcode doc.number hmm=12 dots=2}}<br>Plánovaný výdej: <b>{{datetime doc.planned_at}}</b><br>Priorita: <b>{{doc.priority_cs}}</b><br><span class="small">Vytištěno {{datetime now}} · {{user}}</span></td></tr></table>{{#if doc.note}}<p><b>Poznámka:</b> {{doc.note}}</p>{{/if}}<table class="l"><thead><tr><th style="width:8mm">#</th><th>Lokace</th><th>SKU</th><th>Popis</th><th>LOT</th><th class="r">Množství</th><th style="width:10mm">✓</th></tr></thead><tbody>{{#each items}}<tr><td>{{@index1}}</td><td><b style="font-size:11.5pt">{{location}}</b>{{#if suggested}}<div class="small">návrh dle FIFO</div>{{/if}}{{#if full}}<div class="small"><b>celá paleta</b></div>{{/if}}</td><td><b>{{sku}}</b></td><td>{{description}}</td><td>{{lot}}</td><td class="r"><b style="font-size:11.5pt">{{num qty}}</b></td><td></td></tr>{{/each}}</tbody></table><p class="r"><b>Řádků: {{totals.lines}} · Celkem kusů: {{num totals.qty}}</b></p><div class="sig"><div>Vychystal</div><div>Zkontroloval</div></div>',
    packing_list:CSS_DOC+'<table class="meta"><tr><td><h1>Packing list</h1><b style="font-size:14pt">{{doc.number}}</b><br>Klient: {{doc.client}}<br>DC: {{doc.dc}}</td><td class="r">{{barcode doc.number hmm=12 dots=2}}<br>Datum: {{date now}}</td></tr></table>{{#if doc.note}}<p><b>Poznámka:</b> {{doc.note}}</p>{{/if}}<table class="l"><thead><tr><th style="width:8mm">#</th><th>SKU</th><th>Popis</th><th>EAN</th><th>LOT</th><th class="r">Množství</th></tr></thead><tbody>{{#each items}}<tr><td>{{@index1}}</td><td><b>{{sku}}</b></td><td>{{description}}</td><td>{{ean}}</td><td>{{lot}}</td><td class="r"><b>{{num qty}}</b></td></tr>{{/each}}</tbody></table><p class="r"><b>Řádků: {{totals.lines}} · Celkem kusů: {{num totals.qty}}</b></p><table class="meta" style="margin-top:8mm"><tr><td>Počet palet: ____________</td><td>Počet kartonů: ____________</td><td>Hmotnost (kg): ____________</td></tr></table><div class="sig"><div>Zabalil</div><div>Zkontroloval</div></div>',
    delivery_note:CSS_DOC+'<table class="meta"><tr><td><h1>Dodací list</h1><b style="font-size:14pt">{{doc.number}}</b><br>Odběratel: <b>{{doc.client}}</b></td><td class="r">{{barcode doc.number hmm=12 dots=2}}<br>Datum vystavení: {{date now}}<br>Odesílá: DC {{doc.dc}}</td></tr></table>{{#if doc.note}}<p><b>Poznámka:</b> {{doc.note}}</p>{{/if}}<table class="l"><thead><tr><th style="width:8mm">#</th><th>SKU</th><th>Popis</th><th>LOT</th><th class="r">Množství</th></tr></thead><tbody>{{#each items}}<tr><td>{{@index1}}</td><td><b>{{sku}}</b></td><td>{{description}}</td><td>{{lot}}</td><td class="r"><b>{{num qty}}</b></td></tr>{{/each}}</tbody></table><p class="r"><b>Celkem kusů: {{num totals.qty}}</b></p><div class="sig"><div>Vydal</div><div>Dopravce / řidič</div><div>Převzal (jméno, podpis, datum)</div></div>',
    receipt_note:CSS_DOC+'<table class="meta"><tr><td><h1>Příjemka</h1><b style="font-size:14pt">{{doc.number}}</b><br>Dodavatel: {{doc.supplier}}<br>Klient: {{doc.client}}<br>DC: {{doc.dc}}</td><td class="r">{{barcode doc.number hmm=12 dots=2}}<br>Plánovaný příjezd: <b>{{datetime doc.expected_at}}</b><br><span class="small">Vytištěno {{datetime now}} · {{user}}</span></td></tr></table>{{#if doc.note}}<p><b>Poznámka:</b> {{doc.note}}</p>{{/if}}<table class="l"><thead><tr><th style="width:8mm">#</th><th>SKU</th><th>Popis</th><th>LOT</th><th class="r">Plán (ks)</th><th class="r">Palet</th><th>Typ</th><th style="width:26mm">Přijato (ks)</th></tr></thead><tbody>{{#each items}}<tr><td>{{@index1}}</td><td><b>{{sku}}</b></td><td>{{description}}</td><td>{{lot}}</td><td class="r"><b>{{num qty}}</b></td><td class="r">{{pallets}}</td><td>{{pallet_type}}</td><td></td></tr>{{/each}}</tbody></table><p class="r"><b>Řádků: {{totals.lines}} · Plán celkem: {{num totals.qty}} ks</b></p><div class="sig"><div>Přijal</div><div>Zkontroloval</div></div>',
    label_pallet:'<style>.lb{font-family:Arial,Helvetica,sans-serif;color:#000;width:92mm}.lb .sku{font-size:30pt;font-weight:700;line-height:1.05;word-break:break-all}.lb .desc{font-size:12pt;margin:1mm 0 3mm}.lb table{width:100%;border-collapse:collapse}.lb td{border-top:1.5px solid #000;padding:1.5mm 2mm 1.5mm 0;font-size:11pt;vertical-align:top}.lb .big{font-size:20pt;font-weight:700}.lb .cap{font-size:8pt;color:#333;text-transform:uppercase}.lb .c{text-align:center;margin-top:3mm}</style><div class="lb"><div class="cap">{{customer}} · DC {{dc}}</div><div class="sku">{{sku}}</div><div class="desc">{{description}}</div><table><tr><td style="width:50%"><div class="cap">Množství</div><div class="big">{{num qty}}</div></td><td><div class="cap">LOT</div><div class="big">{{lot}}</div></td></tr><tr><td><div class="cap">Lokace</div><div class="big" style="font-size:15pt">{{location}}</div></td><td><div class="cap">Příjem</div><div class="big" style="font-size:14pt">{{date received}}</div></td></tr></table><div class="c">{{#if sscc}}{{gs1 sscc hmm=22 dots=2}}{{else}}{{barcode lpn hmm=20 dots=3}}{{/if}}</div></div>',
    label_location:'<style>.ll{font-family:Arial,Helvetica,sans-serif;color:#000;text-align:center;width:94mm}.ll .code{font-size:34pt;font-weight:700;letter-spacing:1px;line-height:1.1}.ll .sub{font-size:9pt;color:#333}</style><div class="ll"><div class="sub">DC {{dc}}</div><div class="code">{{code}}</div>{{barcode code hmm=12 dots=3 text=0}}</div>',
    label_sku:'<style>.ls{font-family:Arial,Helvetica,sans-serif;color:#000;width:94mm}.ls .top{display:flex;justify-content:space-between;align-items:baseline;gap:3mm}.ls .sku{font-size:22pt;font-weight:700;line-height:1.05;word-break:break-all}.ls .cl{font-size:8pt;color:#333;text-transform:uppercase;white-space:nowrap}.ls .d{font-size:10pt;margin:0.5mm 0 1.5mm;max-height:9mm;overflow:hidden}.ls .c{text-align:center}</style><div class="ls"><div class="top"><div class="sku">{{sku}}</div><div class="cl">{{client}}</div></div><div class="d">{{description}}</div><div class="c">{{barcode ean hmm=14 dots=3}}</div></div>'
  };

  /* ============ ukazkova data pro nahled ============ */
  function sampleCtx(type){
    var now=new Date().toISOString(),t=typeInfo(type);
    if(t&&t.kind==='doc'){
      var items=[{n:1,sku:'SKU-1001',description:'Ukázková položka A',ean:'8590000000011',qty:480,lot:'LOT2410',location:'R12P05L02BA',suggested:false,full:true,pallets:2,pallet_type:'EUR'},
                 {n:2,sku:'SKU-1002',description:'Ukázková položka B',ean:'8590000000028',qty:48,lot:'',location:'R12P06L01BA',suggested:true,full:false,pallets:1,pallet_type:'EUR'}];
      return {title:t.l,now:now,user:'Jan',doc:{number:'VYD-2026-001',client:'Klient A',dc:'DC29',dc_name:'Praha',status:'new',special:'',special_cs:'',priority:'high',priority_cs:'Vysoká',planned_at:now,expected_at:now,created_at:now,supplier:'Dodavatel 1',note:'Ukázková poznámka'},items:items,totals:{lines:2,qty:528}};
    }
    if(type==='label_pallet')return {customer:'Klient A',dc:'DC29',sku:'SKU-1001',description:'Ukázková položka A',ean:'8590000000011',qty:480,lot:'LOT2410',location:'R12P05L02BA',lpn:'LPN0000123456',sscc:'',received:now};
    if(type==='label_location')return {dc:'DC29',code:'R12P05L02BA',row:12,bay:5,level:2};
    return {sku:'SKU-1001',description:'Ukázková položka A',ean:'8590000000011',client:'Klient A',dc:'DC29'};
  }

  /* ============ nacteni dat z DB ============ */
  var PRI={high:'Vysoká',normal:'Normální',low:'Nízká'},SPEC={preorder:'Předobjednávka',hold:'Hold'};
  async function selAll(q){var out=[],from=0;while(true){var r=await q.range(from,from+999);if(r.error)throw r.error;var d=r.data||[];out=out.concat(d);if(d.length<1000)break;from+=1000;}return out;}
  async function loadDelivery(supa,id,kind){
    var dr=await supa.from('deliveries').select('*').eq('id',id).single();if(dr.error||!dr.data)throw new Error('Doklad nenalezen');
    var d=dr.data;
    var ir=await supa.from('delivery_items').select('*').eq('delivery_id',id);var items=ir.data||[];
    var ids=items.map(function(i){return i.stock_item_id;}).filter(Boolean);
    var si={};if(ids.length){var sr=await supa.from('stock_items').select('id,sku,ean,description').in('id',ids);(sr.data||[]).forEach(function(s){si[s.id]=s;});}
    var cl=d.client_id!=null?(await supa.from('clients').select('name').eq('id',d.client_id).single()).data:null;
    var wh=d.warehouse_id!=null?(await supa.from('warehouses').select('code,name').eq('id',d.warehouse_id).single()).data:null;
    var skus=items.map(function(i){return i.sku||(si[i.stock_item_id]&&si[i.stock_item_id].sku);}).filter(Boolean);
    var bal={};
    if(kind==='pick_list'&&skus.length&&d.warehouse_id!=null){
      try{var br=await supa.from('stock_balances').select('sku,location_code,lot,units_available,received_at').eq('dc_id',d.warehouse_id).in('sku',skus).gt('units_available',0).order('received_at',{ascending:true});
        (br.data||[]).forEach(function(b){(bal[String(b.sku).toUpperCase()]=bal[String(b.sku).toUpperCase()]||[]).push(b);});}catch(e){}
    }
    var rows=items.map(function(i){
      var s=si[i.stock_item_id]||{},sku=i.sku||s.sku||'',loc=i.location_code||'',sug=false;
      if(!loc&&kind==='pick_list'){var c=bal[String(sku).toUpperCase()]||[];var pick=c.filter(function(b){return (!i.lot||b.lot===i.lot)&&Number(b.units_available)>=Number(i.quantity);})[0]||c.filter(function(b){return !i.lot||b.lot===i.lot;})[0];if(pick){loc=pick.location_code||'';sug=true;}}
      return {sku:sku,description:s.description||'',ean:i.ean||s.ean||'',qty:i.quantity,lot:i.lot||'',location:loc,suggested:sug,full:i.full_pallet===true,note:i.note||''};
    });
    if(kind==='pick_list')rows.sort(function(a,b){return String(a.location||'~').localeCompare(String(b.location||'~'),'cs',{numeric:true})||String(a.sku).localeCompare(String(b.sku));});
    rows.forEach(function(r,i){r.n=i+1;});
    return {doc:{number:d.delivery_number,client:cl?cl.name:'',dc:wh?wh.code:'',dc_name:wh?wh.name:'',status:d.status,special:d.special_status||'',special_cs:SPEC[d.special_status]||'',priority:d.priority||'normal',priority_cs:PRI[d.priority||'normal']||'',planned_at:d.planned_at||'',created_at:d.created_at||'',note:d.note||''},items:rows,totals:{lines:rows.length,qty:rows.reduce(function(a,r){return a+(Number(r.qty)||0);},0)},_meta:{dc_id:d.warehouse_id,client_id:d.client_id,number:d.delivery_number}};
  }
  async function loadReceipt(supa,id){
    var dr=await supa.from('receipts').select('*').eq('id',id).single();if(dr.error||!dr.data)throw new Error('Doklad nenalezen');
    var d=dr.data;
    var ir=await supa.from('receipt_items').select('*').eq('receipt_id',id);var items=ir.data||[];
    var ids=items.map(function(i){return i.stock_item_id;}).filter(Boolean);
    var si={};if(ids.length){var sr=await supa.from('stock_items').select('id,sku,ean,description').in('id',ids);(sr.data||[]).forEach(function(s){si[s.id]=s;});}
    var cl=d.client_id!=null?(await supa.from('clients').select('name').eq('id',d.client_id).single()).data:null;
    var wh=d.warehouse_id!=null?(await supa.from('warehouses').select('code,name').eq('id',d.warehouse_id).single()).data:null;
    var rows=items.map(function(i,n){var s=si[i.stock_item_id]||{};return {n:n+1,sku:i.sku||s.sku||'',description:s.description||'',ean:i.ean||s.ean||'',qty:i.quantity,lot:i.lot||'',pallets:i.pallets==null?'':i.pallets,pallet_type:i.pallet_type||'',note:i.note||''};});
    return {doc:{number:d.receipt_number,client:cl?cl.name:'',dc:wh?wh.code:'',dc_name:wh?wh.name:'',supplier:d.supplier||'',expected_at:d.expected_at||'',created_at:d.created_at||'',status:d.status,note:d.note||''},items:rows,totals:{lines:rows.length,qty:rows.reduce(function(a,r){return a+(Number(r.qty)||0);},0)},_meta:{dc_id:d.warehouse_id,client_id:d.client_id,number:d.receipt_number}};
  }

  /* ============ vyber sablony (DB, jinak vychozi) ============ */
  async function resolveTemplate(supa,type,dcId,clientId){
    var t=typeInfo(type);
    var fallback={id:null,name:'Výchozí',doc_type:type,paper:t.paper,margin_mm:t.margin,body:BUILTIN[type],version:0,builtin:true};
    try{
      var r=await supa.from('print_templates').select('*').eq('doc_type',type).eq('is_active',true);
      if(r.error)return fallback;
      var best=null,bs=-1;
      (r.data||[]).forEach(function(x){
        if(x.dc_id!=null&&dcId!=null&&String(x.dc_id)!==String(dcId))return;
        if(x.dc_id!=null&&dcId==null)return;
        if(x.client_id!=null&&(clientId==null||String(x.client_id)!==String(clientId)))return;
        var sc=(x.client_id!=null?2:0)+(x.dc_id!=null?1:0);
        if(sc>bs||(sc===bs&&best&&String(x.updated_at)>String(best.updated_at))){best=x;bs=sc;}
      });
      return best||fallback;
    }catch(e){return fallback;}
  }
  async function logPrint(supa,o){try{await supa.from('print_log').insert({user_id:o.userId||null,doc_type:o.type,doc_id:o.docId==null?null:String(o.docId),doc_number:o.number||null,template_id:o.tpl.id,template_version:o.tpl.version,copies:o.copies||1,dc_id:o.dcId==null?null:o.dcId});}catch(e){}}

  function openWin(){var w=window.open('','_blank');if(!w){alert('Prohlížeč zablokoval okno pro tisk. Povol vyskakovací okna pro tuto stránku.');return null;}
    w.document.open();w.document.write('<p style="font-family:Arial;padding:20px">Připravuji tisk…</p>');w.document.close();return w;}
  function show(w,html){w.document.open();w.document.write(html);w.document.close();}
  function ensureQr(body){
    if(!/\{\{\s*qr\s/.test(body)||typeof window.qrcode==='function')return Promise.resolve();
    return new Promise(function(res){var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';s.onload=res;s.onerror=res;document.head.appendChild(s);});
  }

  async function printDocument(supa,type,id,opts){
    opts=opts||{};var w=openWin();if(!w)return false;
    try{
      var t=typeInfo(type),ctx=t.src==='receipt'?await loadReceipt(supa,id):await loadDelivery(supa,id,type);
      var tpl=await resolveTemplate(supa,type,ctx._meta.dc_id,ctx._meta.client_id);
      await ensureQr(tpl.body);
      ctx.title=t.l;ctx.now=new Date().toISOString();ctx.user=opts.user||'';
      var copies=Math.max(1,parseInt(opts.copies,10)||1),pages=[],html=render(tpl.body,ctx);
      for(var i=0;i<copies;i++)pages.push(html);
      show(w,wrapHtml(t.l+' '+ctx.doc.number,pages,tpl.paper,tpl.margin_mm,true));
      logPrint(supa,{userId:opts.userId,type:type,docId:id,number:ctx.doc.number,tpl:tpl,copies:copies,dcId:ctx._meta.dc_id});
      return true;
    }catch(e){show(w,'<p style="font-family:Arial;padding:20px;color:#b00">Tisk se nepodařil: '+esc(e.message||e)+'</p>');return false;}
  }
  async function printLabels(supa,type,list,opts){
    opts=opts||{};if(!list||!list.length)return false;var w=openWin();if(!w)return false;
    try{
      var t=typeInfo(type),dcId=opts.dcId==null?null:opts.dcId;
      var tpl=await resolveTemplate(supa,type,dcId,opts.clientId==null?null:opts.clientId);
      await ensureQr(tpl.body);
      var pages=list.map(function(c){return render(tpl.body,c);});
      show(w,wrapHtml(t.l,pages,tpl.paper,tpl.margin_mm,true));
      logPrint(supa,{userId:opts.userId,type:type,docId:null,number:list.length+' ks',tpl:tpl,copies:list.length,dcId:dcId});
      return true;
    }catch(e){show(w,'<p style="font-family:Arial;padding:20px;color:#b00">Tisk se nepodařil: '+esc(e.message||e)+'</p>');return false;}
  }

  var root=typeof window!=='undefined'?window:globalThis;
  root.PRG_PRINT={TYPES:TYPES,typeInfo:typeInfo,builtin:function(k){return BUILTIN[k]||'';},render:render,validate:validate,sampleCtx:sampleCtx,pageCss:pageCss,wrapHtml:wrapHtml,
    code128Codes:code128Codes,code128Svg:code128Svg,sscc:sscc,printDocument:printDocument,printLabels:printLabels,resolveTemplate:resolveTemplate,_loadDelivery:loadDelivery,_loadReceipt:loadReceipt};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PRG_PRINT;
})();
