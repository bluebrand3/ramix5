
// ===== Helpers & Storage =====
const STORAGE_DB='acct_db_pro', STORAGE_THEME='acct_theme', STORAGE_LOGO='acct_logo', STORAGE_FONT='acct_font';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const num=v=>isNaN(parseFloat(v))?0:parseFloat(v);
const uid=()=>Math.random().toString(36).slice(2);
const fmt=n=> new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(n||0);
const inRange=(d,from,to)=>{ if(!from&&!to) return true; const t=+new Date(d); if(from && t<+new Date(from)) return false; if(to && t>+new Date(to)) return false; return true; };

const defaultDB = {
  company:{name:'البرنامج المحاسبي', logo:''},
  branches:[{id:uid(), name:'الفرع الرئيسي'}],
  categories:[{id:uid(),name:'كهرباء'},{id:uid(),name:'ماء'},{id:uid(),name:'إيجار'},{id:uid(),name:'راتب'},{id:uid(),name:'مصروف موظف'}],
  employees:[], sales:[], expenses:[], suppliers:[], supplierTxns:[]
};
let db = (()=>{ try{return JSON.parse(localStorage.getItem(STORAGE_DB))||defaultDB;}catch(e){return defaultDB;} })();
const save=()=> localStorage.setItem(STORAGE_DB, JSON.stringify(db));

// ===== Theme & Font =====
(function(){
  const html=document.documentElement;
  const saved = localStorage.getItem(STORAGE_THEME);
  if(saved==='dark') html.classList.add('dark');
  $('#themeToggle')?.addEventListener('click', ()=>{
    html.classList.toggle('dark');
    localStorage.setItem(STORAGE_THEME, html.classList.contains('dark')?'dark':'light');
    if(window.chart) window.chart.update();
  });
  const f = localStorage.getItem(STORAGE_FONT); if(f) applyFontFace(f);
})();
function applyFontFace(fontName){
  const fam = encodeURIComponent(fontName||'Tajawal');
  $('#gfont')?.setAttribute('href', `https://fonts.googleapis.com/css2?family=${fam}:wght@400;600;700&display=swap`);
  document.body.style.fontFamily = `'${fontName||'Tajawal'}', system-ui, Segoe UI, Arial`;
}

// ===== Tabs =====
$$('.tab').forEach(b=> b.addEventListener('click', ()=>{
  const page=b.getAttribute('data-page');
  $$('.tab').forEach(x=>x.classList.remove('tab-active'));
  b.classList.add('tab-active');
  $$('.page').forEach(p=>p.classList.add('hidden'));
  $('#page-'+page).classList.remove('hidden');
}));

// ===== Header Sync =====
function syncCompanyHeader(){
  $('#companyName').textContent = db.company.name || 'البرنامج المحاسبي';
  const lg = localStorage.getItem(STORAGE_LOGO) || db.company.logo || '';
  if(lg) $('#companyLogo').src = lg;
}

// ===== Dashboard (KPIs + Chart) =====
let chart;
function renderDashboard(){
  const from=$('#homeFrom')?.value||'', to=$('#homeTo')?.value||'';
  const s = db.sales.filter(x=>inRange(x.date,from,to)).reduce((a,b)=>a+num(b.total),0);
  const e = db.expenses.filter(x=>inRange(x.date,from,to)).reduce((a,b)=>a+num(b.amount),0);
  $('#kpiSales').textContent = fmt(s)+' ر.س';
  $('#kpiExpenses').textContent = fmt(e)+' ر.س';
  const profit = s-e; const el = $('#kpiProfit'); el.textContent = fmt(profit)+' ر.س'; el.classList.toggle('text-emerald-500', profit>=0); el.classList.toggle('text-red-500', profit<0);

  const map=new Map();
  db.sales.filter(x=>inRange(x.date,from,to)).forEach(x=>{ const d=new Date(x.date); const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); if(!map.has(k)) map.set(k,{m:k,s:0,e:0}); map.get(k).s+=num(x.total); });
  db.expenses.filter(x=>inRange(x.date,from,to)).forEach(x=>{ const d=new Date(x.date); const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); if(!map.has(k)) map.set(k,{m:k,s:0,e:0}); map.get(k).e+=num(x.amount); });
  const arr=[...map.values()].sort((a,b)=>a.m.localeCompare(b.m));
  const labels = arr.map(v=>v.m), sales = arr.map(v=>v.s), exps = arr.map(v=>v.e);

  const ctx = document.getElementById('mainChart');
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets:[{label:'المبيعات', data:sales},{label:'المصروفات', data:exps}] },
    options: { responsive:true, plugins:{legend:{display:true}}, scales:{x:{grid:{display:false}}, y:{beginAtZero:true}} }
  });
}
$('#homeFilter')?.addEventListener('click', renderDashboard);

