/* PRG WMS - import prijmu a vydeju pres XLSX sablonu (sdileny modul)
   Pouziti na strance Prijmy / Vydeje (po prihlaseni):
     PRG_DOCIMPORT.attach({kind:'receipt'|'delivery', supa:supa, user:function(){return currentUser;}, reload:load});
   Doklady se zakladaji jako PLAN (prijem = koncept, vydej = novy). Na sklad se nic neuctuje.
   Vyzaduje XLSX (SheetJS) a sloupce z docs_plan_setup.sql. */
(function(){
  var SPECS={
    receipt:{
      title:'Příjmy', file:'sablona_prijmy.xlsx', numPrefix:'PRI-', table:'receipts', itemTable:'receipt_items', fk:'receipt_id', numCol:'receipt_number',
      cols:[
        {k:'doc',  l:'Číslo dokladu',     al:['doklad','document','docno','receipt','receiptno','cisloprijmu'], d:'Číslo příjmového dokladu. Řádky se stejným číslem tvoří jeden doklad. Prázdné = číslo se vygeneruje.'},
        {k:'dc',   l:'DC',                al:['sklad','warehouse','distribucnicentrum'], d:'Kód DC (např. DC29). Prázdné = právě zvolené DC.'},
        {k:'client',l:'Klient',           al:['customer','zakaznik'], d:'Název klienta přesně jako v modulu Klienti. Může být prázdné.'},
        {k:'supplier',l:'Dodavatel',      al:['supplier','vendor'], d:'Dodavatel / odesílatel.'},
        {k:'eta',  l:'Plánovaný příjezd', al:['prijezd','eta','arrival','planovanyprijezd','datumcas','planovanyprijem','datum'], d:'Datum a čas příjezdu (např. 12.10.2026 8:30). Simulátor z toho určí čas příjezdu.'},
        {k:'sku',  l:'SKU',               al:['skuno','sku_no','artikl','material'], req:true, d:'Kód zboží. Povinné.'},
        {k:'ean',  l:'EAN',               al:['barcode','carovykod'], d:'EAN kód. Prázdné = vezme se z karty zboží.'},
        {k:'qty',  l:'Množství',          al:['quantity','qty','kusy','pocetks','units','mnozstvi'], req:true, d:'Počet kusů, celé číslo > 0. Povinné.'},
        {k:'lot',  l:'LOT',               al:['sarze','batch'], d:'Číslo šarže.'},
        {k:'pallets',l:'Počet palet',     al:['palety','pallets','pocetpalet'], d:'Kolik palet řádek představuje (celé číslo). Simulátor z toho určí počet palet na příjmu.'},
        {k:'ptype',l:'Typ palety',        al:['typpalety','pallettype','paleta'], d:'Typ palety (např. EUR, A, B, C ...).'},
        {k:'price',l:'Cena',              al:['price','jednotkovacena','cenakus'], d:'Jednotková cena (nepovinné).'},
        {k:'note', l:'Poznámka',          al:['note','poznamky','komentar'], d:'Poznámka k dokladu nebo řádku.'}
      ],
      example:[
        ['PRI-2026-001','DC29','Klient A','Dodavatel 1','@+1d 08:30','SKU-1001','8590000000011',480,'LOT2410',2,'EUR','','První řádek dokladu'],
        ['PRI-2026-001','DC29','Klient A','Dodavatel 1','@+1d 08:30','SKU-1002','8590000000028',240,'',1,'EUR','',''],
        ['PRI-2026-002','DC29','Klient B','Dodavatel 2','@+1d 13:00','SKU-2001','',1200,'LOT77',4,'A','','']
      ]
    },
    delivery:{
      title:'Výdeje', file:'sablona_vydeje.xlsx', numPrefix:'VYD-', table:'deliveries', itemTable:'delivery_items', fk:'delivery_id', numCol:'delivery_number',
      cols:[
        {k:'doc',  l:'Číslo dokladu',     al:['doklad','document','docno','delivery','cislovydeje'], d:'Číslo výdejového dokladu. Řádky se stejným číslem tvoří jeden doklad. Prázdné = číslo se vygeneruje.'},
        {k:'dc',   l:'DC',                al:['sklad','warehouse','distribucnicentrum'], d:'Kód DC (např. DC29). Prázdné = právě zvolené DC.'},
        {k:'client',l:'Klient',           al:['customer','zakaznik'], d:'Název klienta přesně jako v modulu Klienti. Může být prázdné.'},
        {k:'planned',l:'Plánovaný výdej', al:['planovanypick','pick','planned','planovanycas','datumcas','datum','vydej'], d:'Datum a čas, kdy se má zboží vychystat / odeslat (např. 12.10.2026 14:00).'},
        {k:'priority',l:'Priorita',       al:['priority','dulezitost'], d:'vysoká / normální / nízká (prázdné = normální).'},
        {k:'special',l:'Zvláštní stav',   al:['specialstatus','special','stav'], d:'předobjednávka / hold (prázdné = žádný).'},
        {k:'sku',  l:'SKU',               al:['skuno','artikl','material'], req:true, d:'Kód zboží. Povinné.'},
        {k:'ean',  l:'EAN',               al:['barcode','carovykod'], d:'EAN kód. Prázdné = vezme se z karty zboží.'},
        {k:'qty',  l:'Množství',          al:['quantity','qty','kusy','pocetks','units','mnozstvi'], req:true, d:'Počet kusů, celé číslo > 0. Povinné.'},
        {k:'lot',  l:'LOT',               al:['sarze','batch'], d:'Číslo šarže.'},
        {k:'loc',  l:'Lokace pickování',  al:['lokace','location','pickloc','picklokace','locationcode'], d:'Kód lokace, odkud se bere (např. R12P05L02BA). Prázdné = určí se automaticky.'},
        {k:'full', l:'Celá paleta',       al:['fullpallet','cela','celapaleta','palletpick'], d:'ANO = vyskladnění celé palety, NE / prázdné = kusový pick.'},
        {k:'note', l:'Poznámka',          al:['note','poznamky','komentar'], d:'Poznámka k dokladu nebo řádku.'}
      ],
      example:[
        ['VYD-2026-001','DC29','Klient A','@+1d 10:00','normální','','SKU-1001','8590000000011',48,'','R12P05L02BA','NE','Kusový pick'],
        ['VYD-2026-001','DC29','Klient A','@+1d 10:00','normální','','SKU-1002','8590000000028',240,'','R12P06L01BA','ANO','Celá paleta'],
        ['VYD-2026-002','DC29','Klient B','@+1d 15:30','vysoká','','SKU-2001','',600,'LOT77','','NE','']
      ]
    }
  };

  var XL=function(){return window.XLSX;};
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function norm(s){return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');}
  function sid(v){return v==null?'':String(v);}
  function pad(n){return n<10?'0'+n:''+n;}
  function fmtDt(d){return d?pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes()):'';}

  /* datum a cas: excelove cislo, Date, nebo text */
  function parseDt(v){
    if(v===''||v==null)return {empty:true};
    var d=null;
    if(typeof v==='number'){
      var ms=Math.round((v-25569)*86400000/60000)*60000, u=new Date(ms);
      d=new Date(u.getUTCFullYear(),u.getUTCMonth(),u.getUTCDate(),u.getUTCHours(),u.getUTCMinutes());
    }else if(v instanceof Date){d=new Date(v.getTime());}
    else{
      var s=String(v).trim(),m;
      if((m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/))) d=new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0));
      else if((m=s.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/))) d=new Date(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0));
    }
    if(!d||isNaN(d.getTime()))return {bad:true};
    return {date:d};
  }
  function parseInt0(v){
    if(v===''||v==null)return {empty:true};
    var n=typeof v==='number'?v:parseFloat(String(v).replace(/\s/g,'').replace(',','.'));
    if(isNaN(n))return {bad:true};
    return {n:n};
  }
  function parseBool(v){
    var s=norm(v);if(s==='')return {empty:true};
    if(['ano','a','yes','y','true','1','x'].indexOf(s)!==-1)return {b:true};
    if(['ne','n','no','false','0'].indexOf(s)!==-1)return {b:false};
    return {bad:true};
  }
  function parsePriority(v){
    var s=norm(v);if(s==='')return {empty:true};
    if(['vysoka','high','urgent','1'].indexOf(s)!==-1)return {v:'high'};
    if(['normalni','normal','2','stredni','medium'].indexOf(s)!==-1)return {v:'normal'};
    if(['nizka','low','3'].indexOf(s)!==-1)return {v:'low'};
    return {bad:true};
  }
  function parseSpecial(v){
    var s=norm(v);if(s===''||s==='zadny'||s==='none')return {empty:true};
    if(['preorder','predobjednavka'].indexOf(s)!==-1)return {v:'preorder'};
    if(['hold','pozastaveno','pozdrzeno'].indexOf(s)!==-1)return {v:'hold'};
    return {bad:true};
  }

  /* ---------- sablona ---------- */
  function serialFromNow(addDays,h,m){
    var n=new Date();n.setDate(n.getDate()+addDays);
    return Date.UTC(n.getFullYear(),n.getMonth(),n.getDate(),h,m)/86400000+25569;
  }
  function downloadTemplate(kind){
    var X=XL();if(!X){alert('Knihovna XLSX se nenačetla.');return;}
    var sp=SPECS[kind];
    var wb=X.utils.book_new();
    var aoa=[sp.cols.map(function(c){return c.l;})];
    var dtIdx=sp.cols.map(function(c){return c.k;}).indexOf(kind==='receipt'?'eta':'planned');
    sp.example.forEach(function(r){aoa.push(r.slice());});
    var ws=X.utils.aoa_to_sheet(aoa);
    sp.example.forEach(function(r,i){
      var raw=r[dtIdx];
      if(typeof raw==='string'&&raw.charAt(0)==='@'){
        var hm=raw.split(' ')[1].split(':');
        var ref=X.utils.encode_cell({r:i+1,c:dtIdx});
        ws[ref]={t:'n',v:serialFromNow(1,+hm[0],+hm[1]),z:'dd.mm.yyyy hh:mm'};
      }
    });
    ws['!cols']=sp.cols.map(function(c){return {wch:Math.max(14,c.l.length+4)};});
    X.utils.book_append_sheet(wb,ws,'Šablona');
    var help=[['Sloupec','Povinný','Popis']];
    sp.cols.forEach(function(c){help.push([c.l,c.req?'ANO':'ne',c.d]);});
    help.push([],['Poznámky'],
      ['Ukázkové řádky v listu Šablona před importem smaž nebo přepiš.'],
      ['Doklady se zakládají jako plán (příjem = koncept, výdej = nový), na sklad se nic neúčtuje.'],
      ['Řádky se stejným číslem dokladu patří do jednoho dokladu; údaje hlavičky se berou z prvního vyplněného řádku.'],
      ['Doklad s číslem, které už existuje, se přeskočí.']);
    var wh=X.utils.aoa_to_sheet(help);wh['!cols']=[{wch:22},{wch:10},{wch:100}];
    X.utils.book_append_sheet(wb,wh,'Návod');
    X.writeFile(wb,sp.file);
  }

  /* ---------- parsovani souboru ---------- */
  function parseSheet(kind,aoa,ctx){
    var sp=SPECS[kind],res={docs:[],fatal:null};
    var hi=-1,map=null;
    for(var i=0;i<Math.min(aoa.length,15);i++){
      var m=mapHeader(sp,aoa[i]);
      if(m.sku!=null&&m.qty!=null){hi=i;map=m;break;}
    }
    if(hi<0){res.fatal='Nenašel jsem hlavičku se sloupci SKU a Množství. Použij šablonu (tlačítko Šablona).';return res;}

    var groups={},order=[];
    for(var r=hi+1;r<aoa.length;r++){
      var row=aoa[r];
      var g=function(k){return map[k]==null?'':row[map[k]];};
      var txt=function(k){var v=g(k);return v==null?'':String(v).trim();};
      var any=false;for(var q=0;q<row.length;q++){if(String(row[q]==null?'':row[q]).trim()!==''){any=true;break;}}
      if(!any)continue;
      var line={row:r+1,errs:[],warns:[]};
      line.sku=txt('sku');line.ean=txt('ean');line.lot=txt('lot');line.note=txt('note');
      if(!line.sku)line.errs.push('chybí SKU');
      var qn=parseInt0(g('qty'));
      if(qn.empty||qn.bad||qn.n<=0||Math.round(qn.n)!==qn.n)line.errs.push('množství musí být celé číslo > 0');else line.qty=qn.n;
      var head={doc:txt('doc'),dc:txt('dc'),client:txt('client'),note:txt('note')};
      var key;
      if(kind==='receipt'){
        line.pallets=null;var pn=parseInt0(g('pallets'));
        if(pn.bad||(!pn.empty&&(pn.n<0||Math.round(pn.n)!==pn.n)))line.errs.push('počet palet musí být celé číslo ≥ 0');else if(!pn.empty)line.pallets=pn.n;
        line.ptype=txt('ptype');
        var pr=parseInt0(g('price'));
        if(pr.bad)line.errs.push('cena není číslo');else line.price=pr.empty?null:pr.n;
        head.supplier=txt('supplier');
        var et=parseDt(g('eta'));
        if(et.bad)line.errs.push('neplatné datum příjezdu');else head.when=et.date||null;
        key=head.doc||('~'+head.dc+'|'+head.client+'|'+head.supplier+'|'+(head.when?head.when.getTime():''));
      }else{
        line.loc=txt('loc').toUpperCase();
        var fb=parseBool(g('full'));
        if(fb.bad)line.errs.push('Celá paleta: ANO nebo NE');else line.full=fb.empty?null:fb.b;
        var pt=parseDt(g('planned'));
        if(pt.bad)line.errs.push('neplatné datum výdeje');else head.when=pt.date||null;
        var pp=parsePriority(g('priority'));
        if(pp.bad)line.errs.push('priorita: vysoká / normální / nízká');else head.priority=pp.empty?null:pp.v;
        var sp2=parseSpecial(g('special'));
        if(sp2.bad)line.errs.push('zvláštní stav: předobjednávka / hold');else head.special=sp2.empty?null:sp2.v;
        key=head.doc||('~'+head.dc+'|'+head.client+'|'+(head.when?head.when.getTime():'')+'|'+(head.priority||''));
      }
      if(!groups[key]){groups[key]={key:key,head:head,lines:[],errs:[],warns:[]};order.push(key);}
      var gr=groups[key];
      /* hlavicka z prvniho vyplneneho radku */
      ['dc','client','supplier','when','priority','special'].forEach(function(f){if((gr.head[f]==null||gr.head[f]==='')&&head[f]!=null&&head[f]!=='')gr.head[f]=head[f];});
      gr.lines.push(line);
    }
    if(!order.length){res.fatal='V souboru nejsou žádné datové řádky.';return res;}

    var gen=0;
    order.forEach(function(k){
      var gr=groups[k],h=gr.head;
      gr.number=h.doc||(sp.numPrefix+Date.now()+'-'+(++gen));
      gr.generated=!h.doc;
      /* DC */
      var dc=null;
      if(h.dc){dc=ctx.dcs.filter(function(d){return norm(d.code)===norm(h.dc);})[0]||null;if(!dc)gr.errs.push('DC "'+h.dc+'" neexistuje nebo k němu nemáš přístup');}
      else if(ctx.curDc){dc=ctx.curDc;}
      else if(ctx.dcs.length===1){dc=ctx.dcs[0];}
      else gr.errs.push('chybí DC (vyplň sloupec DC nebo zvol DC nahoře)');
      gr.dc=dc;
      /* klient */
      gr.client=null;
      if(h.client){var cl=ctx.clients[h.client.toUpperCase()];if(cl)gr.client=cl;else gr.errs.push('klient "'+h.client+'" nenalezen');}
      gr.lines.forEach(function(l){if(l.errs.length)gr.errs.push('řádek '+l.row+': '+l.errs.join(', '));});
      if(ctx.existing[gr.number])gr.errs.push('doklad s tímto číslem už existuje');
      gr.total=gr.lines.reduce(function(a,l){return a+(l.qty||0);},0);
      gr.pallets=gr.lines.reduce(function(a,l){return a+(l.pallets||0);},0);
      res.docs.push(gr);
    });
    return res;
  }
  function mapHeader(sp,hrow){
    var m={};
    (hrow||[]).forEach(function(h,i){
      var n=norm(h);if(!n)return;
      sp.cols.forEach(function(c){
        if(m[c.k]!=null)return;
        var al=[norm(c.l),norm(c.k)].concat(c.al.map(norm));
        if(al.indexOf(n)!==-1)m[c.k]=i;
      });
    });
    return m;
  }

  /* ---------- UI + import ---------- */
  function attach(opt){
    var kind=opt.kind,sp=SPECS[kind],supa=opt.supa;
    var parsed=null,fileName='';
    var bar=document.querySelector('.topbar-actions');
    if(!bar||document.getElementById('di-open'))return;
    var st='background:#fff;color:var(--text,#222);border:1.5px solid var(--border,#dde);';
    var b1=document.createElement('button');b1.className='btn btn-sm';b1.style.cssText=st;b1.textContent='⬇ Šablona';b1.onclick=function(){downloadTemplate(kind);};
    var b2=document.createElement('button');b2.id='di-open';b2.className='btn btn-sm';b2.style.cssText=st;b2.textContent='⬆ Import';b2.onclick=openModal;
    bar.insertBefore(b2,bar.firstChild);bar.insertBefore(b1,bar.firstChild);

    var ov=document.createElement('div');
    ov.id='di-modal';ov.style.cssText='display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;align-items:center;justify-content:center;padding:14px;';
    ov.innerHTML='<div style="background:#fff;border-radius:12px;width:100%;max-width:880px;max-height:92vh;overflow:auto;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.3)">'
      +'<div style="display:flex;align-items:center;margin-bottom:6px"><h3 style="flex:1;font-size:18px;font-weight:700">Import: '+sp.title+' ze šablony</h3><button id="di-x" style="background:none;border:none;font-size:22px;cursor:pointer">&times;</button></div>'
      +'<p style="font-size:12.5px;color:#667;margin-bottom:12px">Doklady se založí jako plán ('+(kind==='receipt'?'koncept':'stav Nový')+'), na sklad se nic neúčtuje. Stáhni si šablonu tlačítkem „Šablona", vyplň a nahraj.</p>'
      +'<input type="file" id="di-file" accept=".xlsx,.xls,.csv" style="margin-bottom:10px">'
      +'<label style="display:block;font-size:13px;margin-bottom:10px"><input type="checkbox" id="di-mk" checked> Vytvořit chybějící karty SKU (Inventory) s nulovým stavem</label>'
      +'<div id="di-prev"></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button id="di-cancel" class="btn btn-sm" style="'+st+'">Zavřít</button><button id="di-go" class="btn btn-primary btn-sm" disabled>Importovat</button></div>'
      +'</div>';
    document.body.appendChild(ov);
    var $=function(id){return document.getElementById(id);};
    $('di-x').onclick=$('di-cancel').onclick=function(){ov.style.display='none';};
    $('di-file').onchange=onFile;
    $('di-go').onclick=runImport;

    function openModal(){parsed=null;$('di-file').value='';$('di-prev').innerHTML='';$('di-go').disabled=true;$('di-go').textContent='Importovat';ov.style.display='flex';}

    async function loadCtx(){
      var dcs=(window.PRG_DC&&PRG_DC.list())||[];
      var curDc=(window.PRG_DC&&PRG_DC.currentDc())||null;
      var clients={},from=0;
      while(true){
        var cr=await supa.from('clients').select('id,name').range(from,from+999);
        var d=(cr&&cr.data)||[];d.forEach(function(c){if(c.name)clients[String(c.name).trim().toUpperCase()]=c;});
        if(d.length<1000)break;from+=1000;
      }
      return {dcs:dcs,curDc:curDc,clients:clients,existing:{}};
    }
    async function loadExisting(ctx,nums){
      for(var i=0;i<nums.length;i+=200){
        var chunk=nums.slice(i,i+200);
        var r=await supa.from(sp.table).select(sp.numCol).in(sp.numCol,chunk);
        ((r&&r.data)||[]).forEach(function(x){ctx.existing[x[sp.numCol]]=true;});
      }
    }
    async function onFile(){
      var f=$('di-file').files[0];if(!f)return;
      fileName=f.name;
      $('di-prev').innerHTML='<div style="color:#667;font-size:13px">Čtu soubor…</div>';$('di-go').disabled=true;
      try{
        var X=XL();if(!X)throw new Error('Knihovna XLSX se nenačetla.');
        var buf=await f.arrayBuffer();
        var wb=X.read(buf,{type:'array'});
        var name=wb.SheetNames.filter(function(n){return norm(n)==='sablona';})[0]||wb.SheetNames[0];
        var aoa=X.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:''});
        var ctx=await loadCtx();
        /* nejdriv hruby parse kvuli cislum dokladu, pak kontrola duplicit */
        var pre=parseSheet(kind,aoa,ctx);
        if(pre.fatal){$('di-prev').innerHTML='<div style="color:#c0392b;font-size:13px">'+esc(pre.fatal)+'</div>';return;}
        await loadExisting(ctx,pre.docs.filter(function(d){return !d.generated;}).map(function(d){return d.number;}));
        parsed={res:parseSheet(kind,aoa,ctx),ctx:ctx};
        /* druhy parse generuje cisla znovu - zachovej cisla z prvniho, aby nesedely duplicity */
        renderPreview();
      }catch(e){$('di-prev').innerHTML='<div style="color:#c0392b;font-size:13px">Chyba: '+esc(e.message||e)+'</div>';}
    }
    function renderPreview(){
      var docs=parsed.res.docs,ok=docs.filter(function(d){return !d.errs.length;});
      var lines=ok.reduce(function(a,d){return a+d.lines.length;},0);
      var h='<div style="font-size:13px;margin-bottom:8px"><b>'+esc(fileName)+'</b>: '+docs.length+' dokladů, k importu <b style="color:#0a7c4e">'+ok.length+'</b> ('+lines+' řádků)'+(docs.length-ok.length?', s chybou <b style="color:#c0392b">'+(docs.length-ok.length)+'</b> (budou přeskočeny)':'')+'</div>';
      h+='<div style="overflow:auto;max-height:340px;border:1px solid #e2e6ed;border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="background:#f4f6f9;text-align:left"><th style="padding:6px 8px">Doklad</th><th style="padding:6px 8px">DC</th><th style="padding:6px 8px">Klient</th><th style="padding:6px 8px">'+(kind==='receipt'?'Příjezd':'Výdej')+'</th><th style="padding:6px 8px;text-align:right">Řádků</th><th style="padding:6px 8px;text-align:right">Ks</th>'+(kind==='receipt'?'<th style="padding:6px 8px;text-align:right">Palet</th>':'')+'<th style="padding:6px 8px">Stav</th></tr></thead><tbody>';
      docs.forEach(function(d){
        h+='<tr style="border-top:1px solid #eef0f4"><td style="padding:6px 8px">'+esc(d.number)+(d.generated?' <i style="color:#889">(vygenerováno)</i>':'')+'</td><td style="padding:6px 8px">'+esc(d.dc?d.dc.code:'–')+'</td><td style="padding:6px 8px">'+esc(d.client?d.client.name:'–')+'</td><td style="padding:6px 8px">'+esc(fmtDt(d.head.when)||'–')+'</td><td style="padding:6px 8px;text-align:right">'+d.lines.length+'</td><td style="padding:6px 8px;text-align:right">'+d.total+'</td>'+(kind==='receipt'?'<td style="padding:6px 8px;text-align:right">'+d.pallets+'</td>':'')
          +'<td style="padding:6px 8px;color:'+(d.errs.length?'#c0392b':'#0a7c4e')+'">'+(d.errs.length?esc(d.errs.slice(0,3).join('; '))+(d.errs.length>3?' …(+'+(d.errs.length-3)+')':''):'OK')+'</td></tr>';
      });
      h+='</tbody></table></div>';
      $('di-prev').innerHTML=h;
      $('di-go').disabled=!ok.length;
      $('di-go').textContent=ok.length?'Importovat '+ok.length+' dokladů':'Importovat';
    }

    /* ---- zapis ---- */
    async function loadSkuMap(){
      var map={},from=0;
      while(true){
        var r=await supa.from('stock_items').select('id,sku,ean,client_id,warehouse_id').range(from,from+999);
        var d=(r&&r.data)||[];
        d.forEach(function(s){var k=String(s.sku||'').trim().toUpperCase();if(!k)return;(map[k]=map[k]||[]).push(s);});
        if(d.length<1000)break;from+=1000;
      }
      return map;
    }
    function pickSku(map,sku,doc){
      var l=map[sku.toUpperCase()];if(!l||!l.length)return null;
      var cid=doc.client?sid(doc.client.id):'',wid=doc.dc?sid(doc.dc.id):'';
      var best=l.filter(function(s){return cid&&sid(s.client_id)===cid&&sid(s.warehouse_id)===wid;})[0]
        ||l.filter(function(s){return cid&&sid(s.client_id)===cid;})[0]
        ||l.filter(function(s){return sid(s.warehouse_id)===wid;})[0]
        ||l[0];
      return best;
    }
    async function runImport(){
      var btn=$('di-go');btn.disabled=true;
      var ok=parsed.res.docs.filter(function(d){return !d.errs.length;});
      var mk=$('di-mk').checked,batch='imp-'+Date.now(),user=opt.user&&opt.user();
      var log=[],done=0,fail=0,created=0,noSku=0;
      try{
        btn.textContent='Připravuji SKU…';
        var map=await loadSkuMap();
        /* chybejici SKU */
        var missing={};
        ok.forEach(function(d){d.lines.forEach(function(l){if(!pickSku(map,l.sku,d)){var k=l.sku.toUpperCase()+'|'+(d.client?d.client.id:'')+'|'+d.dc.id;if(!missing[k])missing[k]={sku:l.sku,ean:l.ean||null,client_id:d.client?d.client.id:null,warehouse_id:d.dc.id,quantity:0};}});});
        var mkeys=Object.keys(missing);
        if(mkeys.length&&mk){
          for(var i=0;i<mkeys.length;i+=200){
            var rows=mkeys.slice(i,i+200).map(function(k){return missing[k];});
            var ir=await supa.from('stock_items').insert(rows).select('id,sku,ean,client_id,warehouse_id');
            if(ir.error)throw new Error('Vytvoření karet SKU selhalo: '+ir.error.message);
            (ir.data||[]).forEach(function(s){var k=String(s.sku).trim().toUpperCase();(map[k]=map[k]||[]).push(s);});
            created+=rows.length;
          }
        }
        for(var di=0;di<ok.length;di++){
          var d=ok[di];btn.textContent='Importuji '+(di+1)+' / '+ok.length+'…';
          var hdr;
          if(kind==='receipt'){
            hdr={receipt_number:d.number,supplier:d.head.supplier||null,warehouse_id:d.dc.id,client_id:d.client?d.client.id:null,note:d.head.note||null,status:'draft',created_by:user?user.id:null,expected_at:d.head.when?d.head.when.toISOString():null,import_batch:batch};
          }else{
            hdr={delivery_number:d.number,client_id:d.client?d.client.id:null,warehouse_id:d.dc.id,status:'new',special_status:d.head.special||null,note:d.head.note||null,created_by:user?user.id:null,planned_at:d.head.when?d.head.when.toISOString():null,priority:d.head.priority||null,import_batch:batch};
          }
          var hr=await supa.from(sp.table).insert(hdr).select().single();
          if(hr.error){fail++;log.push(d.number+': '+hr.error.message);if(/column|schema/i.test(hr.error.message)){log.push('→ Spusť SQL docs_plan_setup.sql.');break;}continue;}
          var id=hr.data.id;
          var items=d.lines.map(function(l){
            var si=pickSku(map,l.sku,d);
            if(!si)noSku++;
            var base={stock_item_id:si?si.id:null,sku:l.sku,ean:l.ean||(si&&si.ean)||null,quantity:l.qty,lot:l.lot||null,note:l.note||null};
            base[sp.fk]=id;
            if(kind==='receipt'){base.price=l.price;base.pallets=l.pallets;base.pallet_type=l.ptype||null;}
            else{base.location_code=l.loc||null;base.full_pallet=l.full;}
            return base;
          });
          var itr=await supa.from(sp.itemTable).insert(items);
          if(itr.error){
            await supa.from(sp.table).delete().eq('id',id);
            fail++;log.push(d.number+': '+itr.error.message);
            if(/column|schema/i.test(itr.error.message)){log.push('→ Spusť SQL docs_plan_setup.sql.');break;}
            continue;
          }
          done++;
        }
      }catch(e){log.push(String(e.message||e));fail++;}
      var h='<div style="font-size:14px;margin-bottom:6px">Hotovo: založeno <b style="color:#0a7c4e">'+done+'</b> dokladů'+(fail?', chyba u <b style="color:#c0392b">'+fail+'</b>':'')+'.'+(created?' Vytvořeno nových karet SKU: '+created+'.':'')+(noSku?' Řádků bez karty SKU: '+noSku+'.':'')+'</div>';
      if(log.length)h+='<div style="font-size:12.5px;color:#c0392b;max-height:160px;overflow:auto">'+log.map(esc).join('<br>')+'</div>';
      $('di-prev').innerHTML=h;btn.textContent='Importovat';btn.disabled=true;
      if(typeof opt.reload==='function')opt.reload();
    }
  }

  window.PRG_DOCIMPORT={attach:attach,_parseSheet:parseSheet,_parseDt:parseDt,_SPECS:SPECS};
})();