// ===== Sales =====
function renderSales(){
  const t=$('#tblSales'); if(!t) return;
  const from=$('#saleFrom')?.value||'', to=$('#saleTo')?.value||'';
  const rows = db.sales.filter(s=>inRange(s.date,from,to)).map(s=>`
    <tr>
      <td>${s.date}</td><td>${fmt(s.total)}</td><td>${fmt(s.mada)}</td><td>${fmt(s.tamara)}</td><td>${fmt(s.tabby)}</td><td>${fmt(s.net)}</td>
      <td><button class="btn-primary" data-type="sale" data-id="${s.id}">تعديل</button></td>
      <td><button class="btn-secondary" data-del="sale" data-id="${s.id}">حذف</button></td>
    </tr>`).join('');
  t.innerHTML = `<thead><tr><th>التاريخ</th><th>الإجمالي</th><th>مدى</th><th>تمارا</th><th>تابي</th><th>الصافي</th><th>تعديل</th><th>حذف</th></tr></thead><tbody>${rows}</tbody>`;
}
function bindSales(){
  const total=$('#saleTotal'), mada=$('#saleMada'), tamara=$('#saleTamara'), tabby=$('#saleTabby'), net=$('#saleNet');
  const calc=()=> net.value=(num(total.value)-num(mada.value)-num(tamara.value)-num(tabby.value)).toFixed(2);
  [total,mada,tamara,tabby].forEach(el=>el?.addEventListener('input', calc)); calc();
  $('#btnAddSale')?.addEventListener('click', ()=>{
    const date=$('#saleDate'); if(!date.value || !total.value) return alert('أدخل التاريخ والإجمالي');
    const s={ id:uid(), date:date.value, total:num(total.value), mada:num(mada.value), tamara:num(tamara.value), tabby:num(tabby.value), net:num(net.value) };
    db.sales.unshift(s); save(); renderSales(); renderDashboard();
    total.value=mada.value=tamara.value=tabby.value=''; calc();
  });
  $('#saleFilterBtn')?.addEventListener('click', renderSales);
}

// ===== Expenses =====
function renderExpenses(){
  const t=$('#tblExpenses'); if(!t) return;
  const from=$('#expFrom')?.value||'', to=$('#expTo')?.value||'';
  const rows = db.expenses.filter(x=>inRange(x.date,from,to)).map(x=>`
    <tr>
      <td>${x.date}</td><td>${x.branch||''}</td><td>${x.category||''}</td><td>${fmt(x.amount)}</td><td>${x.method||''}</td>
      <td><button class="btn-primary" data-type="exp" data-id="${x.id}">تعديل</button></td>
      <td><button class="btn-secondary" data-del="exp" data-id="${x.id}">حذف</button></td>
    </tr>`).join('');
  t.innerHTML = `<thead><tr><th>التاريخ</th><th>الفرع</th><th>الفئة</th><th>المبلغ</th><th>طريقة الدفع</th><th>تعديل</th><th>حذف</th></tr></thead><tbody>${rows}</tbody>`;
}
function bindExpenses(){
  $('#expCat')?.addEventListener('change', ()=>{
    const v=$('#expCat').value.trim(); const wrap=$('#empSelectWrap');
    if(v==='مصروف موظف' || v==='راتب'){ wrap.style.display='inline-flex'; const empSel=$('#expEmployee'); if(empSel){ empSel.innerHTML = db.employees.map(e=>`<option value='${e.id}'>${e.name}</option>`).join(''); } }
    else{ wrap.style.display='none'; }
  });
  $('#btnAddExpense')?.addEventListener('click', ()=>{
    const date=$('#expDate'), branch=$('#expBranch'), cat=$('#expCat'), method=$('#expMethod'), amt=$('#expAmount');
    if(!date.value || !cat.value) return alert('أدخل التاريخ والفئة');
    const category = cat.value.trim(); const amount = num(amt.value||0); if(!amount) return alert('أدخل المبلغ');
    let employeeId='';
    if(category==='مصروف موظف' || category==='راتب'){
      if(!db.employees.length) return alert('لا يوجد موظفون مضافون. أضف موظفًا أولاً.');
      employeeId = $('#expEmployee')?.value||''; if(!employeeId) return alert('اختر الموظف');
    }
    db.expenses.unshift({ id:uid(), date:date.value, branch:branch.value, category, amount, method:method.value, employeeId });
    save(); renderExpenses(); renderDashboard(); renderEmployees(); amt.value='';
  });
  $('#expFilterBtn')?.addEventListener('click', renderExpenses);
}

// ===== Employees =====
const sumEmp=(cat, empId, from, to)=> db.expenses.filter(x=>x.category===cat && x.employeeId===empId && inRange(x.date,from,to)).reduce((a,b)=>a+num(b.amount),0);
function renderEmployees(){
  const t=$('#tblEmployees'); if(!t) return;
  const from=$('#empFrom')?.value||'', to=$('#empTo')?.value||'';
  const rows = db.employees.map(e=>{
    const base=num(e.baseSalary||0), ded=sumEmp('مصروف موظف', e.id, from, to), paid=sumEmp('راتب', e.id, from, to), net=base-ded-paid;
    return `<tr>
      <td>${e.name}</td><td>${e.branch||''}</td><td>${fmt(base)}</td><td>${fmt(ded)}</td><td>${fmt(paid)}</td><td>${fmt(net)}</td>
      <td><button class="btn-primary" data-type="emp" data-id="${e.id}">تعديل</button></td>
      <td><button class="btn-secondary" data-del="emp" data-id="${e.id}">حذف</button></td>
    </tr>`;
  }).join('');
  t.innerHTML = `<thead><tr><th>الموظف</th><th>الفرع</th><th>الراتب الأساسي</th><th>الخصومات</th><th>المدفوع</th><th>الصافي المتبقي</th><th>تعديل</th><th>حذف</th></tr></thead><tbody>${rows}</tbody>`;
}
function bindEmployees(){
  $('#btnAddEmp')?.addEventListener('click', ()=>{
    const name=$('#empName'), phone=$('#empPhone'), title=$('#empTitle'), sal=$('#empSalary'), br=$('#empBranch'), hire=$('#empHire');
    if(!name.value) return alert('أدخل اسم الموظف');
    db.employees.unshift({ id:uid(), name:name.value, phone:phone.value, title:title.value, baseSalary:num(sal.value), branch:br.value, hireDate:hire.value });
    save(); renderEmployees(); renderRefs();
    name.value=phone.value=title.value=sal.value=br.value='';
  });
  $('#empFilterBtn')?.addEventListener('click', renderEmployees);
}

// ===== Suppliers =====
function supplierBalance(id, from, to){
  const tx=db.supplierTxns.filter(x=>x.supplierId===id && inRange(x.date,from,to));
  const inv=tx.filter(x=>x.type==='invoice').reduce((a,b)=>a+num(b.amount),0);
  const pay=tx.filter(x=>x.type==='payment').reduce((a,b)=>a+num(b.amount),0);
  return inv - pay;
}
function renderSuppliers(){
  const from=$('#supFrom')?.value||'', to=$('#supTo')?.value||'';
  const wrap=$('#supplierSummary');
  if(wrap){
    let html='';
    for(const s of db.suppliers){
      const bal=supplierBalance(s.id, from, to);
      const color= bal>0 ? 'text-red-600' : 'text-emerald-600';
      html += `<div class="card"><div class="font-bold">${s.name}</div><div class="muted">الرصيد الدائن</div><div class="text-xl font-extrabold ${color}">${fmt(bal)} ر.س</div></div>`;
    }
    wrap.innerHTML = html || `<div class="muted">لا يوجد موردون.</div>`;
  }
  const t=$('#tblSupplierTx'); if(!t) return;
  const rows=db.supplierTxns.filter(x=>inRange(x.date,from,to)).map(x=>{
    const sup=db.suppliers.find(s=>s.id===x.supplierId); const name=sup?sup.name:'';
    const typeTxt=x.type==='invoice'?'فاتورة (+)':'دفعة (-)';
    return `<tr>
      <td>${x.date}</td><td>${typeTxt}</td><td>${fmt(x.amount)}</td><td>${name}</td>
      <td><button class="btn-primary" data-type="suptx" data-id="${x.id}">تعديل</button>
          <button class="btn-secondary" data-del="suptx" data-id="${x.id}">حذف</button></td>
    </tr>`;
  }).join('');
  t.innerHTML = `<thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>المورد</th><th>إجراءات</th></tr></thead><tbody>${rows}</tbody>`;
}
function bindSuppliers(){
  $('#btnAddSupplier')?.addEventListener('click', ()=>{
    const name=$('#supName'), phone=$('#supPhone');
    if(!name.value) return alert('أدخل اسم المورد');
    const sup={id:uid(), name:name.value, phone:phone.value};
    db.suppliers.unshift(sup); save(); name.value=phone.value='';
    const type=prompt('نوع الحركة: اكتب invoice للفواتير أو payment للدفعات')||'invoice';
    const date=new Date().toISOString().slice(0,10); const amount=num(prompt('المبلغ؟')||0);
    db.supplierTxns.unshift({ id:uid(), supplierId:sup.id, type, date, amount }); save(); renderSuppliers(); renderDashboard();
  });
  $('#supFilterBtn')?.addEventListener('click', renderSuppliers);
}

// ===== Settings =====
function renderRefs(){
  const tbB=$('#tblBranches'); if(tbB){
    const rows = db.branches.map(b=>`<tr><td>${b.name}</td><td><button class="btn-secondary" data-del="branch" data-id="${b.id}">حذف</button></td></tr>`).join('');
    tbB.innerHTML = `<thead><tr><th>الفرع</th><th>حذف</th></tr></thead><tbody>${rows}</tbody>`;
  }
  const tbC=$('#tblCats'); if(tbC){
    const rows = db.categories.map(c=>`<tr><td>${c.name}</td><td><button class="btn-secondary" data-del="cat" data-id="${c.id}">حذف</button></td></tr>`).join('');
    tbC.innerHTML = `<thead><tr><th>الفئة</th><th>حذف</th></tr></thead><tbody>${rows}</tbody>`;
  }
  const brSel=$('#expBranch'); if(brSel){ brSel.innerHTML = db.branches.map(b=>`<option>${b.name}</option>`).join(''); }
  const catSel=$('#expCat'); if(catSel){ catSel.innerHTML = db.categories.map(c=>`<option>${c.name}</option>`).join(''); }
}
function bindSettings(){
  $('#companyNameInput')?.addEventListener('input', e=>{ db.company.name=e.target.value; save(); syncCompanyHeader(); });
  $('#logoInput')?.addEventListener('change', e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=()=>{ localStorage.setItem(STORAGE_LOGO, r.result); db.company.logo=r.result; save(); $('#companyLogo').src=r.result; };
    r.readAsDataURL(f);
  });
  $('#btnAddBranch')?.addEventListener('click', ()=>{ const v=$('#branchName').value.trim(); if(!v) return; db.branches.unshift({id:uid(), name:v}); save(); $('#branchName').value=''; renderRefs(); });
  $('#btnAddCat')?.addEventListener('click', ()=>{ const v=$('#catName').value.trim(); if(!v) return; db.categories.unshift({id:uid(), name:v}); save(); $('#catName').value=''; renderRefs(); });
  $('#btnExportBackup')?.addEventListener('click', ()=>{
    const blob=new Blob([JSON.stringify(db)], {type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    const ts=new Date().toISOString().slice(0,19).replace(/[T:]/g,'-');
    a.href=url; a.download=`backup_${ts}.json`; a.click(); URL.revokeObjectURL(url);
  });
  $('#btnImportBackup')?.addEventListener('change', e=>{
    const f=e.target.files?.[0]; if(!f) return; const r=new FileReader();
    r.onload=()=>{ try{ db=JSON.parse(r.result); save(); location.reload(); }catch(err){ alert('ملف غير صالح'); } };
    r.readAsText(f);
  });
  $('#applyFont')?.addEventListener('click', ()=>{
    const font = $('#fontSelect').value || 'Tajawal';
    localStorage.setItem(STORAGE_FONT, font); applyFontFace(font);
  });

  // GitHub helpers
  ghLoad();
  $('#btnGhSave')?.addEventListener('click', ghSave);
  $('#btnGhTest')?.addEventListener('click', ghTest);
  $('#btnGhBackup')?.addEventListener('click', ghUploadBackup);
  $('#btnGhUploadFile')?.addEventListener('click', ()=> ghUploadSelectedFile($('#ghFile').files[0]));
}

// ===== Export/Print =====
function tableToXLSX(tableId, filename='export.xlsx'){
  const table=document.getElementById(tableId); if(!table) return;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table, {raw:true});
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}
function printTable(tableId){
  const table=document.getElementById(tableId); if(!table) return;
  const w=window.open('','_blank');
  w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>طباعة</title></head><body>'+table.outerHTML+'<script>window.print()<\\/script></body></html>');
  w.document.close();
}
$('#exportSales')?.addEventListener('click', ()=> tableToXLSX('tblSales','سجل_المبيعات.xlsx'));
$('#printSales')?.addEventListener('click', ()=> printTable('tblSales'));
$('#exportExpenses')?.addEventListener('click', ()=> tableToXLSX('tblExpenses','سجل_المصروفات.xlsx'));
$('#printExpenses')?.addEventListener('click', ()=> printTable('tblExpenses'));
$('#exportEmployees')?.addEventListener('click', ()=> tableToXLSX('tblEmployees','رواتب_الموظفين.xlsx'));
$('#exportSup')?.addEventListener('click', ()=> tableToXLSX('tblSupplierTx','بيان_الموردين.xlsx'));
$('#printSup')?.addEventListener('click', ()=> printTable('tblSupplierTx'));

// ===== Global edit/delete =====
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  const del = btn.getAttribute('data-del'); const id=btn.getAttribute('data-id'); const type=btn.getAttribute('data-type');
  if(del && id){
    if(!confirm('تأكيد الحذف؟')) return;
    if(del==='sale') db.sales=db.sales.filter(x=>x.id!==id);
    if(del==='exp') db.expenses=db.expenses.filter(x=>x.id!==id);
    if(del==='emp') db.employees=db.employees.filter(x=>x.id!==id);
    if(del==='suptx') db.supplierTxns=db.supplierTxns.filter(x=>x.id!==id);
    if(del==='branch') db.branches=db.branches.filter(x=>x.id!==id);
    if(del==='cat') db.categories=db.categories.filter(x=>x.id!==id);
    save(); renderAll(); renderRefs(); renderDashboard();
  }
  if(type && id){
    let obj, schema=[];
    if(type==='sale'){ obj=db.sales.find(x=>x.id===id); schema=[['التاريخ','date'],['الإجمالي','total'],['مدى','mada'],['تمارا','tamara'],['تابي','tabby']]; }
    if(type==='exp'){ obj=db.expenses.find(x=>x.id===id); schema=[['التاريخ','date'],['الفرع','branch'],['الفئة','category'],['المبلغ','amount'],['طريقة الدفع','method'],['موظف','employeeId']]; }
    if(type==='emp'){ obj=db.employees.find(x=>x.id===id); schema=[['الاسم','name'],['الجوال','phone'],['الوظيفة','title'],['الراتب','baseSalary'],['الفرع','branch'],['تاريخ التعيين','hireDate']]; }
    if(type==='suptx'){ obj=db.supplierTxns.find(x=>x.id===id); schema=[['التاريخ','date'],['النوع','type'],['المبلغ','amount']]; }
    if(!obj) return;
    const html = schema.map(([label,key])=>`
      <label style='display:flex;gap:8px;align-items:center;justify-content:space-between;margin:8px 0'>${label}<input id='f_${key}' class='input' style='flex:1' value='${(obj[key]??'').toString().replace(/"/g,'&quot;')}'></label>`).join('');
    const w=window.open('','_blank');
    w.document.write(`<html dir='rtl'><head><meta charset='utf-8'><title>تعديل</title></head><body><h3>تعديل السجل</h3>${html}<button id='ok'>تأكيد</button><script>document.getElementById('ok').onclick=function(){window.opener.postMessage({id:'${id}',type:'${type}',values:[${schema.map(([_,k])=>"`"+k+"`").join(',')}]},'*');window.close();}</script></body></html>`);
    w.document.close();
  }
});
window.addEventListener('message',(e)=>{
  const {id,type,values}=e.data||{}; if(!id||!type||!values) return;
  let obj=null; if(type==='sale') obj=db.sales.find(x=>x.id===id);
  if(type==='exp') obj=db.expenses.find(x=>x.id===id);
  if(type==='emp') obj=db.employees.find(x=>x.id===id);
  if(type==='suptx') obj=db.supplierTxns.find(x=>x.id===id);
  if(!obj) return;
  values.forEach(k=>{ const v=prompt('قيمة جديدة لـ '+k, obj[k]??''); if(v!==null){ obj[k]=['amount','total','baseSalary','mada','tamara','tabby'].includes(k)?num(v):v; } });
  if(type==='sale') obj.net=num(obj.total)-num(obj.mada)-num(obj.tamara)-num(obj.tabby);
  save(); renderAll(); renderRefs(); renderDashboard();
});

// ===== GitHub Upload Helpers =====
const GH_KEYS = { owner:'gh_owner', repo:'gh_repo', branch:'gh_branch', path:'gh_path', token:'gh_token', remember:'gh_remember' };
function ghSetStatus(msg){ const el=$('#ghStatus'); if(el){ el.textContent = msg; } }
function ghLoad(){
  $('#ghOwner').value = localStorage.getItem(GH_KEYS.owner)||'';
  $('#ghRepo').value  = localStorage.getItem(GH_KEYS.repo)||'';
  $('#ghBranch').value= localStorage.getItem(GH_KEYS.branch)||'main';
  $('#ghPath').value  = localStorage.getItem(GH_KEYS.path)||'backups';
  const remember = localStorage.getItem(GH_KEYS.remember)==='1';
  $('#ghRemember').checked = remember;
  $('#ghToken').value = remember ? (localStorage.getItem(GH_KEYS.token)||'') : '';
}
function ghSave(){
  localStorage.setItem(GH_KEYS.owner, $('#ghOwner').value.trim());
  localStorage.setItem(GH_KEYS.repo,  $('#ghRepo').value.trim());
  localStorage.setItem(GH_KEYS.branch,$('#ghBranch').value.trim()||'main');
  localStorage.setItem(GH_KEYS.path,  $('#ghPath').value.trim()||'backups');
  if($('#ghRemember').checked){
    localStorage.setItem(GH_KEYS.token, $('#ghToken').value.trim());
    localStorage.setItem(GH_KEYS.remember, '1');
  }else{
    localStorage.removeItem(GH_KEYS.token);
    localStorage.setItem(GH_KEYS.remember, '0');
  }
  ghSetStatus('تم حفظ الإعدادات.');
}
function ghCfg(){
  const owner=$('#ghOwner').value.trim();
  const repo=$('#ghRepo').value.trim();
  const branch=$('#ghBranch').value.trim()||'main';
  const path=$('#ghPath').value.trim()||'backups';
  const token=$('#ghToken').value.trim() || (localStorage.getItem(GH_KEYS.remember)==='1'?localStorage.getItem(GH_KEYS.token)||'':'');
  if(!owner||!repo||!branch||!path||!token){ alert('أكمل إعدادات GitHub (owner, repo, branch, path, token).'); return null; }
  return {owner, repo, branch, path, token};
}
async function ghApi(url, method='GET', token='', body=null){
  const res = await fetch(url, { method, headers: { 'Accept':'application/vnd.github+json', 'Authorization': 'token '+token }, body: body?JSON.stringify(body):null });
  const txt = await res.text();
  try{ return { ok: res.ok, status: res.status, json: JSON.parse(txt) }; } catch{ return { ok: res.ok, status: res.status, text: txt }; }
}
async function ghTest(){
  const cfg=ghCfg(); if(!cfg) return;
  const r = await ghApi(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, 'GET', cfg.token);
  ghSetStatus(r.ok? '✅ الاتصال ناجح. لديك صلاحية على المستودع.' : `❌ فشل الاتصال (${r.status}). تأكد من الإعدادات والصلاحيات.`);
}
function toBase64(str){ return btoa(unescape(encodeURIComponent(str))); }
async function ghGetSha(cfg, filepath){
  const r = await ghApi(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(filepath)}?ref=${cfg.branch}`, 'GET', cfg.token);
  if(r.ok && r.json && r.json.sha) return r.json.sha;
  return null;
}
async function ghPutFile(cfg, filepath, contentStr, message){
  const content = toBase64(contentStr);
  const currentSha = await ghGetSha(cfg, filepath);
  const body = { message, content, branch: cfg.branch };
  if(currentSha) body.sha = currentSha;
  const r = await ghApi(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(filepath)}`, 'PUT', cfg.token, body);
  return r;
}
async function ghUploadBackup(){
  const cfg=ghCfg(); if(!cfg) return;
  const ts=new Date().toISOString().slice(0,19).replace(/[T:]/g,'-');
  const filename = `${cfg.path.replace(/\/+$/,'')}/backup_${ts}.json`;
  const jsonStr = JSON.stringify(db, null, 2);
  ghSetStatus('⏳ جاري رفع النسخة الاحتياطية...');
  const r = await ghPutFile(cfg, filename, jsonStr, `Backup ${ts}`);
  ghSetStatus(r.ok ? '✅ تم الرفع إلى GitHub.' : `❌ فشل الرفع (${r.status}).`);
}
async function ghUploadSelectedFile(file){
  const cfg=ghCfg(); if(!cfg) return;
  if(!file){ alert('اختر ملفًا أولاً.'); return; }
  const reader = new FileReader();
  reader.onload = async () => {
    const contentStr = reader.result.split(',')[1] ? atob(reader.result.split(',')[1]) : reader.result;
    const ts=new Date().toISOString().slice(0,19).replace(/[T:]/g,'-');
    const filename = `${cfg.path.replace(/\/+$/,'')}/${ts}_${file.name}`;
    ghSetStatus('⏳ جاري رفع الملف...');
    const r = await ghPutFile(cfg, filename, contentStr, `Upload ${file.name}`);
    ghSetStatus(r.ok ? '✅ تم رفع الملف.' : `❌ فشل رفع الملف (${r.status}).`);
  };
  reader.readAsDataURL(file);
}

// ===== Init =====
function renderAll(){ renderSales(); renderExpenses(); renderEmployees(); renderSuppliers(); renderDashboard(); }
function bindAll(){ bindSales(); bindExpenses(); bindEmployees(); bindSuppliers(); bindSettings(); }
function renderRefsAndHeader(){ renderRefs(); syncCompanyHeader(); }
if(!db.branches) db.branches=[{id:uid(), name:'الفرع الرئيسي'}];
if(!db.categories) db.categories=[{id:uid(),name:'كهرباء'},{id:uid(),name:'ماء'},{id:uid(),name:'إيجار'},{id:uid(),name:'راتب'},{id:uid(),name:'مصروف موظف'}];
save();

bindAll(); renderAll(); renderRefsAndHeader();
