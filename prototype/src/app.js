/* =====================================================================
   JONIVOR — pet marketplace prototype
   Single-page app rendered into an iPhone 17 Pro Max frame.
   ===================================================================== */

/* ---------- icons: 24px grid, 1.75 stroke ---------- */
const P={
 home:'<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
 heart:'<path d="M12 19.5s-7.2-4.4-8.8-8.8C2 7.4 4 4.5 7 4.5c2 0 3.4 1.1 5 2.8 1.6-1.7 3-2.8 5-2.8 3 0 5 2.9 3.8 6.2-1.6 4.4-8.8 8.8-8.8 8.8z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 chat:'<path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4.5 19.5l1.3-4A7.5 7.5 0 1 1 20 11.5z"/>',
 user:'<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.9-3.6 3.6-5.5 7-5.5s6.1 1.9 7 5.5"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
 pin:'<path d="M12 21s6.5-5.7 6.5-11a6.5 6.5 0 0 0-13 0c0 5.3 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
 chev:'<path d="m7 10 5 5 5-5"/>', right:'<path d="m10 6 6 6-6 6"/>', back:'<path d="m15 5-7 7 7 7"/>', x:'<path d="M6 6l12 12M18 6 6 18"/>',
 sliders:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
 bell:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 21h4"/>',
 star:'<path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
 phone:'<path d="M6 4h3l1.5 4.5-2 1.2a10.5 10.5 0 0 0 5.8 5.8l1.2-2L20 15v3a2 2 0 0 1-2 2A15 15 0 0 1 4 6a2 2 0 0 1 2-2z"/>',
 shield:'<path d="M12 3.5 19 6v5.5c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6z"/><path d="m9 12 2 2 4-4"/>',
 flag:'<path d="M5.5 21V4.5M5.5 4.5h11l-2 4 2 4h-11"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 camera:'<path d="M4 8.5h3.2L9 6h6l1.8 2.5H20V19H4z"/><circle cx="12" cy="13.5" r="3.2"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.5 7.5 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4 1 2-3.5z"/>',
 card:'<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
 globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.8 2.6 2.8 14.4 0 17M12 3.5c-2.8 2.6-2.8 14.4 0 17"/>',
 help:'<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.5a2.4 2.4 0 1 1 3.3 2.2c-.6.3-1 .8-1 1.5M12 16.5h.01"/>',
 trend:'<path d="m4 16 5-5 3.5 3.5L20 7"/><path d="M15 7h5v5"/>',
 gift:'<rect x="4" y="9" width="16" height="4" rx="1"/><path d="M5.5 13v7h13v-7M12 9v11M12 9S9.5 9 8.6 7.3C7.8 5.8 9.8 4.3 12 7c2.2-2.7 4.2-1.2 3.4.3C14.5 9 12 9 12 9z"/>',
 logout:'<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
 paw:'<circle cx="7" cy="10" r="1.8"/><circle cx="17" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><path d="M12 12c-2.5 0-5 3-5 5.2 0 1.5 1.2 2.3 2.6 2.3 1 0 1.6-.5 2.4-.5s1.4.5 2.4.5c1.4 0 2.6-.8 2.6-2.3C17 15 14.5 12 12 12z"/>',
 moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
 share:'<path d="M12 15V4M8 8l4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>',
 send:'<path d="M5 12h13M13 6l6 6-6 6"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
 archive:'<rect x="3.5" y="4.5" width="17" height="4" rx="1"/><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 12h4"/>',
 eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
 more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
 image:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-5-5-9 8.5"/>',
 info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.5h.01"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 verified:'<path d="m12 3 2.2 1.6 2.7-.2.9 2.6 2.3 1.5-.8 2.6.8 2.6-2.3 1.5-.9 2.6-2.7-.2L12 21l-2.2-1.6-2.7.2-.9-2.6-2.3-1.5.8-2.6-.8-2.6 2.3-1.5.9-2.6 2.7.2z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
 doc:'<path d="M6.5 3.5h7.5l4 4v12.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4M9 12h6M9 15.5h6"/>',
 video:'<rect x="3.5" y="6" width="12" height="12" rx="2"/><path d="m15.5 10.5 5-3v9l-5-3"/>',
 play:'<path d="M8 5.5v13l10.5-6.5z"/>',
 map:'<path d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5z"/><path d="M9 4.5v13M15 6.5v13"/>',
 list:'<path d="M8 6.5h12M8 12h12M8 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01"/>',
 wallet:'<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11v3"/><rect x="4" y="8" width="16.5" height="11" rx="2"/><path d="M16 13.5h.01"/>',
 store:'<path d="M4 9.5 5.5 4.5h13L20 9.5"/><path d="M4 9.5c0 1.4 1.1 2.5 2.7 2.5s2.6-1.1 2.6-2.5c0 1.4 1.1 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1 2.5 2.6 2.5S20 10.9 20 9.5M5.5 12v7.5h13V12M10 19.5v-4h4v4"/>',
 bolt:'<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
 crown:'<path d="m4 8 4 4 4-6 4 6 4-4-1.5 10h-13z"/>',
 up:'<path d="M12 19V6M6 11l6-6 6 6"/>',
 bar:'<path d="M5 20v-8M12 20V5M19 20v-5M3 20h18"/>',
 bookmark:'<path d="M6.5 4h11v16.5L12 16.5l-5.5 4z"/>',
 vet:'<path d="M6 4v5a4 4 0 0 0 8 0V4"/><path d="M10 13v2.5a4.5 4.5 0 0 0 9 0V13"/><circle cx="19" cy="11" r="2"/>',
 scissors:'<circle cx="6.5" cy="6.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/><path d="M8.5 8 20 18M8.5 16 20 6"/>',
 target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
 bag:'<path d="M6 7.5h12l1 12.5H5z"/><path d="M9 7.5V6a3 3 0 0 1 6 0v1.5"/>',
 bone:'<path d="M8.5 15.5l7-7"/><circle cx="6" cy="15.5" r="2"/><circle cx="8.5" cy="18" r="2"/><circle cx="15.5" cy="6" r="2"/><circle cx="18" cy="8.5" r="2"/>',
 locate:'<path d="M20 4 4 11l7 2 2 7z"/>',
 alert:'<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5h.01"/>'
};
const ic=(n,s=22,o={})=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${o.fill?'currentColor':'none'}" stroke="${o.fill?'none':'currentColor'}" stroke-width="${o.w||1.75}" stroke-linecap="round" stroke-linejoin="round"${o.c?` style="color:${o.c}"`:''}>${P[n]}</svg>`;


/* =====================================================================
   BRAND — JONIVOR. Mark: a paw whose main pad is a heart ("jon" = soul, life).
   Wordmark: "JONIVOR" in Unbounded Bold, converted to outlines.
   ===================================================================== */
const LOGO_TOES='<ellipse cx="15.5" cy="27" rx="5.6" ry="7" transform="rotate(-24 15.5 27)"/><ellipse cx="25.6" cy="15.6" rx="5.8" ry="7.4" transform="rotate(-8 25.6 15.6)"/><ellipse cx="38.4" cy="15.6" rx="5.8" ry="7.4" transform="rotate(8 38.4 15.6)"/><ellipse cx="48.5" cy="27" rx="5.6" ry="7" transform="rotate(24 48.5 27)"/>';
const LOGO_HEART='M32 57C22.5 51 16 45.2 16 38.4 16 33.4 19.8 29.6 24.6 29.6 27.9 29.6 30.6 31.4 32 34.2 33.4 31.4 36.1 29.6 39.4 29.6 44.2 29.6 48 33.4 48 38.4 48 45.2 41.5 51 32 57Z';
const WORD_D='M18 381H221V406Q221 494 257.5 540.5Q294 587 379 587Q462 587 500.0 543.5Q538 500 538 422V0H745V433Q745 537 699.0 612.0Q653 687 571.0 726.5Q489 766 379 766Q271 766 189.5 725.0Q108 684 63.5 606.5Q19 529 19 422Z M1348 766Q1215 766 1114.5 717.0Q1014 668 958.5 580.0Q903 492 903 375Q903 258 958.5 170.0Q1014 82 1114.5 33.0Q1215 -16 1348 -16Q1482 -16 1582.0 33.0Q1682 82 1738.0 170.0Q1794 258 1794 375Q1794 492 1738.0 580.0Q1682 668 1582.0 717.0Q1482 766 1348 766ZM1348 581Q1421 581 1474.0 556.0Q1527 531 1555.5 485.0Q1584 439 1584 375Q1584 311 1555.5 265.0Q1527 219 1474.0 194.0Q1421 169 1348 169Q1276 169 1223.0 194.0Q1170 219 1141.0 265.0Q1112 311 1112 375Q1112 439 1141.0 485.0Q1170 531 1223.0 556.0Q1276 581 1348 581Z M2656 605 2592 618V0H2793V750H2532L2099 133L2162 120V750H1961V0H2229Z M2993 0H3200V750H2993Z M3844 657H3756L4045 0H4264L3915 750H3680L3331 0H3553Z M4807 766Q4674 766 4573.5 717.0Q4473 668 4417.5 580.0Q4362 492 4362 375Q4362 258 4417.5 170.0Q4473 82 4573.5 33.0Q4674 -16 4807 -16Q4941 -16 5041.0 33.0Q5141 82 5197.0 170.0Q5253 258 5253 375Q5253 492 5197.0 580.0Q5141 668 5041.0 717.0Q4941 766 4807 766ZM4807 581Q4880 581 4933.0 556.0Q4986 531 5014.5 485.0Q5043 439 5043 375Q5043 311 5014.5 265.0Q4986 219 4933.0 194.0Q4880 169 4807 169Q4735 169 4682.0 194.0Q4629 219 4600.0 265.0Q4571 311 4571 375Q4571 439 4600.0 485.0Q4629 531 4682.0 556.0Q4735 581 4807 581Z M5563 328H5836Q5886 328 5914.0 305.0Q5942 282 5942 241Q5942 199 5914.0 176.5Q5886 154 5836 154H5534L5627 55V750H5420V0H5865Q5951 0 6015.0 30.5Q6079 61 6115.0 114.5Q6151 168 6151 241Q6151 312 6115.0 366.0Q6079 420 6015.0 450.0Q5951 480 5865 480H5563ZM5675 399H5908L6177 750H5937Z';
const logoMark=(size,toes='currentColor',heart='var(--accent)')=>`<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><g fill="${toes}">${LOGO_TOES}</g><path d="${LOGO_HEART}" fill="${heart}"/></svg>`;
const wordmark=(h,color='currentColor')=>`<svg class="wordmark" height="${h}" viewBox="0 0 6200 750" role="img" aria-label="JONIVOR"><path d="${WORD_D}" fill="${color}"/></svg>`;
const appIcon=size=>`<span class="appicon" style="width:${size}px;height:${size}px;border-radius:${Math.round(size*.2237)}px">${logoMark(Math.round(size*.7),'#FBF7F0','#F08A4B')}</span>`;

/* =====================================================================
   PHOTOS — painted onto <canvas>. Sandboxed previews often block every image
   URL (external, data: and blob:); decoding bytes with createImageBitmap and
   drawing them is not an image load, so photos always show.
   ===================================================================== */
const IMG=/*@IMAGES@*/{};
const SAMPLE={dog:['shepherd'],cat:['kitten','cat_yarn'],bird:['macaw','duckling'],fish:[],rodent:['hedgehog'],reptile:['chameleon'],farm:['sheep','goat','horses','calf']};
const CAT_LABEL={dog:'It',cat:'Mushuk',bird:'Qush',fish:'Baliq',rodent:'Mayda hayvon',reptile:'Sudraluvchi',farm:'Chorva'};
const BMP={};let upSeq=0;
function b64bytes(b64){const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
function bitmap(k){
  if(BMP[k])return BMP[k];
  if(IMG[k]){const blob=new Blob([b64bytes(IMG[k])],{type:'image/jpeg'});
    return BMP[k]=(window.createImageBitmap?createImageBitmap(blob):Promise.reject()).catch(()=>new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src='data:image/jpeg;base64,'+IMG[k]}))}
  return Promise.resolve(null);
}
function photoTag(k,c,cls='',style=''){
  return `<div class="photo ${cls}" style="${style}"><div class="ph-fb"><div>${ic('paw',28)}${CAT_LABEL[c]||''}</div></div>`+
   (k&&(IMG[k]||BMP[k])?`<canvas data-k="${k}"></canvas>`:'')+`</div>`;
}
function paintPhotos(){
  document.querySelectorAll('.photo canvas:not(.painted)').forEach(cv=>{
    const w=cv.clientWidth,h=cv.clientHeight;if(!w||!h||cv.dataset.busy)return;cv.dataset.busy=1;
    bitmap(cv.dataset.k).then(bm=>{try{delete cv.dataset.busy;if(!bm)return;
      const d=Math.min(2,devicePixelRatio||1);cv.width=Math.round(w*d);cv.height=Math.round(h*d);
      const s=Math.max(cv.width/bm.width,cv.height/bm.height),sw=cv.width/s,sh=cv.height/s;
      const ctx=cv.getContext('2d');ctx.imageSmoothingQuality='high';
      ctx.drawImage(bm,(bm.width-sw)/2,(bm.height-sh)/2,sw,sh,0,0,cv.width,cv.height);cv.classList.add('painted')}catch(e){}});
  });
}
let paintQ=0;const schedulePaint=()=>{if(!paintQ)paintQ=requestAnimationFrame(()=>{paintQ=0;paintPhotos()})};
addEventListener('scroll',schedulePaint,true);

/* ---------- file picking (photos, video, documents) ---------- */
function pickFiles(accept,{multiple=false,capture=false}={}){return new Promise(res=>{
  const i=document.createElement('input');i.type='file';i.accept=accept;i.multiple=multiple;if(capture)i.setAttribute('capture','environment');
  i.hidden=true;i.className='picker';i.onchange=()=>{res([...i.files]);i.remove()};document.body.appendChild(i);i.click()})}
async function readPhoto(file){try{
  const src=await createImageBitmap(file),k=Math.min(1,1080/Math.max(src.width,src.height));
  const bm=k<1?await createImageBitmap(src,{resizeWidth:Math.round(src.width*k),resizeHeight:Math.round(src.height*k),resizeQuality:'high'}):src;
  const key='u'+(++upSeq);BMP[key]=Promise.resolve(bm);return key}catch(e){toast("Bu rasmni o'qib bo'lmadi");return null}}

/* =====================================================================
   REFERENCE DATA
   ===================================================================== */
const CATS=[{id:'all',n:'Hammasi'},{id:'dog',n:'Itlar'},{id:'cat',n:'Mushuklar'},{id:'bird',n:'Qushlar'},{id:'fish',n:'Baliqlar'},{id:'rodent',n:'Mayda hayvonlar'},{id:'reptile',n:'Sudralib yuruvchilar'},{id:'farm',n:"Qishloq xo'jaligi"}];
const catName=id=>(CATS.find(c=>c.id===id)||{}).n||'';
const REGIONS=["Butun O'zbekiston","Toshkent shahri","Toshkent viloyati","Andijon","Buxoro","Farg'ona","Jizzax","Xorazm","Namangan","Navoiy","Qashqadaryo","Qoraqalpog'iston","Samarqand","Sirdaryo","Surxondaryo"];
const DISTRICTS={
 "Toshkent shahri":["Bektemir","Chilonzor","Mirobod","Mirzo Ulug'bek","Olmazor","Sergeli","Shayxontohur","Uchtepa","Yakkasaroy","Yangihayot","Yashnobod","Yunusobod"],
 "Toshkent viloyati":["Chirchiq","Olmaliq","Angren","Bekobod","Zangiota","Qibray","Parkent","Yangiyo'l"],
 "Andijon":["Andijon shahri","Asaka","Xonobod","Shahrixon"],"Buxoro":["Buxoro shahri","G'ijduvon","Kogon","Vobkent"],
 "Farg'ona":["Farg'ona shahri","Marg'ilon","Qo'qon","Quvasoy","Rishton"],"Jizzax":["Jizzax shahri","Zomin","G'allaorol"],
 "Xorazm":["Urganch","Xiva","Xonqa"],"Namangan":["Namangan shahri","Chust","Pop","Kosonsoy"],"Navoiy":["Navoiy shahri","Zarafshon","Karmana"],
 "Qashqadaryo":["Qarshi","Shahrisabz","Kitob","G'uzor"],"Qoraqalpog'iston":["Nukus","Beruniy","Xo'jayli"],
 "Samarqand":["Samarqand shahri","Urgut","Kattaqo'rg'on","Pastdarg'om","Jomboy"],"Sirdaryo":["Guliston","Yangiyer","Shirin"],"Surxondaryo":["Termiz","Denov","Sherobod"]};
// region centres (lon, lat) for distance and the map
const GEO={"Toshkent shahri":[69.28,41.31],"Toshkent viloyati":[69.6,41.47],"Andijon":[72.34,40.78],"Buxoro":[64.42,39.77],"Farg'ona":[71.78,40.38],"Jizzax":[67.84,40.12],"Xorazm":[60.63,41.55],"Namangan":[71.67,41.0],"Navoiy":[65.38,40.1],"Qashqadaryo":[65.79,38.86],"Qoraqalpog'iston":[59.6,42.46],"Samarqand":[66.96,39.65],"Sirdaryo":[68.78,40.49],"Surxondaryo":[67.28,37.22]};
const ME_AT={r:'Toshkent shahri',d:'Chilonzor'};
function km(r,d,seed){if(r===ME_AT.r)return d===ME_AT.d?1+seed%3:3+seed%12;
  const [a,b]=GEO[ME_AT.r],[c,e]=GEO[r]||GEO[ME_AT.r],R=6371,t=x=>x*Math.PI/180;
  const h=Math.sin(t(e-b)/2)**2+Math.cos(t(b))*Math.cos(t(e))*Math.sin(t(c-a)/2)**2;return Math.round(2*R*Math.asin(Math.sqrt(h))*1.2)}
// category-specific fields
const BREEDS={dog:['Nemis ovcharkasi',"O'rta Osiyo ovcharkasi (alabay)",'Labrador','Xaski','Pomeraniyan shpits','Chixuaxua','Toy-terer','Zotsiz','Boshqa'],
 cat:['Britaniya','Shotland vislouxiy','Pers','Siam','Meyn-kun','Sfinks','Zotsiz','Boshqa']};
const KINDS={farm:["Qo'y",'Echki','Sigir yoki buzoq','Ot','Tovuq','Boshqa'],bird:["To'tiqush",'Kanareyka','Kaptar','Tovuq',"O'rdak",'Boshqa']};
const SEXES=['Erkak',"Urg'ochi",'Juft','Aralash'];

/* =====================================================================
   SAMPLE CONTENT
   ===================================================================== */
const SELLERS={
 s1:{n:'Aziz Karimov',i:'AK',since:'2024',ph:'+998 90 555 12 34',verified:1,biz:{name:'Karimov Kennel',about:"Nemis ovcharkasi va alabay pitomnigi. Barcha kuchuklar hujjatli, emlangan.",hours:'Har kuni 9:00–19:00',cover:'shepherd'}},
 s2:{n:'Malika Yusupova',i:'MY',since:'2023',ph:'+998 91 222 33 44',verified:1},
 s3:{n:'Jasur Rahimov',i:'JR',since:'2025',ph:'+998 93 777 88 99',verified:0},
 me:{n:'Uchqun Uktamov',i:'UU',since:'2026',ph:'+998 90 123 45 67'},
 support:{n:"Jonivor yordam",i:'D',since:'2026',ph:'+998 71 200 00 00',verified:1}
};
let REVIEWS=[
 {s:'s1',who:'Malika Y.',st:5,x:"Kuchuk sog'lom, hujjatlari joyida. Sotuvchi hamma savollarga javob berdi.",date:'12-sentabr'},
 {s:'s1',who:'Sherzod T.',st:5,x:'Aytilganidek edi, rahmat!',date:'3-sentabr'},
 {s:'s1',who:'Dilnoza A.',st:4,x:"Biroz kechikib keldi, lekin hammasi yaxshi.",date:'28-avgust'},
 {s:'s2',who:'Aziz K.',st:5,x:"Mushukcha juda chiroyli va sog'lom.",date:'20-sentabr'},
 {s:'s3',who:'Bekzod R.',st:3,x:"Narxi rasmdagidan qimmatroq aytildi.",date:'15-sentabr'},
];
const DAYS=['Du','Se','Ch','Pa','Ju','Sh','Ya'];
function mkStats(id,views){const seed=n=>((id*9301+n*49297)%233280)/233280,base=Math.max(3,views/7);
  const v=DAYS.map((_,i)=>Math.round(base*(.55+seed(i)*.9)));
  return {views:v,calls:v.map((x,i)=>Math.round(x*(.06+seed(i+9)*.08))),saves:v.map((x,i)=>Math.round(x*(.08+seed(i+19)*.1)))}}
function mkAd(o){const a={top:0,vip:0,urgent:0,docs:[],video:null,pt:'fixed',x:{},mine:0,sold:0,bump:null,...o};
  a.km=km(a.r,a.dist,a.id*7);a.stats=mkStats(a.id,a.views);return a}
let ADS=[
 {id:1,n:'Nemis ovcharkasi',c:'dog',age:'2 yosh',sex:'Erkak',w:'34 kg',p:4500000,r:'Toshkent shahri',dist:'Yunusobod',top:1,t:'Bugun, 10:24',ts:12,s:'s1',views:212,img:['shepherd'],docs:['Veterinar pasporti','Zot hujjati (RKF)','Emlash guvohnomasi'],x:{breed:'Nemis ovcharkasi'},d:"Zotli, hujjatlari va veterinar pasporti bor. Barcha emlashlar qilingan. Qo'riqchilikka o'rgatilgan, bolalar bilan yaxshi chiqishadi."},
 {id:2,n:'Mushukcha, 2 oylik',c:'cat',age:'2 oy',sex:"Urg'ochi",w:'0,8 kg',p:0,pt:'free',r:'Samarqand',dist:'Samarqand shahri',top:1,t:'Bugun, 09:02',ts:11,s:'s2',views:148,img:['kitten'],x:{breed:'Zotsiz'},d:"Yaxshi qo'lga beraman. Lotokka o'rgangan, o'zi ovqatlanadi. Juda o'yinqaroq va mehribon."},
 {id:3,n:'Otlar, 2 bosh',c:'farm',age:'4 yosh',sex:'Aralash',w:'450 kg',p:48000000,pt:'neg',r:'Qashqadaryo',dist:'Shahrisabz',top:1,t:'Bugun, 08:40',ts:10,s:'s3',views:96,img:['horses'],x:{kind:'Ot',breed:'Qorabayir',heads:2},d:"Sog'lom, minishga o'rgatilgan. Birga yoki alohida sotiladi."},
 {id:4,n:"Ara to'tiqushi",c:'bird',age:'1 yosh',sex:'Erkak',w:'1 kg',p:9500000,r:"Farg'ona",dist:"Marg'ilon",vip:1,t:'Kecha, 18:15',ts:9,s:'s2',views:77,img:['macaw'],docs:['CITES sertifikati'],x:{kind:"To'tiqush",breed:'Qizil ara'},d:"Qo'lga o'rgatilgan, bir necha so'z gapiradi. Katta qafas bilan birga beriladi."},
 {id:5,n:'Uy mushugi',c:'cat',age:'1 yosh',sex:'Erkak',w:'4 kg',p:300000,r:'Buxoro',dist:'Buxoro shahri',t:'27-sentabr',ts:8,s:'s3',views:61,img:['cat_yarn'],docs:['Veterinar pasporti'],x:{breed:'Zotsiz'},d:"Tinch, xonadonga o'rgangan. Bichilgan, emlangan."},
 {id:6,n:"Hisori qo'ylar",c:'farm',age:'1,5 yosh',sex:"Urg'ochi",w:'70 kg',p:3200000,r:'Jizzax',dist:'Zomin',urgent:1,t:'27-sentabr',ts:7,s:'s1',views:54,img:['sheep'],x:{kind:"Qo'y",breed:'Hisori',heads:12},d:"12 bosh, semiz va sog'lom. Veterinar ko'rigidan o'tgan. Narx bir bosh uchun."},
 {id:7,n:'Sut echkisi',c:'farm',age:'3 yosh',sex:"Urg'ochi",w:'45 kg',p:2100000,pt:'neg',r:'Namangan',dist:'Chust',t:'26-sentabr',ts:6,s:'s3',views:33,img:['goat'],x:{kind:'Echki',breed:'Zaanen',heads:1,milk:3},d:"Kuniga 2-3 litr sut beradi. Tinch xarakterli."},
 {id:8,n:'Tovuqlar, 10 ta',c:'farm',age:'8 oy',sex:"Urg'ochi",w:'—',p:900000,r:'Andijon',dist:'Asaka',t:'26-sentabr',ts:5,s:'s2',views:41,img:['chickens'],x:{kind:'Tovuq',breed:'Mahalliy',heads:10,eggs:1},d:"Tuxum qo'yayotgan mahalliy zot. Donasi 90 000 so'm."},
 {id:9,n:'Xameleon',c:'reptile',age:'1 yosh',sex:'Erkak',w:'—',p:1800000,r:'Toshkent shahri',dist:'Chilonzor',t:'25-sentabr',ts:4,s:'s1',views:28,img:['chameleon'],x:{breed:'Yamanlik xameleon'},d:"Terrarium, lampa va isitgich bilan birga beriladi."},
 {id:10,n:'Afrika kirpisi',c:'rodent',age:'6 oy',sex:'Erkak',w:'0,4 kg',p:700000,r:'Samarqand',dist:'Urgut',t:'25-sentabr',ts:3,s:'s2',views:25,img:['hedgehog'],x:{breed:'Afrika pakana kirpisi'},d:"Qo'lga o'rgangan, katak bilan beriladi."},
 {id:11,n:'Buzoq',c:'farm',age:'4 oy',sex:'Erkak',w:'110 kg',p:6500000,r:'Surxondaryo',dist:'Denov',t:'24-sentabr',ts:2,s:'s3',views:19,img:['calf','cow'],docs:['Veterinar ma\'lumotnomasi'],x:{kind:'Sigir yoki buzoq',breed:'Golshtin',heads:1},d:"Golshtin zoti. Onasi kuniga 20 litr sut beradi."},
 {id:12,n:'Poni',c:'farm',age:'5 yosh',sex:"Urg'ochi",w:'180 kg',p:12000000,r:'Toshkent shahri',dist:'Chilonzor',t:'24-sentabr',ts:1,s:'me',mine:1,views:128,img:['pony'],x:{kind:'Ot',breed:'Shetland poni',heads:1},d:"Bolalar uchun, juda yuvosh. Egar bilan birga."},
 {id:13,n:"O'rdak jo'jalari, 5 ta",c:'bird',age:'1 oy',sex:'Aralash',w:'—',p:150000,r:'Toshkent shahri',dist:'Chilonzor',t:'20-sentabr',ts:0,s:'me',mine:1,sold:1,views:90,img:['duckling','duck'],x:{kind:"O'rdak",heads:5},d:"Sog'lom, o'zi ovqatlanadi."}
].map(mkAd);
let LOST=[
 {id:101,type:'lost',c:'dog',n:'Nemis ovcharkasi yo\'qoldi',r:'Toshkent shahri',dist:'Yunusobod',t:'Bugun, 07:30',img:['shepherd'],ph:'+998 90 111 22 33',reward:500000,d:"Laqabi «Reks», bo'ynida qora bo'yinbog'. 27-sentabr kechqurun Yunusobod 4-mavzedan qochib ketgan."},
 {id:102,type:'found',c:'cat',n:'Mushukcha topildi',r:'Samarqand',dist:'Samarqand shahri',t:'Kecha, 16:10',img:['kitten'],ph:'+998 91 444 55 66',d:"Registon yaqinida topildi, sarg'ish rangli, 2 oylik atrofida. Egasi bo'lsa, qo'ng'iroq qiling."},
 {id:103,type:'lost',c:'bird',n:"To'tiqush uchib ketdi",r:"Farg'ona",dist:"Farg'ona shahri",t:'26-sentabr',img:['macaw'],ph:'+998 93 222 11 00',reward:1000000,d:"Qizil ara, «Kesha» deb chaqirsangiz javob beradi."}
];
const SERVICES=[
 {id:201,type:'vet',n:'«Zoovet» veterinariya klinikasi',r:'Toshkent shahri',dist:'Chilonzor',ph:'+998 71 277 00 11',st:4.8,price:'Ko\'rik — 80 000 so\'m dan',d:"Ko'rik, emlash, jarrohlik, laboratoriya. Uyga chiqish xizmati bor."},
 {id:202,type:'vet',n:'Dr. Nodira Saidova',r:'Samarqand',dist:'Samarqand shahri',ph:'+998 90 600 70 80',st:4.9,price:'Uyga chiqish — 150 000 so\'m',d:"Mushuk va itlar bo'yicha veterinar, 12 yillik tajriba."},
 {id:203,type:'vet',n:'Chorva vetpunkti',r:'Jizzax',dist:'Zomin',ph:'+998 72 444 12 12',st:4.6,price:'Kelishiladi',d:"Qo'y, echki va qoramol uchun emlash va davolash."},
 {id:204,type:'groom',n:'«Pushistik» gruming saloni',r:'Toshkent shahri',dist:'Yunusobod',ph:'+998 97 555 33 22',st:4.7,price:'Soch olish — 120 000 so\'m dan',d:"Itlar va mushuklar uchun cho'miltirish, soch olish, tirnoq kesish."},
 {id:205,type:'train',n:'Kinolog Rustam Ahmedov',r:'Toshkent viloyati',dist:'Qibray',ph:'+998 93 123 98 76',st:4.9,price:'1 mashg\'ulot — 200 000 so\'m',d:"Umumiy itoat kursi, qo'riqchilik tayyorgarligi."},
 {id:206,type:'feed',n:'«Agro Yem» savdo uyi',r:'Samarqand',dist:'Urgut',ph:'+998 66 233 44 55',st:4.5,price:'Yetkazib berish bepul (1 t dan)',d:"Kombikorm, arpa, beda, makkajo'xori. Ulgurji va chakana."},
 {id:207,type:'acc',n:'«PetShop Uz»',r:'Toshkent shahri',dist:'Mirobod',ph:'+998 71 200 44 44',st:4.6,price:'Chegirmalar har hafta',d:"Oziq-ovqat, o'yinchoqlar, kataklar, akvariumlar va aksessuarlar."}
];
const SVC_TYPES=[{id:'vet',n:'Veterinar',i:'vet'},{id:'groom',n:'Gruming',i:'scissors'},{id:'train',n:'Kinolog',i:'target'},{id:'feed',n:'Yem-xashak',i:'bag'},{id:'acc',n:'Aksessuarlar',i:'bone'}];
let THREADS=[
 {id:'t1',who:'s1',ad:1,unread:2,msgs:[{me:1,x:"Assalomu alaykum, ovcharka hali sotuvdami?",t:'10:20'},{me:0,x:"Va alaykum assalom, ha sotuvda.",t:'10:22'},{me:0,x:"Qachon ko'rgani kelasiz?",t:'10:24'}]},
 {id:'t2',who:'s2',ad:2,unread:1,msgs:[{me:1,x:"Mushukcha hali bormi?",t:'09:05'},{me:0,x:"Ha, bor. Ertaga soat 11 da ko'rgani kelsangiz bo'ladi.",t:'09:10'}]},
 {id:'t3',who:'s3',ad:3,unread:1,msgs:[{me:1,x:"Narxida kelishsa bo'ladimi?",t:'Kecha'},{me:0,x:"Bo'ladi. Oldindan 30% to'lov qiling, karta raqamim 8600 1234 5678 9012.",t:'Kecha'}]},
];
let WALLET_TX=[
 {k:'pay',t:'TOP · 3 kun',ad:'Poni',sum:-35000,date:'24-sentabr, 14:10',m:'Click'},
 {k:'top',t:"Hamyon to'ldirildi",sum:100000,date:'22-sentabr, 09:00',m:'Payme'},
 {k:'pay',t:'TOP · 1 kun',ad:"O'rdak jo'jalari, 5 ta",sum:-15000,date:'20-sentabr, 11:32',m:'Payme'}];
let NOTIFS=[
 {i:'check',t:"E'loningiz moderatsiyadan o'tdi",d:"«Poni» endi barcha foydalanuvchilarga ko'rinadi.",time:'1 soat oldin',u:1,go:()=>nav('detail',12)},
 {i:'bookmark',t:"Saqlangan qidiruv: yangi e'lon",d:"«Toshkent shahri · Itlar» bo'yicha 1 ta yangi e'lon.",time:'2 soat oldin',u:1,go:()=>applySaved(S.saved[0])},
 {i:'chat',t:'Yangi xabar',d:"Aziz Karimov: Qachon ko'rgani kelasiz?",time:'2 soat oldin',u:1,go:()=>requireAuth(()=>nav('chat','t1'))},
 {i:'clock',t:'TOP muddati tugadi',d:"«Poni» e'lonini qayta TOP ga chiqarishingiz mumkin.",time:'Kecha',u:0,go:()=>requireAuth(()=>nav('promote',12))},
];

/* =====================================================================
   STATE
   ===================================================================== */
const store={get(k,d){try{const v=localStorage.getItem('dost.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('dost.'+k,JSON.stringify(v))}catch(e){}}};
let S={cat:'all',region:REGIONS[0],dist:'',q:'',sort:'new',pmin:'',pmax:'',sex:'all',breed:'',docsOnly:false,videoOnly:false,view:'list',
  favs:store.get('favs',[2]),theme:store.get('theme','system'),lang:store.get('lang','lat'),
  logged:store.get('logged',false),name:store.get('name','Uchqun Uktamov'),
  notif:store.get('notif',{msg:true,ads:true,top:true,saved:true,promo:false}),
  wallet:store.get('wallet',50000),verified:store.get('verified',0),biz:store.get('biz',null),
  saved:store.get('saved',[{id:1,label:"Toshkent shahri · Itlar",p:{cat:'dog',region:'Toshkent shahri',dist:'',q:'',sort:'new',pmin:'',pmax:'',sex:'all',breed:''},on:true}]),
  svc:'vet',lostTab:'lost',plan:1,svcKind:'top',pay:'wallet'};
const $=s=>document.querySelector(s);
const ad=id=>ADS.find(a=>a.id===+id);
const isFav=id=>S.favs.includes(+id);
const initials=n=>n.split(/\s+/).map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=()=>new Date().toTimeString().slice(0,5);
const money=n=>(+n).toLocaleString('ru-RU').replace(/\s/g,'\u00a0');
const fmt=n=>money(n)+" so'm";
const priceText=a=>a.pt==='free'?'Bepul':a.pt==='neg'?(a.p?fmt(a.p):'Kelishiladi'):fmt(a.p);
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove('on'),2100)};
const setWallet=v=>{S.wallet=v;store.set('wallet',v)};
const sellerRating=s=>{const l=REVIEWS.filter(r=>r.s===s);return l.length?{avg:l.reduce((x,r)=>x+r.st,0)/l.length,n:l.length}:{avg:0,n:0}};
const stars=(v,size=14)=>[1,2,3,4,5].map(i=>ic('star',size,{fill:i<=Math.round(v),c:i<=Math.round(v)?'var(--gold)':'var(--line)'})).join('');

/* =====================================================================
   LANGUAGE: Uzbek Latin (source) · Uzbek Cyrillic (transliterated) · Russian (dictionary)
   Text inside .ugc is user content: it gets script changes but is never translated.
   ===================================================================== */
const uz=s=>s.replace(/([oOgG])['‘’`]/g,'$1\u02bb').replace(/(\p{L})['’](\p{L})/gu,'$1\u02bc$2');
const CYR=[["Oʻ","Ў"],["oʻ","ў"],["Gʻ","Ғ"],["gʻ","ғ"],["SH","Ш"],["Sh","Ш"],["sh","ш"],["CH","Ч"],["Ch","Ч"],["ch","ч"],["Yo","Ё"],["yo","ё"],["Ya","Я"],["ya","я"],["Yu","Ю"],["yu","ю"],["Ye","Е"],["ye","е"],["ʼ","ъ"]];
const CYR1={a:'а',b:'б',d:'д',e:'е',f:'ф',g:'г',h:'ҳ',i:'и',j:'ж',k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',q:'қ',r:'р',s:'с',t:'т',u:'у',v:'в',x:'х',y:'й',z:'з',c:'с',w:'в'};
function toCyr(s){
  for(const[a,b]of CYR)s=s.split(a).join(b);
  s=s.replace(/(^|[^\p{L}])([eE])/gu,(m,p,e)=>p+(e==='e'?'э':'Э'));
  return s.replace(/[A-Za-z]/g,ch=>{const l=CYR1[ch.toLowerCase()];return l?(ch===ch.toLowerCase()?l:l.toUpperCase()):ch});
}
const RU=/*@RU@*/{};
const RU_RX=[
 [/^(\d+(?:,\d+)?) yosh$/,(m,n)=>n+' '+(n==1?'год':(+n>1&&+n<5)?'года':'лет')],
 [/^(\d+) oy$/,(m,n)=>n+' мес.'],
 [/^(\d+) oylik$/,(m,n)=>n+' мес.'],
 [/^(\d+) ta e'lon$/,(m,n)=>n+' объявл.'],
 [/^(\d+) ta e'lon topildi$/,(m,n)=>'Найдено объявлений: '+n],
 [/^(\d+)-yildan beri$/,(m,n)=>'с '+n+' года'],
 [/^(\d+)-yildan beri «Jonivor»da$/,(m,n)=>'На «Jonivor» с '+n+' года'],
 [/^Bugun, (\d\d:\d\d)$/,(m,t)=>'Сегодня, '+t],
 [/^Kecha, (\d\d:\d\d)$/,(m,t)=>'Вчера, '+t],
 [/^(\d+)-sentabr(.*)$/,(m,d,r)=>d+' сентября'+r],
 [/^(\d+)-avgust$/,(m,d)=>d+' августа'],
 [/^(\d+) soat oldin$/,(m,n)=>n+' ч назад'],
 [/^(\d+) km$/,(m,n)=>n+' км'],
 [/^(\d+) kun$/,(m,n)=>n+' '+(n==1?'день':(+n>1&&+n<5)?'дня':'дней')],
 [/^TOP · (\d+) kun$/,(m,n)=>'TOP · '+n+' '+(n==1?'день':(+n>1&&+n<5)?'дня':'дней')],
 [/^(\d+) bosh$/,(m,n)=>n+' гол.'],
 [/^(\d+) litr$/,(m,n)=>n+' л'],
 [/^([\d,]+) (kg|g)$/,(m,n,u)=>n+(u==='kg'?' кг':' г')],
 [/^Faol \((\d+)\)$/,(m,n)=>'Активные ('+n+')'],
 [/^Sotilgan \((\d+)\)$/,(m,n)=>'Проданные ('+n+')'],
 [/^(\d+) ta sharh$/,(m,n)=>'Отзывов: '+n],
 [/^To'lash · (.+)$/,(m,s)=>'Оплатить · '+trRU(s)],
 [/^Balans: (.+)$/,(m,s)=>'Баланс: '+trRU(s)],
 [/^Mukofot: (.+)$/,(m,s)=>'Вознаграждение: '+trRU(s)],
 [/^(.+) bilan savdo qanday o'tdi\?$/,(m,n)=>'Как прошла сделка с '+n+'?'],
 [/^(\d+) ta yo'qolgan$/,(m,n)=>'пропало: '+n],
 [/^(\d+) ta topilgan$/,(m,n)=>'найдено: '+n],
 [/^Saralash: (.+)$/,(m,s)=>'Сортировка: '+trRU(s)],
 [/^(Du|Se|Ch|Pa|Ju|Sh|Ya): (\d+)$/,(m,d,n)=>RU[d]+': '+n],
 [/^(.+) gacha$/,(m,s)=>'до '+s],
 [/^(.+) so'm \/ kun$/,(m,s)=>s+' сум / день'],
 [/^(.+) so'm$/,(m,s)=>s+' сум'],
];
function trRU(s){
  const k=s.trim();if(!k)return s;
  const lead=s.match(/^\s*/)[0],trail=s.match(/\s*$/)[0];
  const dm=k.match(/^(· )?(.*?)( ·)?$/);if(dm[1]||dm[3])return lead+(dm[1]||'')+trRU(dm[2])+(dm[3]||'')+trail;
  let v=RU[k];
  if(v==null){for(const[rx,f]of RU_RX){const m=k.match(rx);if(m){v=f(...m);break}}}
  if(v==null&&k.includes(' · '))v=k.split(' · ').map(p=>trRU(p)).join(' · ');
  if(v==null&&k.includes(', ')){const parts=k.split(', ').map(p=>{const t=trRU(p);return t===p&&!RU[p]?null:t});if(parts.every(x=>x!=null))v=parts.join(', ')}
  return v==null?s:lead+v+trail;
}
function tx(s,ugc){if(S.lang==='ru')return ugc?uz(s):trRU(uz(s).replace(/[ʻʼ]/g,"'")).replace(/([oOgG])'/g,'$1\u02bb');s=uz(s);return S.lang==='cyr'?toCyr(s):s}
function typeset(root){
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('.notr,script,style,textarea')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  let n;while(n=w.nextNode()){const ugc=!!n.parentElement.closest('.ugc');const v=tx(n.nodeValue,ugc);if(v!==n.nodeValue)n.nodeValue=v}
  root.querySelectorAll('[placeholder]').forEach(e=>{if(!e.dataset.ph)e.dataset.ph=e.placeholder;const v=tx(e.dataset.ph);if(v!==e.placeholder)e.placeholder=v});
}
const OBS={childList:true,subtree:true,characterData:true};
const obs=new MutationObserver(()=>{obs.disconnect();typeset($('#app'));obs.observe($('#app'),OBS);schedulePaint()});
obs.observe($('#app'),OBS);

/* =====================================================================
   THEME
   ===================================================================== */
const mq=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){$('#app').dataset.theme=S.theme==='system'?(mq.matches?'dark':'light'):S.theme}
mq.addEventListener?.('change',applyTheme);applyTheme();

/* =====================================================================
   NAVIGATION (stack with scroll restore)
   ===================================================================== */
const TABS=['home','fav','messages','profile'];
let stack=[],afterLogin=null;
function screenEl(id){let el=$('#s-'+id);if(!el){el=document.createElement('section');el.className='screen';el.id='s-'+id;$('#screens').appendChild(el)}return el}
function show(entry){
  const {id,arg}=entry;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  const el=screenEl(id);R[id](el,arg);el.classList.add('on');el.classList.toggle('notab',!TABS.includes(id));
  el.scrollTop=entry.y||0;
  $('#tabbar').classList.toggle('hide',!TABS.includes(id));
  document.querySelectorAll('.tab[data-t]').forEach(t=>t.classList.toggle('on',t.dataset.t===id));
  $('#cta').classList.toggle('on',id==='detail'||id==='lostDetail'||id==='service');
  $('#sb').className='statusbar'+(id==='welcome'||id==='splash'?' dark':(id==='detail'||id==='lostDetail'||id==='seller')&&!(entry.y>330)?' clear':'');
  closeSheet();
}
const curY=()=>{const t=stack[stack.length-1],el=t&&$('#s-'+t.id);return el?el.scrollTop:0};
function nav(id,arg){if(stack.length)stack[stack.length-1].y=curY();
  if(id==='detail'){const a=ad(arg);if(a){a.views++;a.stats.views[6]++}}
  stack.push({id,arg});show(stack[stack.length-1])}
function tabTo(id){stack=[{id}];show(stack[0])}
function back(){if(stack.length>1){stack.pop();show(stack[stack.length-1])}else tabTo('home')}
function refresh(){const e=stack[stack.length-1];e.y=curY();show(e)}
const navBar=(title,right='')=>`<div class="nav"><button class="icon-btn" onclick="back()" aria-label="Orqaga">${ic('back',20)}</button><span class="t-headline">${title}</span>${right||'<span class="sp"></span>'}</div>`;
function requireAuth(then){if(S.logged)return then();afterLogin=then;nav('login');toast('Davom etish uchun tizimga kiring')}
function goLogin(then){afterLogin=then;nav('login')}

function renderTabbar(){
  const unread=THREADS.reduce((s,t)=>s+t.unread,0);
  $('#tabbar').innerHTML=`
 <button class="tab" data-t="home" onclick="tabTo('home')">${ic('home',24)}Asosiy</button>
 <button class="tab" data-t="fav" onclick="tabTo('fav')">${ic('heart',24)}Saqlangan</button>
 <button class="tab add" onclick="startPost()"><span class="pl">${ic('plus',22,{w:2.2})}</span>E'lon berish</button>
 <button class="tab" data-t="messages" onclick="tabTo('messages')">${ic('chat',24)}Xabarlar${unread&&S.logged?`<span class="cnt num">${unread}</span>`:''}</button>
 <button class="tab" data-t="profile" onclick="tabTo('profile')">${ic('user',24)}Profil</button>`;
  const cur=stack[stack.length-1];if(cur)document.querySelectorAll('.tab[data-t]').forEach(t=>t.classList.toggle('on',t.dataset.t===cur.id));
}

/* =====================================================================
   SHARED PIECES
   ===================================================================== */
const saveBtn=a=>`<button class="save" aria-label="Saqlash" onclick="event.stopPropagation();toggleFav(${a.id})">${ic('heart',18,isFav(a.id)?{fill:1,c:'#c2372c'}:{})}</button>`;
const topBadge=`<span class="badge top notr">${ic('star',11,{fill:1})}TOP</span>`;
const vipBadge=`<span class="badge vip notr">${ic('crown',11,{fill:1})}VIP</span>`;
const urgentBadge=`<span class="badge urgent">${ic('bolt',11,{fill:1})}Shoshilinch</span>`;
const freeBadge=`<span class="badge free">Bepul</span>`;
const docsBadge=`<span class="badge">${ic('doc',11)}Hujjatli</span>`;
const verBadge=(s,size=16)=>SELLERS[s]?.verified||(s==='me'&&S.verified===2)?`<span class="verified" title="Tasdiqlangan">${ic('verified',size,{c:'var(--blue)'})}</span>`:'';
const cardBadges=a=>[a.top?topBadge:'',a.vip?vipBadge:'',a.urgent?urgentBadge:''].join('');
const miniIcons=a=>(a.docs.length?`<span title="Hujjatli">${ic('doc',13)}</span>`:'')+(a.video?`<span title="Video">${ic('video',13)}</span>`:'');
const card=a=>`<div class="card ${a.vip?'is-vip':''}" onclick="nav('detail',${a.id})">${photoTag(a.img[0],a.c)}<div class="bdg">${cardBadges(a)}</div>${saveBtn(a)}
 <div class="body"><div class="price ${a.pt==='free'?'is-free':''}">${priceText(a)}</div><div class="title ugc">${esc(a.n)}</div><div class="meta">${ic('pin',13)}${a.r}${miniIcons(a)}</div></div></div>`;
const lrow=a=>`<div class="lrow ${a.vip?'is-vip':''}" onclick="nav('detail',${a.id})">${photoTag(a.img[0],a.c)}
 <div class="b"><div class="row between" style="align-items:flex-start"><div class="price ${a.pt==='free'?'is-free':''}">${priceText(a)}${a.pt==='neg'&&a.p?'<span class="neg">kelishiladi</span>':''}</div>${saveBtn(a)}</div>
 <div class="title ugc" style="margin-top:2px">${esc(a.n)}</div><div class="meta">${a.age} · ${a.sex}${miniIcons(a)}</div>
 ${a.vip||a.urgent||a.docs.length?`<div class="bdgrow">${a.vip?vipBadge:''}${a.urgent?urgentBadge:''}${a.docs.length?docsBadge:''}</div>`:''}
 <div class="meta">${ic('pin',13)}${a.r} · ${S.sort==='near'?a.km+' km':a.t}</div></div></div>`;
const mini=a=>`${photoTag(a.img[0],a.c)}<div style="flex:1;min-width:0;text-align:left"><div class="title ugc" style="font-size:14px">${esc(a.n)}</div><div class="t-caption num" style="font-weight:600">${priceText(a)}</div></div>`;
const emptyState=(i,t,d,btn='')=>`<div class="empty"><div class="ei">${ic(i,28)}</div><div class="t-headline">${t}</div>${d?`<div class="muted" style="margin-top:4px">${d}</div>`:''}${btn}</div>`;
function toggleFav(id){S.favs=isFav(id)?S.favs.filter(x=>x!==id):[...S.favs,id];store.set('favs',S.favs);
  const a=ad(id);if(a&&isFav(id))a.stats.saves[6]++;toast(isFav(id)?"Saqlanganlarga qo'shildi":'Saqlanganlardan olib tashlandi');refresh()}
function copyText(txt,msg){try{navigator.clipboard.writeText(txt).then(()=>toast(msg),()=>toast(txt))}catch(e){toast(txt)}}

/* =====================================================================
   SCREENS
   ===================================================================== */
const R={};

/* ---------- splash ---------- */
R.splash=el=>{el.innerHTML=`<div class="splash" onclick="leaveSplash()">${appIcon(112)}<div class="sp-word">${wordmark(26,'#FBF7F0')}</div><div class="sp-tag">Uy hayvonlari bozori</div></div>`;
  clearTimeout(R.splash.t);R.splash.t=setTimeout(leaveSplash,1600)};
function leaveSplash(){clearTimeout(R.splash.t);if(stack[stack.length-1]?.id==='splash'){stack=[{id:S.logged?'home':'welcome'}];show(stack[0])}}

/* ---------- welcome & login ---------- */
R.welcome=el=>{el.innerHTML=`<div class="w-hero">${photoTag('kitten','cat')}<div class="w-logo">${appIcon(36)}<span style="color:#fff">${wordmark(15)}</span></div></div>
  <div class="w-body">
   <h1 class="t-display">Uy hayvonlarini sotish va sotib olish</h1>
   <div class="w-list">
    <div><i>${ic('gift',18)}</i>E'lon joylash mutlaqo bepul</div>
    <div><i>${ic('verified',18)}</i>Tasdiqlangan sotuvchilar va sharhlar</div>
    <div><i>${ic('pin',18)}</i>Viloyat va tuman bo'yicha qidiruv</div>
   </div>
   <button class="btn" onclick="tabTo('home')">E'lonlarni ko'rish</button>
   <button class="btn text" style="margin-top:4px" onclick="goLogin(()=>tabTo('home'))">Telefon raqam orqali kirish</button>
  </div>`};
const fmtPhone=v=>{const d=v.replace(/\D/g,'').slice(0,9);return[d.slice(0,2),d.slice(2,5),d.slice(5,7),d.slice(7,9)].filter(Boolean).join(' ')};
R.login=el=>{el.innerHTML=navBar('')+`<h1 class="t-display" style="margin-bottom:8px">Tizimga kirish</h1>
  <p class="muted" style="margin-bottom:24px">Telefon raqamingizga SMS orqali tasdiqlash kodi yuboramiz.</p>
  <div class="field"><label for="ph">Telefon raqam</label><div style="position:relative"><span class="prefix num">+998</span>
   <input class="inp num" id="ph" inputmode="tel" style="padding-left:62px" placeholder="90 123 45 67" oninput="this.value=fmtPhone(this.value);$('#getc').disabled=this.value.replace(/\\D/g,'').length<9"></div></div>
  <button class="btn" id="getc" style="margin-top:20px" disabled onclick="nav('otp',$('#ph').value)">Kod olish</button>
  <p class="t-caption faint center" style="margin-top:16px;font-weight:400">Davom etish orqali foydalanish shartlariga rozilik bildirasiz</p>`;setTimeout(()=>$('#ph')?.focus(),50)};
R.otp=(el,ph)=>{el.innerHTML=navBar('')+`<h1 class="t-display" style="margin-bottom:8px">Kodni kiriting</h1>
  <p class="muted" style="margin-bottom:24px"><span class="num notr">+998 ${esc(ph)}</span> raqamiga 4 xonali kod yuborildi. <span class="faint">Prototipda istalgan 4 ta raqam ishlaydi.</span></p>
  <input class="inp otp num" id="otp" inputmode="numeric" maxlength="4" placeholder="····" oninput="this.value=this.value.replace(/\\D/g,'');$('#vok').disabled=this.value.length<4;if(this.value.length===4)login()">
  <button class="btn" id="vok" style="margin-top:20px" disabled onclick="login()">Tasdiqlash</button>
  <button class="btn text" style="margin-top:6px" onclick="toast('Kod qayta yuborildi')">Kodni qayta yuborish</button>`;setTimeout(()=>$('#otp')?.focus(),50)};
function login(){if(S.logged)return;S.logged=true;store.set('logged',true);renderTabbar();toast('Xush kelibsiz!');const f=afterLogin||(()=>tabTo('home'));afterLogin=null;stack=[{id:'home'}];f()}

/* ---------- home ---------- */
const filterActive=()=>S.sort!=='new'||S.pmin||S.pmax||S.sex!=='all'||S.breed||S.docsOnly||S.videoOnly;
const searchActive=()=>S.cat!=='all'||S.region!==REGIONS[0]||S.q.trim()||filterActive();
const placeLabel=()=>S.region===REGIONS[0]?S.region:S.dist?S.dist:S.region;
R.home=el=>{
  el.innerHTML=`
   <div class="brandbar"><span class="bb-mark">${logoMark(30,'var(--brand-fg)')}</span><span class="bb-word">${wordmark(15)}</span>
    <button class="icon-btn" style="margin-left:auto" aria-label="Bildirishnomalar" onclick="nav('notifs')">${ic('bell',20)}${NOTIFS.some(n=>n.u)?'<span class="dot"></span>':''}</button></div>
   <button class="loc" onclick="openRegion()">${ic('pin',18)}<span class="l1">${S.dist?S.region+' ·':'Hudud:'}</span><span class="l2">${placeLabel()}</span>${ic('chev',16)}</button>
   <label class="search">${ic('search',20)}<input id="q" placeholder="Zot yoki hayvon nomi bo'yicha qidirish" value="${esc(S.q)}" oninput="S.q=this.value;rList();$('#qx').style.display=S.q?'':'none'">
    <button id="qx" style="color:var(--ink-3);display:${S.q?'':'none'}" onclick="S.q='';$('#q').value='';this.style.display='none';rList()" aria-label="Tozalash">${ic('x',18)}</button>
    <button class="f" aria-label="Filtr" onclick="openFilter()">${ic('sliders',20)}${filterActive()?'<span class="dot"></span>':''}</button></label>
   <div class="chips" id="cats"></div><div id="homeBody"></div>`;
  rList();
};
function filtered(){
  const q=S.q.trim().toLowerCase().replace(/[ʻʼ‘’`]/g,"'");
  const l=ADS.filter(a=>!a.sold&&(S.cat==='all'||a.c===S.cat)&&(S.region===REGIONS[0]||a.r===S.region)&&(!S.dist||a.dist===S.dist)
    &&(!q||a.n.toLowerCase().includes(q)||catName(a.c).toLowerCase().includes(q)||(a.x.breed||'').toLowerCase().includes(q)||(a.x.kind||'').toLowerCase().includes(q))
    &&(!S.pmin||a.p>=+S.pmin)&&(!S.pmax||a.p<=+S.pmax)&&(S.sex==='all'||a.sex===S.sex)&&(!S.breed||a.x.breed===S.breed)
    &&(!S.docsOnly||a.docs.length)&&(!S.videoOnly||a.video));
  const f={new:(a,b)=>b.ts-a.ts,cheap:(a,b)=>a.p-b.p,exp:(a,b)=>b.p-a.p,near:(a,b)=>a.km-b.km}[S.sort];
  return l.sort((a,b)=>(b.vip-a.vip)||f(a,b));
}
function rList(){
  if(!$('#cats'))return;
  const cl=$('#cats').scrollLeft;
  $('#cats').innerHTML=CATS.map(c=>`<button class="chip ${S.cat===c.id?'on':''}" onclick="S.cat='${c.id}';S.breed='';rList()">${c.n}</button>`).join('');
  $('#cats').scrollLeft=cl;
  const l=filtered(),tops=l.filter(a=>a.top),rest=l.filter(a=>!a.top);
  const saveRow=searchActive()?`<div class="row" style="margin-top:12px;gap:8px">
     <button class="chip" onclick="openSaveSearch()">${ic('bookmark',16)}Qidiruvni saqlash</button>
     <button class="chip" onclick="resetFilters()">${ic('x',16)}Tozalash</button><span class="t-caption faint" style="margin-left:auto">${l.length} ta e'lon</span></div>`:'';
  const viewToggle=`<div class="seg seg-sm" role="tablist"><button class="${S.view==='list'?'on':''}" onclick="S.view='list';rList()" aria-label="Ro'yxat">${ic('list',16)}Ro'yxat</button><button class="${S.view==='map'?'on':''}" onclick="S.view='map';rList()" aria-label="Xarita">${ic('map',16)}Xarita</button></div>`;
  if(S.view==='map'){$('#homeBody').innerHTML=saveRow+`<div class="section"><h2 class="t-title" style="font-size:20px">Xaritada</h2>${viewToggle}</div>`+mapView(l);return}
  $('#homeBody').innerHTML=saveRow+(l.length?'':emptyState('search','Hech narsa topilmadi','Boshqa hudud, kategoriya yoki filtrni tanlang',`<button class="btn secondary" style="margin-top:20px" onclick="resetFilters()">Filtrlarni tozalash</button>`))+
   (tops.length?`<div class="section"><h2 class="t-title" style="font-size:20px">TOP e'lonlar</h2><span class="t-caption faint">Reklama</span></div><div class="hscroll">${tops.map(card).join('')}</div>`:'')+
   (searchActive()?'':`<div class="section"><h2 class="t-headline">Xizmatlar</h2><a onclick="nav('services')">Barchasi</a></div>
     <div class="svc-row">${SVC_TYPES.map(t=>`<button class="svc" onclick="S.svc='${t.id}';nav('services')"><i>${ic(t.i,22)}</i><span>${t.n}</span></button>`).join('')}</div>
   <button class="promo" onclick="startPost()"><i>${ic('camera',22)}</i><div style="flex:1;text-align:left"><div class="t-headline">Hayvoningizni soting</div><div class="sub">E'lon joylash bepul — 2 daqiqa vaqt oladi</div></div>${ic('right',20)}</button>
   <button class="lostbanner" onclick="nav('lost')"><i>${ic('alert',22)}</i><div style="flex:1;text-align:left"><div class="t-headline">Yo'qolgan va topilgan hayvonlar</div><div class="t-caption" style="font-weight:400">${LOST.filter(x=>x.type==='lost').length} ta yo'qolgan · ${LOST.filter(x=>x.type==='found').length} ta topilgan · bepul</div></div>${ic('right',20)}</button>`)+
   (rest.length?`<div class="section"><h2 class="t-title" style="font-size:20px">${S.sort==='near'?'Sizga yaqin':"So'nggi e'lonlar"}</h2>${viewToggle}</div>
    <div class="row" style="margin:-4px 0 4px;gap:8px"><button class="link" onclick="openFilter()">${ic('sliders',16)}Saralash: ${({new:'yangilari',cheap:'arzonroq',exp:'qimmatroq',near:'menga yaqin'})[S.sort]}</button></div>${rest.map(lrow).join('')}`:'');
}
function resetFilters(){Object.assign(S,{cat:'all',region:REGIONS[0],dist:'',q:'',sort:'new',pmin:'',pmax:'',sex:'all',breed:'',docsOnly:false,videoOnly:false});refresh()}

/* ---------- schematic map of Uzbekistan ---------- */
const UZ_OUTLINE=[[56,41.3],[56,45],[58.6,45.6],[59.9,44.9],[61.1,44.2],[62.1,43.5],[64.5,43.6],[65.6,43.1],[66.1,42],[66.6,41.9],[67.9,41.1],[68.6,40.6],[69.1,41.4],[70.1,42.1],[70.9,42.3],[71.2,41.9],[70.5,41.5],[71.6,41.6],[72.2,41.2],[73.1,40.9],[72.8,40.4],[71.8,40.2],[70.9,40.2],[70.4,40.5],[69.4,40.3],[69.3,39.6],[68.5,39.5],[67.5,39.4],[67.8,38.9],[68.4,38.2],[68.1,37.4],[67.3,37.2],[66.6,37.4],[66.5,38],[65.5,38.3],[64.2,38.9],[62.4,39.9],[61.9,41.1],[60.1,41.5],[58.6,42.7],[57.2,41.4]];
function mapView(l){
  const W=400,H=230,x=lon=>(lon-55.5)/(73.6-55.5)*W,y=lat=>(45.9-lat)/(45.9-36.9)*H;
  const byR={};l.forEach(a=>(byR[a.r]=byR[a.r]||[]).push(a));
  const pts=UZ_OUTLINE.map(([a,b])=>x(a).toFixed(1)+','+y(b).toFixed(1)).join(' ');
  const pins=Object.entries(byR).map(([r,list])=>{const [lo,la]=GEO[r];const cx=x(lo),cy=y(la);
    return `<g class="pin" onclick="mapPick(REGIONS[${REGIONS.indexOf(r)}])" tabindex="0" role="button" aria-label="${esc(r)}: ${list.length}"><circle cx="${cx}" cy="${cy}" r="14" class="pin-hit"/><circle cx="${cx}" cy="${cy}" r="${9+Math.min(6,list.length*1.5)}" class="pin-dot"/><text x="${cx}" y="${cy+4}" text-anchor="middle" class="pin-num">${list.length}</text></g>`}).join('');
  const mine=[x(GEO[ME_AT.r][0]),y(GEO[ME_AT.r][1])];
  return `<div class="mapbox"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="E'lonlar xaritasi"><polygon points="${pts}" class="land"/>${pins}
    <circle cx="${mine[0]+10}" cy="${mine[1]-12}" r="5" class="me"/><text x="${mine[0]+18}" y="${mine[1]-9}" class="me-lbl">Siz</text></svg>
    <div class="t-caption faint" style="font-weight:400;padding:0 12px 10px">Sxematik xarita. Doiradagi raqam — hududdagi e'lonlar soni.</div></div>
    <div id="mapList" style="margin-top:12px">${Object.keys(byR).length?'<p class="muted center t-callout" style="font-weight:400">Hududni tanlang</p>':emptyState('map',"E'lonlar yo'q",'')}</div>`;
}
function mapPick(r){const l=filtered().filter(a=>a.r===r);$('#mapList').innerHTML=`<div class="row between" style="margin-bottom:6px"><h3 class="t-headline">${r}</h3><span class="t-caption faint">${l.length} ta e'lon</span></div>`+l.map(lrow).join('')}

/* ---------- favourites ---------- */
R.fav=el=>{const l=ADS.filter(a=>isFav(a.id));el.innerHTML=`<h1 class="large-title">Saqlangan</h1>
  <button class="cell group" style="margin-bottom:12px" onclick="nav('savedSearches')"><span class="ic">${ic('bookmark',20)}</span>Saqlangan qidiruvlar<span class="val">${S.saved.length} ${ic('right',18)}</span></button>`+(l.length?l.map(lrow).join(''):
  emptyState('heart',"Saqlangan e'lonlar yo'q","Yoqqan e'londagi yurakcha belgisini bosing",`<button class="btn secondary" style="margin-top:20px" onclick="tabTo('home')">E'lonlarni ko'rish</button>`))};

/* ---------- ad detail ---------- */
const FIELD_ROWS=a=>[['Kategoriya',catName(a.c)],['Turi',a.x.kind],['Zoti',a.x.breed],['Yoshi',a.age],['Jinsi',a.sex],['Vazni',a.w],['Soni',a.x.heads?a.x.heads+' bosh':''],['Sut (kuniga)',a.x.milk?a.x.milk+' litr':''],['Tuxum beradi',a.x.eggs?'Ha':'']].filter(r=>r[1]&&r[1]!=='—');
R.detail=(el,id)=>{
  const a=ad(id);if(!a){el.innerHTML=navBar('')+emptyState('info',"E'lon topilmadi",'');$('#cta').innerHTML='';return}
  const sl=SELLERS[a.s],rt=sellerRating(a.s),sim=ADS.filter(x=>x.c===a.c&&x.id!==a.id&&!x.sold).slice(0,6);
  el.innerHTML=`
   <div class="gal"><div class="gal-track" id="gal" onscroll="$('#pg').textContent=Math.round(this.scrollLeft/this.clientWidth)+1+' / ${a.img.length}'">${a.img.map(src=>photoTag(src,a.c)).join('')}</div>
    <button class="icon-btn float" style="left:20px" onclick="back()" aria-label="Orqaga">${ic('back',20)}</button>
    <div class="acts"><button class="icon-btn float" onclick="share(${a.id})" aria-label="Ulashish">${ic('share',20)}</button>
     <button class="icon-btn float" onclick="toggleFav(${a.id})" aria-label="Saqlash">${ic('heart',20,isFav(a.id)?{fill:1,c:'#c2372c'}:{})}</button></div>
    ${a.video?`<button class="vidbtn" onclick="openVideo(${a.id})">${ic('play',14,{fill:1})}Video</button>`:''}
    <span class="pager num" id="pg">1 / ${a.img.length}</span></div>
   <div class="dsheet">
    <div class="bdgrow" style="margin-bottom:10px">${a.sold?'<span class="badge gray">Sotilgan</span>':''}${cardBadges(a)}${a.pt==='free'?freeBadge:''}${a.docs.length?docsBadge:''}</div>
    <div class="t-display num ${a.pt==='free'?'is-free':''}" style="font-size:26px;letter-spacing:0">${priceText(a)}</div>
    ${a.pt==='neg'?'<div class="t-caption faint" style="font-weight:500">Narxi kelishiladi</div>':''}
    <div class="t-headline ugc" style="font-weight:500;margin-top:4px">${esc(a.n)}</div>
    <div class="meta" style="font-size:13px;margin-top:8px;flex-wrap:wrap">${ic('pin',14)}${a.r}, ${a.dist} · ${a.km} km · ${a.t} · ${ic('eye',14)}<span class="num">${a.views}</span></div>
    <div class="section" style="margin-top:24px"><h3 class="t-headline">Xususiyatlari</h3></div>
    <div class="group">${FIELD_ROWS(a).map(([k,v])=>`<div class="cell"><span class="lbl">${k}</span><span class="rt">${esc(v)}</span></div>`).join('')}</div>
    ${a.docs.length?`<div class="section"><h3 class="t-headline">Hujjatlar</h3><span class="t-caption faint">Moderator tekshirgan</span></div>
     <div class="group">${a.docs.map(d=>`<div class="cell"><span class="ic" style="color:var(--brand-fg)">${ic('doc',20)}</span>${esc(d)}<span class="val" style="color:var(--brand-fg)">${ic('check',18)}</span></div>`).join('')}</div>`:''}
    <div class="section"><h3 class="t-headline">Tavsif</h3></div>
    <p class="muted ugc">${esc(a.d||'Tavsif kiritilmagan.')}</p>
    <div class="section"><h3 class="t-headline">Sotuvchi</h3></div>
    <div class="group"><button class="cell" style="min-height:76px" onclick="nav('seller','${a.s}')"><div class="avatar">${a.s==='me'?initials(S.name):sl.i}</div>
      <div style="flex:1;text-align:left;min-width:0"><div style="font-weight:600;display:flex;align-items:center;gap:4px"><span class="ugc">${a.s==='me'?esc(S.name):sl.biz?esc(sl.biz.name):sl.n}</span>${verBadge(a.s)}</div>
       <div class="t-caption faint" style="font-weight:400;display:flex;align-items:center;gap:4px">${rt.n?`<span class="stars">${stars(rt.avg,12)}</span><span class="num">${rt.avg.toFixed(1)}</span> · ${rt.n} ta sharh`:`${sl.since}-yildan beri`}</div></div>
      <span class="val">${sl.biz?'<span class="badge">Biznes</span>':''}${ic('right',18)}</span></button></div>
    <div class="callout" style="margin-top:16px">${ic('shield',20)}<span><b>Xavfsizlik:</b> hayvonni shaxsan ko'rmasdan oldindan to'lov qilmang.</span></div>
    ${a.s==='me'?`<button class="btn secondary" style="margin-top:16px" onclick="nav('stats',${a.id})">${ic('bar',20)}E'lon statistikasi</button>`:`<button class="btn text" style="margin-top:8px;color:var(--ink-3);font-weight:500;font-size:14px" onclick="openReport()">${ic('flag',16)}E'lon ustidan shikoyat qilish</button>`}
    ${sim.length?`<div class="section"><h3 class="t-headline">O'xshash e'lonlar</h3></div><div class="hscroll">${sim.map(card).join('')}</div>`:''}
   </div>`;
  $('#cta').innerHTML=a.s==='me'
   ?`<button class="btn secondary" onclick="adActions(${a.id})">${ic('more',20)}Boshqarish</button>${a.sold?'':`<button class="btn gold" onclick="nav('promote',${a.id})">${ic('star',18,{fill:1})}Reklama qilish</button>`}`
   :`<button class="btn secondary" onclick="requireAuth(()=>openChat(${a.id}))">${ic('chat',20)}Yozish</button><button class="btn" onclick="a_call(${a.id})">${ic('phone',20)}Qo'ng'iroq qilish</button>`;
};
function a_call(id){const a=ad(id);a.stats.calls[6]++;openCall(a.s)}
function share(id){const a=ad(id),txt=`${a.n} — ${priceText(a)}`;if(navigator.share)navigator.share({title:a.n,text:txt}).catch(()=>copyText(txt,'Havola nusxalandi'));else copyText(txt,'Havola nusxalandi')}
function openVideo(id){const a=ad(id);openSheet(`<h2 class="t-title" style="margin-bottom:12px">Video</h2><video src="${a.video}" controls playsinline style="width:100%;border-radius:12px;background:#000;max-height:60vh"></video>`)}
function openCall(s,name,ph){const sl=SELLERS[s]||{n:name,i:initials(name||'?'),ph};openSheet(`<div class="center"><div class="avatar" style="width:64px;height:64px;font-size:20px;margin:0 auto 12px">${sl.i}</div>
  <div class="t-headline">${esc(sl.n)}</div><div class="t-title num notr" style="margin:8px 0 20px;user-select:all">${sl.ph}</div></div>
  <a class="btn" href="tel:${sl.ph.replace(/\s/g,'')}">${ic('phone',20)}Qo'ng'iroq qilish</a>
  <button class="btn secondary" style="margin-top:10px" onclick="closeSheet();copyText('${sl.ph}','Raqam nusxalandi')">Raqamni nusxalash</button>
  <p class="t-caption faint center" style="margin-top:14px;font-weight:400">Qo'ng'iroqda «Jonivor» ilovasidan ekanligingizni ayting</p>`)}
function openReport(){openSheet(`<h2 class="t-title" style="margin-bottom:6px">Shikoyat sababi</h2><p class="muted" style="margin-bottom:16px">Moderatorlar 24 soat ichida ko'rib chiqadi.</p><div class="group">`+
  ['Firibgarlik yoki oldindan to\'lov so\'rash','Hayvon kasal yoki yomon holatda',"Noto'g'ri kategoriya yoki narx",'Hayvon allaqachon sotilgan','Boshqa sabab'].map(r=>`<button class="cell" onclick="closeSheet();toast('Shikoyatingiz yuborildi. Rahmat!')">${r}<span class="val">${ic('right',18)}</span></button>`).join('')+'</div>')}

/* ---------- seller / shop page with reviews ---------- */
R.seller=(el,s)=>{const sl=SELLERS[s],l=ADS.filter(a=>a.s===s&&!a.sold),nm=s==='me'?S.name:sl.n,rt=sellerRating(s),rv=REVIEWS.filter(r=>r.s===s);
  const biz=s==='me'&&S.biz?{name:S.biz.name,about:"Mening do'konim",hours:'—',cover:l[0]?.img[0]}:sl.biz;
  el.innerHTML=(biz?`<div class="shop-cover">${photoTag(biz.cover,'dog')}<button class="icon-btn float" style="position:absolute;left:20px;top:60px;z-index:3" onclick="back()" aria-label="Orqaga">${ic('back',20)}</button></div>
    <div class="shop-head"><div class="avatar shop-logo">${initials(biz.name)}</div><div class="t-title" style="display:flex;align-items:center;gap:6px;justify-content:center"><span class="ugc">${esc(biz.name)}</span>${verBadge(s,20)}</div>
    <div class="row" style="justify-content:center;gap:6px;margin-top:6px"><span class="badge">${ic('store',11)}Biznes hisob</span><span class="t-caption faint">${esc(nm)}</span></div>
    <p class="muted ugc t-callout center" style="font-weight:400;margin-top:10px">${esc(biz.about)}</p><div class="t-caption faint center" style="margin-top:4px;font-weight:400">${ic('clock',12).replace('<svg','<svg style="display:inline;vertical-align:-2px"')} ${esc(biz.hours)}</div></div>`
   :navBar('Sotuvchi')+`<div class="center" style="margin:8px 0 20px"><div class="avatar" style="width:80px;height:80px;font-size:26px;margin:0 auto 12px">${initials(nm)}</div>
   <div class="t-title" style="display:flex;align-items:center;gap:6px;justify-content:center"><span class="ugc">${esc(nm)}</span>${verBadge(s,20)}</div>
   <div class="muted t-callout" style="font-weight:400;margin-top:4px">${sl.since}-yildan beri «Jonivor»da</div>
   ${sl.verified?`<div class="t-caption" style="color:var(--blue);margin-top:6px">Shaxsi tasdiqlangan</div>`:`<div class="t-caption faint" style="margin-top:6px">Shaxsi tasdiqlanmagan</div>`}</div>`)+
   `<div class="${biz?'pad':''}"><div class="group stats"><div><b>${l.length}</b><span>E'lonlar</span></div><div><b>${rt.n?rt.avg.toFixed(1):'—'}</b><span>Reyting</span></div><div><b>${rt.n}</b><span>Sharhlar</span></div></div>
   <div class="section"><h2 class="t-headline">Sharhlar</h2>${s==='me'?'':`<a onclick="requireAuth(()=>openReview('${s}'))">Sharh yozish</a>`}</div>
   ${rv.length?`<div class="group">${rv.map(r=>`<div class="cell" style="flex-direction:column;align-items:stretch;padding:14px 16px;gap:4px"><div class="row between"><b style="font-weight:600" class="ugc">${esc(r.who)}</b><span class="stars">${stars(r.st,13)}</span></div>
     <div class="muted t-callout ugc" style="font-weight:400">${esc(r.x)}</div><div class="t-caption faint" style="font-weight:400">${r.date}</div></div>`).join('')}</div>`:'<p class="muted t-callout" style="font-weight:400">Hali sharhlar yo\'q.</p>'}
   <div class="section"><h2 class="t-headline">E'lonlari</h2></div>${l.map(lrow).join('')||emptyState('paw',"E'lonlar yo'q",'')}</div>`};
let RV={st:5};
function openReview(s){RV={st:5};openSheet(`<h2 class="t-title" style="margin-bottom:6px">Sharh yozish</h2><p class="muted" style="margin-bottom:16px">${esc(SELLERS[s].n)} bilan savdo qanday o'tdi?</p>
  <div class="rate" id="rate">${[1,2,3,4,5].map(i=>`<button aria-label="${i}" onclick="RV.st=${i};document.querySelectorAll('#rate button').forEach((b,j)=>b.classList.toggle('on',j<${i}))" class="${i<=5?'on':''}">${ic('star',34,{fill:1})}</button>`).join('')}</div>
  <div class="field" style="margin-top:16px"><label for="rvt">Izoh</label><textarea class="inp" id="rvt" placeholder="Hayvon holati, sotuvchi muomalasi…"></textarea></div>
  <button class="btn" style="margin-top:16px" onclick="REVIEWS.unshift({s:'${s}',who:S.name.split(' ')[0]+' '+(S.name.split(' ')[1]||'')[0]+'.',st:RV.st,x:$('#rvt').value.trim()||'Hammasi yaxshi.',date:'Bugun'});closeSheet();toast('Sharhingiz qo\\'shildi');refresh()">Yuborish</button>`)}

/* ---------- messages & chat (photos, location, quick replies, fraud warning) ---------- */
R.messages=el=>{el.innerHTML=`<h1 class="large-title">Xabarlar</h1>`+(!S.logged?emptyState('chat',"Xabarlarni ko'rish uchun kiring","Sotuvchilar bilan yozishmalar shu yerda bo'ladi",`<button class="btn" style="margin-top:20px" onclick="goLogin(()=>tabTo('messages'))">Kirish</button>`):
  THREADS.length?THREADS.map(t=>{const sl=SELLERS[t.who],m=t.msgs[t.msgs.length-1]||{x:'',t:''};const prev=m.img?'Rasm':m.loc?'Joylashuv':m.x;return `<button class="msg" onclick="nav('chat','${t.id}')"><div class="avatar">${sl.i}</div><div class="t"><div class="row between"><b style="font-weight:600;display:flex;gap:4px;align-items:center">${sl.n}${verBadge(t.who,14)}</b><time class="num">${m.t}</time></div>
   <div class="row between" style="align-items:flex-start"><p>${m.me?'Siz: ':''}<span class="ugc">${esc(prev)}</span></p>${t.unread?`<span class="unread num">${t.unread}</span>`:''}</div></div></button>`}).join(''):emptyState('chat',"Xabarlar yo'q",''))};
function openChat(adId){const a=ad(adId);let t=THREADS.find(t=>t.ad===a.id);if(!t){t={id:'t'+Date.now(),who:a.s,ad:a.id,unread:0,msgs:[]};THREADS.unshift(t)}nav('chat',t.id)}
const FRAUD=/(karta|kartа|8600|9860|5614|oldindan|avans|predopl|предоплат|перевод|\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b)/i;
const QUICK=["Hali sotuvdami?","Narxi kelishiladimi?","Qayerdasiz?","Ko'rgani borsam bo'ladimi?","Hujjatlari bormi?"];
function bubble(m){
  if(m.img)return `<div class="bubble photo-b ${m.me?'me':''}">${photoTag(m.img,'dog','','position:relative;width:200px;height:150px;border-radius:14px')}<small class="num">${m.t}</small></div>`;
  if(m.loc)return `<div class="bubble ${m.me?'me':''}"><a class="locb" href="https://www.google.com/maps?q=${m.loc.lat},${m.loc.lon}" target="_blank" rel="noopener">${ic('pin',18)}<span><b style="font-weight:600">Joylashuv</b><br>${esc(m.loc.label)}</span></a><small class="num">${m.t}</small></div>`;
  const warn=FRAUD.test(m.x)?`<div class="fraud">${ic('alert',18)}<div><b>Ehtiyot bo'ling!</b> Hayvonni ko'rmasdan oldindan pul o'tkazmang va karta ma'lumotlarini bermang.${m.me?'':`<br><button class="link" onclick="openReport()">Shikoyat qilish</button>`}</div></div>`:'';
  return `<div class="bubble ${m.me?'me':''}"><span class="ugc">${esc(m.x)}</span><small class="num">${m.t}</small></div>${warn}`;
}
R.chat=(el,tid)=>{const t=THREADS.find(x=>x.id===tid),sl=SELLERS[t.who],a=t.ad?ad(t.ad):null;t.unread=0;renderTabbar();
  el.innerHTML=`<div class="chat-head"><button class="icon-btn" onclick="back()">${ic('back',20)}</button><div class="avatar" style="width:38px;height:38px;font-size:13px">${sl.i}</div>
   <div style="flex:1"><div style="font-weight:600;display:flex;gap:4px;align-items:center">${sl.n}${verBadge(t.who,14)}</div><div class="t-caption" style="color:#34a36f;font-weight:400">Onlayn</div></div>
   <button class="icon-btn" onclick="openCall('${t.who}')">${ic('phone',20)}</button></div>
   <div class="chat-body" id="cb">${a?`<button class="mini" style="margin-bottom:12px" onclick="nav('detail',${a.id})">${mini(a)}${ic('right',18,{c:'var(--ink-3)'})}</button>`:''}
    ${t.msgs.length?'':'<p class="faint center t-callout" style="font-weight:400;margin-top:40px">Birinchi xabaringizni yozing yoki tayyor javobni tanlang</p>'}
    ${t.msgs.map(bubble).join('')}</div>
   <div class="chat-dock"><div class="chips quick">${QUICK.map((q,i)=>`<button class="chip" onclick="sendMsg('${t.id}',QUICK[${i}])">${q}</button>`).join('')}</div>
   <form class="chat-in" onsubmit="event.preventDefault();sendMsg('${t.id}')">
    <button type="button" class="attach" aria-label="Biriktirish" onclick="openAttach('${t.id}')">${ic('plus',22)}</button>
    <input id="ci" placeholder="Xabar yozing…" autocomplete="off"><button class="send" aria-label="Yuborish">${ic('send',20)}</button></form></div>`;
  setTimeout(()=>{const b=$('#cb');if(b)b.scrollTop=b.scrollHeight},0)};
function openAttach(tid){openSheet(`<h2 class="t-title" style="margin-bottom:16px">Biriktirish</h2><div class="group">
  <button class="cell" onclick="closeSheet();attachPhoto('${tid}')"><span class="ic">${ic('image',20)}</span>Rasm yuborish</button>
  <button class="cell" onclick="closeSheet();pushMsg('${tid}',{me:1,loc:{label:'Toshkent sh., Chilonzor tumani, 9-mavze',lat:41.285,lon:69.204},t:now()})"><span class="ic">${ic('locate',20)}</span>Joylashuvni yuborish</button></div>`)}
async function attachPhoto(tid){const f=await pickFiles('image/*');if(!f.length)return;const k=await readPhoto(f[0]);if(k)pushMsg(tid,{me:1,img:k,t:now()})}
function pushMsg(tid,m){const t=THREADS.find(x=>x.id===tid);t.msgs.push(m);refresh();autoReply(t)}
function sendMsg(tid,text){const v=(text??$('#ci').value).trim();if(!v)return;const t=THREADS.find(x=>x.id===tid);t.msgs.push({me:1,x:v,t:now()});refresh();$('#ci')?.focus();autoReply(t)}
function autoReply(t){clearTimeout(autoReply.h);autoReply.h=setTimeout(()=>{t.msgs.push({me:0,x:t.who==='support'?'Rahmat, murojaatingiz qabul qilindi. Tez orada javob beramiz.':'Rahmat, xabaringizni oldim. Tez orada javob beraman.',t:now()});
  const c=stack[stack.length-1];if(c.id==='chat'&&c.arg===t.id){refresh()}},1400)}

/* ---------- notifications ---------- */
R.notifs=el=>{el.innerHTML=navBar('Bildirishnomalar',NOTIFS.some(n=>n.u)?`<button class="link" style="width:auto" onclick="NOTIFS.forEach(n=>n.u=0);refresh()">Barchasi o'qildi</button>`:'')+(NOTIFS.length?`<div class="group">`+NOTIFS.map((n,i)=>`<button class="cell" style="align-items:flex-start;padding:14px 16px" onclick="NOTIFS[${i}].u=0;NOTIFS[${i}].go()"><span class="avatar" style="width:36px;height:36px">${ic(n.i,18)}</span>
  <div style="flex:1;text-align:left"><div style="font-weight:600">${n.t}</div><div class="muted t-callout" style="font-weight:400;margin-top:2px">${n.d}</div><div class="t-caption faint" style="margin-top:6px;font-weight:400">${n.time}</div></div>${n.u?'<span class="unread" style="min-width:8px;width:8px;height:8px;padding:0;margin-top:8px"></span>':''}</button>`).join('')+'</div>'
  :emptyState('bell',"Bildirishnomalar yo'q",''))};

/* ---------- sheets ---------- */
function openSheet(h,center){$('#modal').classList.toggle('center',!!center);$('#sheet').innerHTML=(center?'':'<div class="grab"></div>')+h;$('#modal').classList.add('on');$('#sheet').scrollTop=0}
function closeSheet(){$('#modal').classList.remove('on')}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeSheet()});
function openRegion(r){
  if(!r){openSheet(`<h2 class="t-title" style="margin-bottom:16px">Hududni tanlang</h2><div class="group">`+
    REGIONS.map((x,i)=>`<button class="cell" onclick="${i?`openRegion(REGIONS[${i}])`:`S.region=REGIONS[0];S.dist='';closeSheet();refresh()`}" style="${x===S.region?'font-weight:600':''}">${x}<span class="val">${x===S.region?ic('check',20,{c:'var(--brand-fg)'}):i?ic('right',18):''}</span></button>`).join('')+'</div>');return}
  const ds=DISTRICTS[r]||[];
  openSheet(`<div class="row" style="margin-bottom:16px"><button class="icon-btn" onclick="openRegion()" aria-label="Orqaga">${ic('back',20)}</button><h2 class="t-title">${r}</h2></div><div class="group">
    <button class="cell" onclick="S.region=REGIONS[${REGIONS.indexOf(r)}];S.dist='';closeSheet();refresh()" style="font-weight:600">Butun hudud<span class="val">${S.region===r&&!S.dist?ic('check',20,{c:'var(--brand-fg)'}):''}</span></button>`+
    ds.map((d,i)=>`<button class="cell" onclick="S.region=REGIONS[${REGIONS.indexOf(r)}];S.dist=DISTRICTS[REGIONS[${REGIONS.indexOf(r)}]][${i}];closeSheet();refresh()">${d}<span class="val">${S.dist===d?ic('check',20,{c:'var(--brand-fg)'}):''}</span></button>`).join('')+'</div>')}
let F={};
const seg=(key,opts)=>`<div class="seg">${opts.map(([v,l])=>`<button type="button" class="${F[key]===v?'on':''}" onclick="F.${key}=${JSON.stringify(v).replace(/"/g,'&quot;')};$('#fbody').innerHTML=filterBody()">${l}</button>`).join('')}</div>`;
function openFilter(){F={sort:S.sort,sex:S.sex,pmin:S.pmin,pmax:S.pmax,breed:S.breed,docsOnly:S.docsOnly,videoOnly:S.videoOnly};openSheet(`<div class="row between" style="margin-bottom:20px"><h2 class="t-title">Saralash va filtr</h2><button class="link" style="width:auto" onclick="F={sort:'new',sex:'all',pmin:'',pmax:'',breed:'',docsOnly:false,videoOnly:false};$('#fbody').innerHTML=filterBody()">Tozalash</button></div><div class="stack" id="fbody">${filterBody()}</div>`)}
function filterBody(){const br=BREEDS[S.cat];return `
 <div class="field"><label>Saralash</label>${seg('sort',[['new','Yangilari'],['near','Yaqinlari'],['cheap','Arzonroq'],['exp','Qimmatroq']])}</div>
 <div class="field"><label>Narx, so'm</label><div class="grid2"><input class="inp num" inputmode="numeric" placeholder="dan" value="${F.pmin}" oninput="F.pmin=this.value.replace(/\\D/g,'')"><input class="inp num" inputmode="numeric" placeholder="gacha" value="${F.pmax}" oninput="F.pmax=this.value.replace(/\\D/g,'')"></div></div>
 <div class="field"><label>Jinsi</label>${seg('sex',[['all','Hammasi'],['Erkak','Erkak'],["Urg'ochi","Urg'ochi"]])}</div>
 ${br?`<div class="field"><label>Zoti</label><div class="suffix"><select class="inp" onchange="F.breed=this.value"><option value="">Hammasi</option>${br.map(b=>`<option value="${esc(b)}" ${F.breed===b?'selected':''}>${b}</option>`).join('')}</select><span>${ic('chev',18)}</span></div></div>`:''}
 <div class="group">
  <button type="button" class="cell" role="switch" aria-checked="${F.docsOnly}" onclick="F.docsOnly=!F.docsOnly;$('#fbody').innerHTML=filterBody()"><span class="ic">${ic('doc',20)}</span>Faqat hujjatlilar<span class="switch ${F.docsOnly?'on':''}"></span></button>
  <button type="button" class="cell" role="switch" aria-checked="${F.videoOnly}" onclick="F.videoOnly=!F.videoOnly;$('#fbody').innerHTML=filterBody()"><span class="ic">${ic('video',20)}</span>Faqat videoli<span class="switch ${F.videoOnly?'on':''}"></span></button></div>
 <button class="btn" style="margin-top:8px" onclick="applyFilter()">Natijalarni ko'rsatish</button>`}
function applyFilter(){Object.assign(S,F);closeSheet();refresh();toast(`${filtered().length} ta e'lon topildi`)}

/* ---------- saved searches ---------- */
const SEARCH_KEYS=['cat','region','dist','q','sort','pmin','pmax','sex','breed'];
function searchLabel(p){return [p.dist||p.region,p.cat!=='all'?catName(p.cat):'',p.breed,p.q?`«${p.q}»`:'',p.pmax?`${money(p.pmax)} gacha`:''].filter(Boolean).join(' · ')}
function openSaveSearch(){requireAuth(()=>{const p={};SEARCH_KEYS.forEach(k=>p[k]=S[k]);
  openSheet(`<h2 class="t-title" style="margin-bottom:6px">Qidiruvni saqlash</h2><p class="muted" style="margin-bottom:16px">Shu shartlarga mos yangi e'lon chiqsa, xabar beramiz.</p>
   <div class="field"><label for="ssn">Nomi</label><input class="inp" id="ssn" value="${esc(searchLabel(p))}" maxlength="50"></div>
   <button class="btn" style="margin-top:16px" onclick="S.saved.unshift({id:Date.now(),label:$('#ssn').value.trim()||'Qidiruv',p:${esc(JSON.stringify(p))},on:true});store.set('saved',S.saved);closeSheet();toast('Qidiruv saqlandi')">Saqlash</button>`)})}
function applySaved(x){if(!x)return;Object.assign(S,x.p,{pmin:x.p.pmin||'',pmax:x.p.pmax||''});S.view='list';tabTo('home')}
R.savedSearches=el=>{el.innerHTML=navBar('Saqlangan qidiruvlar')+(S.saved.length?`<div class="group">`+S.saved.map((x,i)=>`<div class="cell" style="min-height:64px">
   <button style="flex:1;text-align:left;min-width:0" onclick="applySaved(S.saved[${i}])"><div class="title ugc">${esc(x.label)}</div><div class="t-caption faint" style="font-weight:400">${ADS.filter(a=>!a.sold&&(x.p.cat==='all'||a.c===x.p.cat)&&(x.p.region===REGIONS[0]||a.r===x.p.region)).length} ta e'lon</div></button>
   <button class="icon-btn" aria-label="Xabarnoma" style="${x.on?'color:var(--brand-fg)':''}" onclick="S.saved[${i}].on=!S.saved[${i}].on;store.set('saved',S.saved);toast(S.saved[${i}].on?'Xabarnoma yoqildi':"Xabarnoma o'chirildi");refresh()">${ic('bell',18)}</button>
   <button class="icon-btn" aria-label="O'chirish" onclick="S.saved.splice(${i},1);store.set('saved',S.saved);refresh()">${ic('trash',18)}</button></div>`).join('')+'</div>'
  :emptyState('bookmark',"Saqlangan qidiruvlar yo'q","Bosh sahifada filtr tanlang va «Qidiruvni saqlash»ni bosing"))};

/* ---------- post wizard ---------- */
let D={},step=0;
function blankDraft(){return {photos:[],video:null,c:'dog',n:'',age:'',w:'',sex:'Erkak',d:'',pt:'fixed',p:'',r:'Toshkent shahri',dist:'Chilonzor',ph:'90 123 45 67',x:{},docs:[]}}
function startPost(edit){requireAuth(()=>{const a=edit?ad(edit):null;
  D=a?{edit:a.id,photos:[...a.img],video:a.video,c:a.c,n:a.n,age:a.age==='—'?'':a.age,w:a.w==='—'?'':a.w.replace(/\s*kg$/,''),sex:a.sex,d:a.d,pt:a.pt,p:a.p?a.p.toLocaleString('ru-RU'):'',r:a.r,dist:a.dist,ph:'90 123 45 67',x:{...a.x},docs:[...a.docs]}:blankDraft();
  step=0;nav('post')})}
async function addPhotos(mode){closeSheet();
  if(mode==='sample'){const l=SAMPLE[D.c].length?SAMPLE[D.c]:SAMPLE.dog;D.photos.push(l[D.photos.length%l.length]);return refresh()}
  const files=(await pickFiles('image/*',{multiple:true,capture:mode==='camera'})).slice(0,5-D.photos.length);if(!files.length)return;
  toast('Rasm yuklanmoqda…');for(const f of files){const k=await readPhoto(f);if(k)D.photos.push(k)}refresh()}
function addPhoto(){if(D.photos.length>=5)return toast("Ko'pi bilan 5 ta rasm");openSheet(`<h2 class="t-title" style="margin-bottom:16px">Rasm qo'shish</h2><div class="group">
  <button class="cell" onclick="addPhotos('camera')"><span class="ic">${ic('camera',20)}</span>Kamera orqali suratga olish</button>
  <button class="cell" onclick="addPhotos('gallery')"><span class="ic">${ic('image',20)}</span>Galereyadan tanlash</button>
  <button class="cell" onclick="addPhotos('sample')"><span class="ic">${ic('paw',20)}</span>Namuna rasm qo'shish</button></div>`)}
async function addVideo(){const f=await pickFiles('video/*');if(!f.length)return;if(f[0].size>60e6)return toast('Video 60 MB dan oshmasin');D.video=URL.createObjectURL(f[0]);toast("Video qo'shildi");refresh()}
const STEPS=['Rasm va video',"Ma'lumotlar",'Narx va aloqa'];
function saveStep(){document.querySelectorAll('#s-post [data-k]').forEach(i=>{const k=i.dataset.k;if(k.startsWith('x.'))D.x[k.slice(2)]=i.type==='checkbox'?i.checked:i.value;else D[k]=i.value})}
function nextStep(){saveStep();
  if(step===0&&!D.photos.length)return toast("Kamida 1 ta rasm qo'shing");
  if(step===1&&!D.n.trim()){$('#f-n').closest('.field').classList.add('invalid');$('#f-n').focus();return}
  if(step===2){if(D.pt==='fixed'&&!+D.p.replace(/\D/g,'')){$('#f-p').closest('.field').classList.add('invalid');$('#f-p').focus();return}return publish()}
  step++;refresh()}
function prevStep(){saveStep();if(step>0&&step<3){step--;refresh()}else back()}
function catFields(){const c=D.c,x=D.x;let h='';
  if(BREEDS[c])h+=`<div class="field"><label>Zoti</label><div class="suffix"><select class="inp" data-k="x.breed"><option value="">Tanlang</option>${BREEDS[c].map(b=>`<option value="${esc(b)}" ${x.breed===b?'selected':''}>${b}</option>`).join('')}</select><span>${ic('chev',18)}</span></div></div>`;
  if(KINDS[c])h+=`<div class="field"><label>Turi</label><div class="suffix"><select class="inp" data-k="x.kind" onchange="saveStep();refresh()"><option value="">Tanlang</option>${KINDS[c].map(b=>`<option value="${esc(b)}" ${x.kind===b?'selected':''}>${b}</option>`).join('')}</select><span>${ic('chev',18)}</span></div></div>`;
  if(!BREEDS[c])h+=`<div class="field"><label>Zoti</label><input class="inp" data-k="x.breed" placeholder="${c==='farm'?"Masalan: Hisori, Qorako'l, Jaydari":'Masalan: guppi, pakana quyon'}" value="${esc(x.breed||'')}"></div>`;
  if(c==='farm')h+=`<div class="grid2"><div class="field"><label>Soni (bosh)</label><input class="inp num" data-k="x.heads" inputmode="numeric" placeholder="1" value="${esc(x.heads||'')}"></div>
     ${['Echki','Sigir yoki buzoq'].includes(x.kind)?`<div class="field"><label>Sut, litr/kun</label><input class="inp num" data-k="x.milk" inputmode="decimal" placeholder="3" value="${esc(x.milk||'')}"></div>`:'<div></div>'}</div>`;
  if(c==='bird'||x.kind==='Tovuq')h+=`<label class="cell group" style="cursor:pointer"><span class="ic">${ic('check',20)}</span>Tuxum beradi<input type="checkbox" data-k="x.eggs" ${x.eggs?'checked':''} style="margin-left:auto;width:22px;height:22px;accent-color:var(--brand)"></label>`;
  return h}
const DOC_TYPES=['Veterinar pasporti','Emlash guvohnomasi','Zot hujjati','Veterinar ma\'lumotnomasi'];
R.post=el=>{
  const head=step<3?`<div class="nav"><button class="icon-btn" onclick="prevStep()" aria-label="Orqaga">${ic(step?'back':'x',20)}</button><span class="t-headline">${D.edit?"E'lonni tahrirlash":"Yangi e'lon"}</span><span class="t-callout faint num" style="width:40px;text-align:right">${step+1}/3</span></div>
   <div class="steps">${[0,1,2].map(i=>`<i class="${i<=step?'on':''}"></i>`).join('')}</div><h1 class="t-title" style="margin-bottom:6px">${STEPS[step]}</h1>`:'';
  let b='';
  if(step===0)b=`<p class="muted" style="margin-bottom:20px">5 tagacha rasm va 1 ta qisqa video. Hayvon yorug' joyda, to'liq ko'rinsin.</p>
   <div class="photos">${[0,1,2,3,4].map(i=>i<D.photos.length?`<div class="ph filled ${i===0?'main':''}">${photoTag(D.photos[i],D.c,'','position:absolute;inset:0')}<button class="x" aria-label="O'chirish" onclick="D.photos.splice(${i},1);refresh()">${ic('x',14,{w:2.2})}</button>${i===0?'<span class="mainlbl">Asosiy</span>':''}</div>`:
     `<button class="ph ${i===0?'main':''}" onclick="addPhoto()"><div class="in">${ic(i===D.photos.length?'camera':'plus',i===0?30:22)}${i===0?"<span>Rasm qo'shish</span>":''}</div></button>`).join('')}</div>
   <div class="group" style="margin-top:12px">${D.video?`<div class="cell"><span class="ic" style="color:var(--brand-fg)">${ic('video',20)}</span>Video qo'shildi<button class="link" style="margin-left:auto;width:auto" onclick="D.video=null;refresh()">O'chirish</button></div>`
     :`<button class="cell" onclick="addVideo()"><span class="ic">${ic('video',20)}</span><div style="flex:1;text-align:left"><div>Video qo'shish</div><div class="t-caption faint" style="font-weight:400">15–30 soniya: harakati va holati ko'rinsin</div></div>${ic('plus',20)}</button>`}</div>
   <div class="callout" style="margin:24px 0">${ic('gift',20)}<span><b>E'lon joylash bepul.</b> Faqat reklama xizmatlari pullik.</span></div>
   <button class="btn" onclick="nextStep()">Davom etish</button>`;
  if(step===1)b=`<div class="stack" style="margin-top:14px">
   <div class="field"><label>Kategoriya</label><div class="chips">${CATS.slice(1).map(c=>`<button class="chip ${D.c===c.id?'on':''}" onclick="saveStep();D.c='${c.id}';D.x={};refresh()">${c.n}</button>`).join('')}</div></div>
   ${catFields()}
   <div class="field"><label for="f-n">Sarlavha</label><input class="inp" id="f-n" data-k="n" maxlength="60" placeholder="Masalan: Britaniya mushugi" value="${esc(D.n)}" oninput="this.closest('.field').classList.remove('invalid')"><div class="hint">Zoti va asosiy xususiyatini yozing</div><div class="err">Sarlavhani kiriting</div></div>
   <div class="grid2"><div class="field"><label>Yoshi</label><input class="inp" data-k="age" placeholder="8 oy" value="${esc(D.age)}"></div><div class="field"><label>Vazni</label><div class="suffix"><input class="inp num" data-k="w" inputmode="decimal" placeholder="3" value="${esc(D.w)}"><span>kg</span></div></div></div>
   <div class="field"><label>Jinsi</label><div class="seg">${SEXES.map((v,i)=>`<button type="button" class="${D.sex===v?'on':''}" onclick="saveStep();D.sex=SEXES[${i}];refresh()">${v}</button>`).join('')}</div></div>
   <div class="field"><label>Hujjatlar</label><div class="group">${DOC_TYPES.map((d,i)=>`<label class="cell" style="cursor:pointer"><span class="ic">${ic('doc',20)}</span>${d}<input type="checkbox" ${D.docs.includes(d)?'checked':''} onchange="saveStep();this.checked?D.docs.push(DOC_TYPES[${i}]):D.docs.splice(D.docs.indexOf(DOC_TYPES[${i}]),1);refresh()" style="margin-left:auto;width:22px;height:22px;accent-color:var(--brand)"></label>`).join('')}</div>
    <div class="hint">Moderator hujjat rasmini tekshirgach, e'longa «Hujjatli» belgisi qo'yiladi</div></div>
   <div class="field"><label>Tavsif</label><textarea class="inp" data-k="d" maxlength="600" placeholder="Xarakteri, emlanganligi, parvarishi…">${esc(D.d)}</textarea></div>
   <button class="btn" style="margin-top:8px" onclick="nextStep()">Davom etish</button></div>`;
  if(step===2){const ds=DISTRICTS[D.r]||[];b=`<div class="stack" style="margin-top:14px">
   <div class="field"><label>Narx turi</label><div class="seg">${[['fixed','Narx'],['neg','Kelishiladi'],['free','Bepul beraman']].map(([v,l])=>`<button type="button" class="${D.pt===v?'on':''}" onclick="saveStep();D.pt='${v}';refresh()">${l}</button>`).join('')}</div></div>
   ${D.pt==='free'?`<div class="callout">${ic('heart',20)}<span>Hayvonni yaxshi qo'lga bepul berayotganingiz uchun rahmat. E'lon «Bepul» belgisi bilan chiqadi.</span></div>`:
   `<div class="field"><label for="f-p">${D.pt==='neg'?'Taxminiy narx (ixtiyoriy)':'Narx'}</label><div class="suffix"><input class="inp num" id="f-p" data-k="p" inputmode="numeric" placeholder="800 000" value="${esc(D.p)}" oninput="const d=this.value.replace(/\\D/g,'').slice(0,11);this.value=d?(+d).toLocaleString('ru-RU'):'';this.closest('.field').classList.remove('invalid')"><span>so'm</span></div><div class="err">Narxni kiriting</div></div>`}
   <div class="grid2"><div class="field"><label>Hudud</label><div class="suffix"><select class="inp" data-k="r" onchange="saveStep();D.dist=(DISTRICTS[D.r]||[''])[0];refresh()">${REGIONS.slice(1).map(r=>`<option value="${esc(r)}" ${r===D.r?'selected':''}>${r}</option>`).join('')}</select><span>${ic('chev',18)}</span></div></div>
    <div class="field"><label>Tuman</label><div class="suffix"><select class="inp" data-k="dist">${ds.map(r=>`<option value="${esc(r)}" ${r===D.dist?'selected':''}>${r}</option>`).join('')}</select><span>${ic('chev',18)}</span></div></div></div>
   <div class="field"><label>Telefon raqam</label><div style="position:relative"><span class="prefix num">+998</span><input class="inp num" data-k="ph" style="padding-left:62px" value="${esc(D.ph)}" oninput="this.value=fmtPhone(this.value)"></div><div class="hint">Raqamingiz faqat e'lon sahifasida ko'rinadi</div></div>
   <div class="callout">${ic('check',20)}<span>E'lon moderatsiyadan so'ng, odatda 15 daqiqa ichida chiqadi.</span></div>
   <button class="btn" style="margin-top:8px" onclick="nextStep()">${D.edit?'Saqlash':'Bepul joylash'}</button></div>`}
  if(step===3)b=`<div class="center" style="padding-top:110px"><div class="ok">${ic('check',34,{w:2.2})}</div><h1 class="t-display" style="margin-bottom:8px">${D.edit?"O'zgarishlar saqlandi":"E'lon joylandi"}</h1>
   <p class="muted">Ko'proq xaridor ko'rishi uchun<br>uni reklama qilishingiz mumkin.</p><div style="height:32px"></div>
   <button class="btn gold" onclick="stack=[{id:'profile'}];nav('promote',${D.id})">${ic('star',18,{fill:1})}Reklama qilish</button>
   <button class="btn secondary" style="margin-top:10px" onclick="stack=[{id:'profile'}];nav('detail',${D.id})">E'lonni ko'rish</button>
   <button class="btn text" style="margin-top:6px" onclick="tabTo('home')">Bosh sahifaga</button></div>`;
  el.innerHTML=head+b;
};
function publish(){
  const w=D.w.trim(),x={...D.x};if(x.heads)x.heads=+x.heads||'';
  const data={n:D.n.trim(),c:D.c,age:D.age.trim()||'—',sex:D.sex,w:w?w+' kg':'—',pt:D.pt,p:D.pt==='free'?0:+String(D.p).replace(/\D/g,''),r:D.r,dist:D.dist,img:[...D.photos],video:D.video,d:D.d.trim(),x,docs:[...D.docs]};
  if(D.edit){const a=ad(D.edit);Object.assign(a,data);a.km=km(a.r,a.dist,a.id*7);D.id=D.edit}
  else{D.id=Date.now()%1e9;ADS.unshift(mkAd({id:D.id,...data,t:'Hozirgina',ts:99,s:'me',mine:1,views:0}))}
  step=3;refresh();
}

/* ---------- promotion: TOP / VIP / urgent / bump ---------- */
const SERVICES_PAID={
 top:{n:'TOP',i:'star',d:"Bosh sahifa va qidiruvning eng tepasida, «TOP» belgisi bilan.",plans:[{d:1,p:15000},{d:3,p:35000,hot:1},{d:7,p:70000}]},
 vip:{n:'VIP',i:'crown',d:"Oltin ramka va ro'yxatlarda har doim birinchi o'rin.",plans:[{d:7,p:99000,hot:1},{d:14,p:179000}]},
 urgent:{n:'Shoshilinch',i:'bolt',d:"«Shoshilinch» belgisi — tez sotish kerak bo'lganda.",plans:[{d:3,p:9000,hot:1},{d:7,p:19000}]}};
R.promote=(el,id)=>{const a=ad(id),svc=SERVICES_PAID[S.svcKind],plan=svc.plans[Math.min(S.plan,svc.plans.length-1)];
  el.innerHTML=navBar('Reklama qilish')+`<div class="mini" style="margin-bottom:20px">${mini(a)}<div class="bdgrow">${cardBadges(a)}</div></div>
  <div class="seg" style="margin-bottom:16px">${Object.entries(SERVICES_PAID).map(([k,v])=>`<button class="${S.svcKind===k?'on':''}" onclick="S.svcKind='${k}';S.plan=0;refresh()">${v.n}</button>`).join('')}</div>
  <div class="benefit" style="margin-bottom:18px">${ic(svc.i,22)}<span>${svc.d}</span></div>
  <div class="stack" style="gap:10px">${svc.plans.map((p,i)=>`<button class="plan ${plan===p?'on':''}" onclick="S.plan=${i};refresh()"><span class="radio"></span>
   <div style="text-align:left"><div class="t-headline">${p.d} kun</div>${p.hot?"<div class=\"t-caption\" style=\"color:var(--gold)\">Eng ko'p tanlanadi</div>":''}</div>
   <div class="pr"><div class="price" style="font-size:16px">${fmt(p.p)}</div><div class="t-caption faint num" style="font-weight:400">${money(Math.round(p.p/p.d))} so'm / kun</div></div></button>`).join('')}</div>
  ${payMethods()}
  <button class="btn gold" id="paybtn" onclick="payFor(${plan.p},'${svc.n} · ${plan.d} kun',${a.id},()=>{const a=ad(${a.id});a['${S.svcKind}']=1})">To'lash · ${fmt(plan.p)}</button>
  <div class="group" style="margin-top:20px"><button class="cell" onclick="bump(${a.id})"><span class="ic">${ic('up',20)}</span><div style="flex:1;text-align:left"><div>Tepaga ko'tarish</div><div class="t-caption faint" style="font-weight:400">${bumpFree(a)?'Bepul — 7 kunda bir marta':"Keyingi bepul ko'tarishgacha "+bumpDaysLeft(a)+' kun · 5 000 so\'m'}</div></div>${ic('right',18)}</button></div>`};
const PAY_METHODS=[['wallet','Hamyon'],['Click','Click'],['Payme','Payme'],['Uzcard','Uzcard'],['Humo','Humo']];
function payMethods(){return `<div class="field" style="margin:24px 0"><label>To'lov usuli</label><div class="chips notr">${PAY_METHODS.map(([k,l])=>`<button class="chip ${S.pay===k?'on':''}" onclick="S.pay='${k}';refresh()">${k==='wallet'?`${ic('wallet',16)}${tx('Hamyon')} · ${money(S.wallet)}`:l}</button>`).join('')}</div></div>`}
function payFor(sum,title,adId,done){
  if(S.pay==='wallet'&&S.wallet<sum){toast("Hamyonda mablag' yetarli emas");return openTopup(sum-S.wallet)}
  const b=$('#paybtn');if(b){b.disabled=true;b.innerHTML='<span class="spinner"></span>'}
  setTimeout(()=>{if(S.pay==='wallet')setWallet(S.wallet-sum);done&&done();
    WALLET_TX.unshift({k:'pay',t:title,ad:adId?ad(adId).n:'',sum:-sum,date:'Bugun, '+now(),m:S.pay==='wallet'?'Hamyon':S.pay});
    openSheet(`<div class="ok">${ic('check',34,{w:2.2})}</div><h2 class="t-title center">To'lov qabul qilindi</h2><p class="muted center" style="margin:8px 0 20px">${esc(title)}${adId?' · «'+esc(ad(adId).n)+'»':''}</p>
     <button class="btn" onclick="closeSheet();back()">Tayyor</button>`,true)},1100)}
const DAY=864e5,bumpFree=a=>!a.bump||Date.now()-a.bump>7*DAY,bumpDaysLeft=a=>Math.max(1,Math.ceil((7*DAY-(Date.now()-a.bump))/DAY));
function doBump(id){const a=ad(id);a.bump=Date.now();a.ts=100+Date.now()%1000;a.t='Hozirgina';toast("E'lon tepaga ko'tarildi");refresh()}
function bump(id){const a=ad(id);
  if(bumpFree(a))return doBump(id);
  if(S.wallet<5000){toast("Hamyonda mablag' yetarli emas");return openTopup(5000-S.wallet)}
  openSheet(`<h2 class="t-headline center">Tepaga ko'tarish · 5 000 so'm</h2><p class="muted center" style="margin:8px 0 20px">Hamyondan yechiladi. Balans: ${fmt(S.wallet)}</p>
   <button class="btn" onclick="setWallet(S.wallet-5000);WALLET_TX.unshift({k:'pay',t:'Tepaga ko\\'tarish',ad:ad(${id}).n,sum:-5000,date:'Bugun, '+now(),m:'Hamyon'});closeSheet();doBump(${id})">To'lash</button>
   <button class="btn text" style="margin-top:6px;color:var(--ink)" onclick="closeSheet()">Bekor qilish</button>`,true)}

/* ---------- wallet ---------- */
R.wallet=el=>{el.innerHTML=navBar('Hamyon')+`<div class="walletcard"><div class="t-caption" style="opacity:.8">Balans</div><div class="t-display num" style="color:#fff;letter-spacing:0">${fmt(S.wallet)}</div>
  <button class="btn" style="background:#fff;color:#1e4d3a;margin-top:16px" onclick="openTopup()">${ic('plus',20)}Hamyonni to'ldirish</button></div>
  <p class="t-caption faint" style="font-weight:400;margin:10px 2px 0">Hamyondan TOP, VIP, tepaga ko'tarish va biznes obuna uchun bir bosishda to'lanadi.</p>
  <div class="section"><h2 class="t-headline">Tarix</h2></div>
  <div class="group">${WALLET_TX.map(p=>`<div class="cell" style="padding:14px 16px;align-items:flex-start"><span class="avatar" style="width:36px;height:36px;${p.sum>0?'':'background:var(--gold-50);color:var(--gold)'}">${ic(p.sum>0?'plus':'star',16,p.sum>0?{}:{fill:1})}</span>
  <div style="flex:1;min-width:0"><div style="font-weight:600">${p.t}</div>${p.ad?`<div class="muted t-callout title ugc" style="font-weight:400">${esc(p.ad)}</div>`:''}<div class="t-caption faint" style="font-weight:400;margin-top:4px">${p.date} · <span class="notr">${p.m}</span></div></div>
  <div class="price" style="font-size:15px;${p.sum>0?'color:#2f9e63':''}">${p.sum>0?'+':'−'}${fmt(Math.abs(p.sum))}</div></div>`).join('')}</div>`};
let TU={sum:50000,m:'Click'};
function openTopup(min){TU={sum:Math.max(min||0,50000),m:'Click'};const amounts=[20000,50000,100000,200000];openSheet(`<h2 class="t-title" style="margin-bottom:16px">Hamyonni to'ldirish</h2>
  <div class="field"><label for="tus">Summa</label><div class="suffix"><input class="inp num" id="tus" inputmode="numeric" value="${money(TU.sum)}" oninput="const d=this.value.replace(/\\D/g,'').slice(0,9);TU.sum=+d;this.value=d?money(+d):''"><span>so'm</span></div></div>
  <div class="chips" style="margin-top:10px">${amounts.map(a=>`<button class="chip" onclick="TU.sum=${a};$('#tus').value=money(${a})">${money(a)}</button>`).join('')}</div>
  <div class="field" style="margin-top:16px"><label>To'lov usuli</label><div class="chips notr" id="tum">${['Click','Payme','Uzcard','Humo'].map(m=>`<button class="chip ${m===TU.m?'on':''}" onclick="TU.m='${m}';document.querySelectorAll('#tum .chip').forEach(c=>c.classList.toggle('on',c.textContent==='${m}'))">${m}</button>`).join('')}</div></div>
  <button class="btn" id="tub" style="margin-top:20px" onclick="doTopup()">To'ldirish</button>`)}
function doTopup(){if(TU.sum<1000)return toast("Eng kam summa 1 000 so'm");const b=$('#tub');b.disabled=true;b.innerHTML='<span class="spinner"></span>';
  setTimeout(()=>{setWallet(S.wallet+TU.sum);WALLET_TX.unshift({k:'top',t:"Hamyon to'ldirildi",sum:TU.sum,date:'Bugun, '+now(),m:TU.m});closeSheet();toast(`Balans: ${fmt(S.wallet)}`);refresh()},1000)}

/* ---------- ad statistics (7-day bar chart, one metric at a time) ---------- */
let statMetric='views';
R.stats=(el,id)=>{const a=ad(id),st=a.stats,sum=k=>st[k].reduce((x,y)=>x+y,0);
  const M={views:['Ko\'rishlar','eye'],calls:["Qo'ng'iroqlar",'phone'],saves:['Saqlashlar','heart']};
  el.innerHTML=navBar('Statistika')+`<button class="mini" onclick="nav('detail',${a.id})">${mini(a)}${ic('right',18,{c:'var(--ink-3)'})}</button>
  <div class="group stats" style="margin:16px 0">${Object.entries(M).map(([k,[l]])=>`<div><b>${sum(k)}</b><span>${l}</span></div>`).join('')}</div>
  <div class="seg" style="margin-bottom:12px">${Object.entries(M).map(([k,[l]])=>`<button class="${statMetric===k?'on':''}" onclick="statMetric='${k}';refresh()">${l}</button>`).join('')}</div>
  <div class="group chartbox"><div class="row between" style="padding:14px 16px 0"><div><div class="t-headline">${M[statMetric][0]}</div><div class="t-caption faint" style="font-weight:400">Oxirgi 7 kun</div></div><div class="t-title num">${sum(statMetric)}</div></div>
   ${barChart(st[statMetric])}<div class="t-caption faint center" id="tip" style="font-weight:400;padding:0 12px 12px;min-height:28px">Qiymatni ko'rish uchun ustunni bosing</div></div>
  <div class="callout" style="margin-top:16px">${ic('trend',20)}<span>Konversiya: har 100 ko'rishdan <b class="num">${Math.round(sum('calls')/Math.max(1,sum('views'))*100)}</b> ta qo'ng'iroq. TOP e'lonlarda bu ko'rsatkich o'rtacha 3 barobar yuqori.</span></div>
  ${a.top?'':`<button class="btn gold" style="margin-top:16px" onclick="nav('promote',${a.id})">${ic('star',18,{fill:1})}Reklama qilish</button>`}`};
function barChart(v){const W=400,H=180,pl=34,pr=12,pt=16,pb=28,max=Math.max(4,...v),nice=Math.ceil(max/4)*4,bw=(W-pl-pr)/v.length,y=n=>pt+(H-pt-pb)*(1-n/nice);
  const grid=[0,.5,1].map(f=>`<line x1="${pl}" x2="${W-pr}" y1="${y(nice*f)}" y2="${y(nice*f)}" class="gl"/><text x="${pl-6}" y="${y(nice*f)+4}" text-anchor="end" class="ax">${Math.round(nice*f)}</text>`).join('');
  const mi=v.indexOf(Math.max(...v));
  const bars=v.map((n,i)=>{const x=pl+i*bw+bw*.2,w=bw*.6,top=y(n),h=Math.max(0,y(0)-top),r=Math.min(4,w/2,h);
    const d=h?`M${x},${y(0)}V${top+r}Q${x},${top} ${x+r},${top}H${x+w-r}Q${x+w},${top} ${x+w},${top+r}V${y(0)}Z`:'';
    return `<g class="barg" onclick="$('#tip').textContent='${DAYS[i]}: '+${n}" onmouseenter="$('#tip').textContent='${DAYS[i]}: '+${n}"><rect x="${pl+i*bw}" y="${pt}" width="${bw}" height="${H-pt-pb}" class="hit"/><path d="${d}" class="bar ${i===6?'today':''}"/>
      ${i===mi?`<text x="${x+w/2}" y="${top-5}" text-anchor="middle" class="val">${n}</text>`:''}<text x="${x+w/2}" y="${H-8}" text-anchor="middle" class="ax">${DAYS[i]}</text></g>`}).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="7 kunlik ustunli grafik">${grid}${bars}</svg>`}

/* ---------- services ---------- */
R.services=el=>{const l=SERVICES.filter(s=>s.type===S.svc);
  el.innerHTML=navBar('Xizmatlar')+`<div class="chips" style="margin-bottom:16px">${SVC_TYPES.map(t=>`<button class="chip ${S.svc===t.id?'on':''}" onclick="S.svc='${t.id}';refresh()">${ic(t.i,16)}${t.n}</button>`).join('')}</div>`+
  (l.length?`<div class="group">${l.map(s=>`<button class="cell" style="min-height:84px;align-items:flex-start;padding:14px 16px" onclick="nav('service',${s.id})"><span class="avatar" style="border-radius:12px">${ic(SVC_TYPES.find(t=>t.id===s.type).i,20)}</span>
   <div style="flex:1;min-width:0;text-align:left"><div style="font-weight:600" class="ugc">${esc(s.n)}</div><div class="t-caption faint" style="font-weight:400;display:flex;gap:4px;align-items:center;margin-top:2px"><span class="stars">${stars(s.st,12)}</span><span class="num">${s.st}</span> · ${s.r}</div>
   <div class="t-caption ugc" style="font-weight:500;color:var(--brand-fg);margin-top:4px">${esc(s.price)}</div></div>${ic('right',18,{c:'var(--ink-3)'})}</button>`).join('')}</div>`:emptyState('store',"Bu hududda xizmatlar yo'q",''))+
  `<div class="callout" style="margin-top:16px">${ic('store',20)}<span>Xizmat ko'rsatasizmi? <button class="link" onclick="nav('business')">Biznes hisob oching</button> va shu yerda reklama joylang.</span></div>`};
R.service=(el,id)=>{const s=SERVICES.find(x=>x.id===id),t=SVC_TYPES.find(x=>x.id===s.type);
  el.innerHTML=navBar(t.n)+`<div class="center" style="margin:8px 0 20px"><div class="avatar" style="width:72px;height:72px;border-radius:20px;margin:0 auto 12px">${ic(t.i,32)}</div>
   <div class="t-title ugc">${esc(s.n)}</div><div class="t-callout faint" style="font-weight:400;margin-top:4px;display:flex;gap:6px;justify-content:center;align-items:center"><span class="stars">${stars(s.st)}</span><span class="num">${s.st}</span></div></div>
   <div class="group"><div class="cell"><span class="lbl">Manzil</span><span class="rt">${s.r}, ${s.dist}</span></div><div class="cell"><span class="lbl">Narx</span><span class="rt ugc">${esc(s.price)}</span></div><div class="cell"><span class="lbl">Telefon</span><span class="rt num notr" style="user-select:all">${s.ph}</span></div></div>
   <div class="section"><h3 class="t-headline">Tavsif</h3></div><p class="muted ugc">${esc(s.d)}</p>`;
  $('#cta').innerHTML=`<button class="btn secondary" onclick="copyText('${s.ph}','Raqam nusxalandi')">Nusxalash</button><button class="btn" onclick="openCall(null,SERVICES.find(x=>x.id===${s.id}).n,SERVICES.find(x=>x.id===${s.id}).ph)">${ic('phone',20)}Qo'ng'iroq qilish</button>`};

/* ---------- lost & found ---------- */
R.lost=el=>{const l=LOST.filter(x=>x.type===S.lostTab);
  el.innerHTML=navBar("Yo'qolgan va topilgan",`<button class="icon-btn" aria-label="E'lon berish" onclick="requireAuth(()=>nav('lostPost'))">${ic('plus',20)}</button>`)+
  `<div class="seg" style="margin-bottom:16px"><button class="${S.lostTab==='lost'?'on':''}" onclick="S.lostTab='lost';refresh()">Yo'qolgan</button><button class="${S.lostTab==='found'?'on':''}" onclick="S.lostTab='found';refresh()">Topilgan</button></div>
  <div class="callout" style="margin-bottom:8px">${ic('heart',20)}<span>Bu bo'limda e'lon berish har doim bepul. Hayvon topilsa yoki egasi chiqsa, e'lonni yoping.</span></div>`+
  (l.length?l.map(x=>`<div class="lrow" onclick="nav('lostDetail',${x.id})">${photoTag(x.img[0],x.c)}<div class="b"><div class="row" style="gap:6px"><span class="badge ${x.type==='lost'?'lostb':''}">${x.type==='lost'?"Yo'qolgan":'Topilgan'}</span>${x.reward?`<span class="badge top">Mukofot</span>`:''}</div>
    <div class="title ugc" style="margin-top:6px;font-weight:600">${esc(x.n)}</div><div class="meta">${ic('pin',13)}${x.r}, ${x.dist}</div><div class="meta">${x.t}</div></div></div>`).join(''):emptyState('paw',"E'lonlar yo'q",''))+
  `<button class="btn" style="margin-top:16px" onclick="requireAuth(()=>nav('lostPost'))">${ic('plus',20)}Bepul e'lon berish</button>`};
R.lostDetail=(el,id)=>{const x=LOST.find(i=>i.id===id);
  el.innerHTML=`<div class="gal">${photoTag(x.img[0],x.c,'','position:absolute;inset:0')}<button class="icon-btn float" style="left:20px" onclick="back()" aria-label="Orqaga">${ic('back',20)}</button></div>
   <div class="dsheet"><div class="bdgrow" style="margin-bottom:10px"><span class="badge ${x.type==='lost'?'lostb':''}">${x.type==='lost'?"Yo'qolgan":'Topilgan'}</span>${x.reward?`<span class="badge top">Mukofot: ${fmt(x.reward)}</span>`:''}</div>
    <h1 class="t-title ugc">${esc(x.n)}</h1><div class="meta" style="font-size:13px;margin-top:8px">${ic('pin',14)}${x.r}, ${x.dist} · ${x.t}</div>
    <div class="section"><h3 class="t-headline">Tavsif</h3></div><p class="muted ugc">${esc(x.d)}</p>
    <div class="callout" style="margin-top:16px">${ic('shield',20)}<span>Mukofot uchun oldindan pul so'rashsa, bu firibgarlik. Hayvonni ko'rmasdan pul o'tkazmang.</span></div></div>`;
  $('#cta').innerHTML=`<button class="btn secondary" onclick="share2(LOST.find(i=>i.id===${x.id}).n)">${ic('share',20)}Ulashish</button><button class="btn" onclick="openCall(null,'${x.type==='lost'?'Egasi':'Topgan odam'}','${x.ph}')">${ic('phone',20)}Qo'ng'iroq qilish</button>`};
function share2(t){if(navigator.share)navigator.share({text:t}).catch(()=>copyText(t,'Matn nusxalandi'));else copyText(t,'Matn nusxalandi')}
let LP={};
R.lostPost=el=>{if(!LP.type)LP={type:'lost',c:'dog',photos:[]};
  el.innerHTML=navBar("Bepul e'lon")+`<div class="stack">
  <div class="seg"><button class="${LP.type==='lost'?'on':''}" onclick="lpSave();LP.type='lost';refresh()">Yo'qotdim</button><button class="${LP.type==='found'?'on':''}" onclick="lpSave();LP.type='found';refresh()">Topdim</button></div>
  <div class="photos">${LP.photos.map((k,i)=>`<div class="ph filled">${photoTag(k,LP.c,'','position:absolute;inset:0')}<button class="x" onclick="LP.photos.splice(${i},1);refresh()">${ic('x',14,{w:2.2})}</button></div>`).join('')}
   ${LP.photos.length<3?`<button class="ph" onclick="lpPhoto()"><div class="in">${ic('camera',24)}<span>Rasm</span></div></button>`:''}</div>
  <div class="field"><label>Kategoriya</label><div class="chips">${CATS.slice(1).map(c=>`<button class="chip ${LP.c===c.id?'on':''}" onclick="lpSave();LP.c='${c.id}';refresh()">${c.n}</button>`).join('')}</div></div>
  <div class="field"><label for="lpn">Sarlavha</label><input class="inp" id="lpn" value="${esc(LP.n||'')}" placeholder="${LP.type==='lost'?'Masalan: Ovcharka yo\'qoldi':'Masalan: Mushukcha topildi'}"></div>
  <div class="field"><label for="lpd">Qayerda va qachon, belgilari</label><textarea class="inp" id="lpd" placeholder="Bo'yinbog'i, rangi, laqabi…">${esc(LP.d||'')}</textarea></div>
  <div class="field"><label for="lpr">Hudud</label><div class="suffix"><select class="inp" id="lpr">${REGIONS.slice(1).map(r=>`<option value="${esc(r)}" ${r===(LP.r||'Toshkent shahri')?'selected':''}>${r}</option>`).join('')}</select><span>${ic('chev',18)}</span></div></div>
  ${LP.type==='lost'?`<div class="field"><label for="lpw">Mukofot (ixtiyoriy)</label><div class="suffix"><input class="inp num" id="lpw" inputmode="numeric" value="${esc(LP.w||'')}" placeholder="0"><span>so'm</span></div></div>`:''}
  <button class="btn" onclick="lpPublish()">Bepul joylash</button></div>`};
function lpSave(){LP.n=$('#lpn')?.value??LP.n;LP.d=$('#lpd')?.value??LP.d;LP.r=$('#lpr')?.value??LP.r;LP.w=$('#lpw')?.value??LP.w}
async function lpPhoto(){lpSave();const f=await pickFiles('image/*');if(!f.length)return;const k=await readPhoto(f[0]);if(k){LP.photos.push(k);refresh()}}
function lpPublish(){lpSave();if(!(LP.n||'').trim())return toast('Sarlavhani kiriting');
  LOST.unshift({id:Date.now()%1e9,type:LP.type,c:LP.c,n:LP.n.trim(),r:LP.r||'Toshkent shahri',dist:(DISTRICTS[LP.r||'Toshkent shahri']||[''])[0],t:'Hozirgina',img:LP.photos.length?LP.photos:[SAMPLE[LP.c]?.[0]||'shepherd'],ph:SELLERS.me.ph,reward:+String(LP.w||'').replace(/\D/g,'')||0,d:(LP.d||'').trim()});
  S.lostTab=LP.type;LP={};back();toast("E'lon joylandi")}

/* ---------- profile, my ads, verification, business, settings ---------- */
const myAds=()=>ADS.filter(a=>a.mine);
const verifyState=()=>['Tasdiqlanmagan','Tekshirilmoqda','Tasdiqlangan'][S.verified];
R.profile=el=>{
  if(!S.logged){el.innerHTML=`<h1 class="large-title">Profil</h1>`+emptyState('user','Tizimga kiring',"E'lon joylash va sotuvchilarga yozish uchun",`<button class="btn" style="margin-top:20px" onclick="goLogin(()=>tabTo('profile'))">Kirish</button>`)+
    `<div class="section"><h2 class="t-headline">Boshqa</h2></div>${otherGroup()}<div class="section"><h2 class="t-headline">Sozlamalar</h2></div>${settingsGroup()}`;return}
  const act=myAds().filter(a=>!a.sold);
  el.innerHTML=`<div class="row between"><h1 class="large-title" style="margin:0">Profil</h1><button class="icon-btn" aria-label="Sozlamalar" onclick="nav('settings')">${ic('gear',20)}</button></div>
  <button class="row" style="margin:20px 0 16px;width:100%" onclick="nav('editProfile')"><div class="avatar" style="width:56px;height:56px;font-size:18px">${initials(S.name)}</div>
   <div style="flex:1;text-align:left"><div class="t-headline" style="display:flex;gap:6px;align-items:center"><span class="ugc">${esc(S.name)}</span>${verBadge('me',18)}${S.biz?'<span class="badge">Biznes</span>':''}</div><div class="muted num t-callout notr" style="font-weight:400">+998 90 123 45 67</div></div>${ic('right',20,{c:'var(--ink-3)'})}</button>
  ${S.verified<2?`<button class="verify-cta" onclick="nav('verify')">${ic('verified',22)}<div style="flex:1;text-align:left"><div style="font-weight:600">${S.verified?'Hujjatlaringiz tekshirilmoqda':'Hisobingizni tasdiqlang'}</div><div class="t-caption" style="font-weight:400">${S.verified?'Odatda 1 soat ichida':"Tasdiqlangan sotuvchilarga 2 barobar ko'p qo'ng'iroq qilishadi"}</div></div>${ic('right',18)}</button>`:''}
  <button class="walletrow" onclick="nav('wallet')">${ic('wallet',22)}<div style="flex:1;text-align:left"><div class="t-caption" style="font-weight:400;opacity:.8">Hamyon</div><div class="t-headline num">${fmt(S.wallet)}</div></div><span class="chip" style="height:32px">To'ldirish</span></button>
  <div class="group stats" style="margin-top:16px"><div><b>${act.length}</b><span>Faol e'lon</span></div><div><b>${myAds().reduce((s,a)=>s+a.views,0)}</b><span>Ko'rishlar</span></div><div><b>${myAds().reduce((s,a)=>s+a.stats.calls.reduce((x,y)=>x+y,0),0)}</b><span>Qo'ng'iroqlar</span></div></div>
  <div class="section"><h2 class="t-headline">Mening e'lonlarim</h2><a onclick="nav('myads')">Barchasi</a></div>
  ${act.length?`<div class="group">${act.slice(0,3).map(myAdCell).join('')}</div>`:`<div class="group"><button class="cell" onclick="startPost()"><span class="ic">${ic('plus',20)}</span>Birinchi e'loningizni joylang</button></div>`}
  <div class="section"><h2 class="t-headline">Boshqa</h2></div>${otherGroup()}
  <div class="section"><h2 class="t-headline">Sozlamalar</h2></div>${settingsGroup()}
  <div class="group" style="margin-top:16px"><button class="cell" style="color:var(--red)" onclick="confirmLogout()">${ic('logout',20)}Chiqish</button></div>`;
};
const otherGroup=()=>`<div class="group">
  ${S.logged?`<button class="cell" onclick="nav('business')"><span class="ic">${ic('store',20)}</span>Biznes hisob<span class="val">${S.biz?S.biz.plan:"Do'kon ochish"} ${ic('right',18)}</span></button>`:''}
  <button class="cell" onclick="nav('savedSearches')"><span class="ic">${ic('bookmark',20)}</span>Saqlangan qidiruvlar<span class="val">${S.saved.length} ${ic('right',18)}</span></button>
  <button class="cell" onclick="nav('services')"><span class="ic">${ic('vet',20)}</span>Xizmatlar<span class="val">${ic('right',18)}</span></button>
  <button class="cell" onclick="nav('lost')"><span class="ic">${ic('alert',20)}</span>Yo'qolgan va topilgan<span class="val">${ic('right',18)}</span></button></div>`;
const myAdCell=a=>`<div class="cell" style="min-height:80px;cursor:pointer" onclick="nav('detail',${a.id})">${photoTag(a.img[0],a.c,'','width:56px;height:56px;border-radius:10px;flex:none')}
   <div style="flex:1;min-width:0"><div class="title ugc">${esc(a.n)}</div><div class="t-caption faint num" style="font-weight:400;margin-top:2px;display:flex;gap:4px;align-items:center">${priceText(a)} · ${ic('eye',12)}${a.views}</div></div>
   ${a.sold?'<span class="badge gray">Sotilgan</span>':a.top?topBadge:a.vip?vipBadge:`<button class="chip" style="height:32px;color:var(--gold);box-shadow:inset 0 0 0 1px var(--gold-200)" onclick="event.stopPropagation();nav('promote',${a.id})">${ic('star',14,{fill:1})}<span class="notr">TOP</span></button>`}
   <button aria-label="Amallar" onclick="event.stopPropagation();adActions(${a.id})" style="color:var(--ink-3);padding:8px 0 8px 2px">${ic('more',20)}</button></div>`;
R.verify=el=>{const done=S.verified;el.innerHTML=navBar('Hisobni tasdiqlash')+`<p class="muted" style="margin-bottom:20px">Tasdiqlangan sotuvchi belgisi xaridorlarga ishonch beradi. Hujjatingiz faqat tekshiruv uchun ishlatiladi va boshqalarga ko'rsatilmaydi.</p>
  <div class="group">
   <div class="cell" style="min-height:64px"><span class="stepn done">${ic('check',16,{w:2.4})}</span><div style="flex:1"><div>Telefon raqam</div><div class="t-caption faint num notr" style="font-weight:400">+998 90 123 45 67</div></div></div>
   <button class="cell" style="min-height:64px" onclick="verifyDoc()" ${done?'disabled':''}><span class="stepn ${VF.id||done?'done':''}">${VF.id||done?ic('check',16,{w:2.4}):'2'}</span><div style="flex:1;text-align:left"><div>Pasport yoki ID-karta rasmi</div><div class="t-caption faint" style="font-weight:400">${VF.id||done?'Yuklandi':'Old tomoni, barcha yozuvlar o\'qilsin'}</div></div>${VF.id||done?'':ic('camera',20)}</button>
   <button class="cell" style="min-height:64px" onclick="verifySelfie()" ${done?'disabled':''}><span class="stepn ${VF.selfie||done?'done':''}">${VF.selfie||done?ic('check',16,{w:2.4}):'3'}</span><div style="flex:1;text-align:left"><div>Hujjat bilan selfi</div><div class="t-caption faint" style="font-weight:400">${VF.selfie||done?'Yuklandi':'Yuzingiz va hujjat birga ko\'rinsin'}</div></div>${VF.selfie||done?'':ic('camera',20)}</button></div>
  ${done===1?`<div class="callout" style="margin-top:16px">${ic('clock',20)}<span>Hujjatlaringiz tekshirilmoqda. Natija bildirishnoma orqali keladi.</span></div>
    <button class="btn secondary" style="margin-top:12px" onclick="S.verified=2;store.set('verified',2);toast('Hisobingiz tasdiqlandi');refresh()">Prototip: tekshiruvni yakunlash</button>`
   :done===2?`<div class="callout" style="margin-top:16px">${ic('verified',20)}<span>Hisobingiz tasdiqlangan. E'lonlaringizda ko'k belgi ko'rinadi.</span></div>`
   :`<button class="btn" style="margin-top:20px" ${VF.id&&VF.selfie?'':'disabled'} onclick="S.verified=1;store.set('verified',1);toast('Tekshiruvga yuborildi');refresh()">Tekshiruvga yuborish</button>`}`};
let VF={};
async function verifyDoc(){const f=await pickFiles('image/*',{capture:true});if(f.length){VF.id=1;refresh()}}
async function verifySelfie(){const f=await pickFiles('image/*',{capture:true});if(f.length){VF.selfie=1;refresh()}}
const BIZ_PLANS=[{id:'start',n:'Start',p:149000,f:["50 tagacha faol e'lon","Do'kon sahifasi va logotip",'Oyiga 5 ta bepul tepaga ko\'tarish']},
 {id:'pro',n:'Pro',p:349000,hot:1,f:["Cheksiz e'lonlar","Do'kon sahifasi, logotip va muqova",'Oyiga 3 ta bepul TOP (3 kun)','Kengaytirilgan statistika','Xizmatlar bo\'limida reklama']}];
let BZ={plan:'pro'};
R.business=el=>{if(S.biz){el.innerHTML=navBar('Biznes hisob')+`<div class="walletcard"><div class="t-caption" style="opacity:.8">Faol tarif</div><div class="t-display" style="color:#fff">${S.biz.plan}</div><div class="t-callout ugc" style="opacity:.9;font-weight:400">${esc(S.biz.name)}</div></div>
   <div class="group" style="margin-top:16px"><button class="cell" onclick="nav('seller','me')"><span class="ic">${ic('store',20)}</span>Do'kon sahifasini ko'rish<span class="val">${ic('right',18)}</span></button>
   <button class="cell" onclick="nav('myads')"><span class="ic">${ic('list',20)}</span>E'lonlarni boshqarish<span class="val">${ic('right',18)}</span></button>
   <button class="cell" style="color:var(--red)" onclick="S.biz=null;store.set('biz',null);toast('Obuna bekor qilindi');refresh()">${ic('x',20)}Obunani bekor qilish</button></div>`;return}
  el.innerHTML=navBar('Biznes hisob')+`<h1 class="t-display" style="margin-bottom:8px">Pitomnik, ferma yoki do'kon uchun</h1><p class="muted" style="margin-bottom:20px">O'z do'kon sahifangiz, ko'proq e'lon va reklama imkoniyatlari. Oylik obuna.</p>
  <div class="field" style="margin-bottom:16px"><label for="bzn">Do'kon nomi</label><input class="inp" id="bzn" value="${esc(BZ.name||'')}" placeholder="Masalan: Chilonzor zoo do'koni" oninput="BZ.name=this.value"></div>
  <div class="stack" style="gap:10px">${BIZ_PLANS.map(p=>`<button class="plan ${BZ.plan===p.id?'on':''}" style="align-items:flex-start" onclick="BZ.plan='${p.id}';refresh()"><span class="radio" style="margin-top:2px"></span>
   <div style="text-align:left;flex:1"><div class="t-headline">${p.n}${p.hot?' <span class="badge top" style="vertical-align:2px">Tavsiya</span>':''}</div>${p.f.map(f=>`<div class="t-callout muted" style="font-weight:400;display:flex;gap:6px;margin-top:4px">${ic('check',16,{c:'var(--brand-fg)'})}${f}</div>`).join('')}</div>
   <div class="pr"><div class="price" style="font-size:16px">${fmt(p.p)}</div><div class="t-caption faint" style="font-weight:400">oyiga</div></div></button>`).join('')}</div>
  ${payMethods()}
  <button class="btn gold" id="paybtn" onclick="bizSubscribe()">Obuna bo'lish</button>`};
function bizSubscribe(){const p=BIZ_PLANS.find(x=>x.id===BZ.plan);if(!(BZ.name||'').trim())return toast("Do'kon nomini kiriting");
  payFor(p.p,'Biznes obuna · '+p.n,null,()=>{S.biz={plan:p.n,name:BZ.name.trim()};store.set('biz',S.biz)})}
const themeName=()=>({system:'Tizim',light:"Yorug'",dark:'Tungi'})[S.theme];
const langName=()=>({lat:"O'zbekcha",cyr:'Ўзбекча',ru:'Русский'})[S.lang];
function settingsGroup(){return `<div class="group">
   ${S.logged?`<button class="cell" onclick="nav('wallet')"><span class="ic">${ic('card',20)}</span>To'lovlar tarixi<span class="val">${ic('right',18)}</span></button>
   <button class="cell" onclick="nav('notifSettings')"><span class="ic">${ic('bell',20)}</span>Bildirishnomalar<span class="val">${ic('right',18)}</span></button>
   <button class="cell" onclick="nav('verify')"><span class="ic">${ic('verified',20)}</span>Hisobni tasdiqlash<span class="val">${verifyState()} ${ic('right',18)}</span></button>`:''}
   <button class="cell" onclick="openTheme()"><span class="ic">${ic('moon',20)}</span>Tungi rejim<span class="val">${themeName()} ${ic('right',18)}</span></button>
   <button class="cell" onclick="openLang()"><span class="ic">${ic('globe',20)}</span>Til<span class="val"><span class="notr">${uz(langName())}</span> ${ic('right',18)}</span></button>
   <button class="cell" onclick="nav('help')"><span class="ic">${ic('help',20)}</span>Yordam markazi<span class="val">${ic('right',18)}</span></button></div>`}
R.settings=el=>{el.innerHTML=navBar('Sozlamalar')+settingsGroup()+`<div class="group" style="margin-top:16px"><button class="cell" onclick="nav('about')"><span class="ic">${ic('info',20)}</span>Ilova haqida<span class="val">1.2 ${ic('right',18)}</span></button></div>`};
R.about=el=>{el.innerHTML=navBar('Ilova haqida')+`<div class="center" style="margin:20px 0 28px"><div style="display:flex;justify-content:center;margin-bottom:14px">${appIcon(88)}</div><div style="color:var(--brand-fg);display:flex;justify-content:center">${wordmark(20)}</div><div class="muted t-callout" style="font-weight:400;margin-top:6px">Uy hayvonlari bozori</div><div class="muted num">Versiya 1.2 (prototip)</div></div>
  <div class="group"><button class="cell" onclick="nav('doc','terms')">Foydalanish shartlari<span class="val">${ic('right',18)}</span></button><button class="cell" onclick="nav('doc','privacy')">Maxfiylik siyosati<span class="val">${ic('right',18)}</span></button></div>
  <p class="t-caption faint center" style="margin-top:20px;font-weight:400">Namuna fotosuratlar: GCompris loyihasi (GPL-3)</p>`};
R.doc=(el,k)=>{const d={terms:['Foydalanish shartlari',["E'lon joylash bepul. Har bir e'lon moderatsiyadan o'tadi.","Faqat qonuniy sotilishi mumkin bo'lgan hayvonlar haqida e'lon beriladi.","Yolg'on ma'lumot beruvchi e'lonlar o'chiriladi, takroriy holatda hisob bloklanadi.","Reklama xizmatlari uchun to'langan mablag' xizmat ko'rsatilgandan so'ng qaytarilmaydi."]],
  privacy:['Maxfiylik siyosati',["Telefon raqamingiz faqat e'lon sahifasida va siz yozishgan foydalanuvchilarga ko'rinadi.","Tasdiqlash uchun yuborilgan hujjatlar faqat tekshiruvda ishlatiladi va uchinchi shaxslarga berilmaydi.","Hisobingizni istalgan vaqtda o'chirishingiz mumkin."]]}[k];
  el.innerHTML=navBar(d[0])+d[1].map((p,i)=>`<p class="muted" style="margin-bottom:14px"><b style="color:var(--ink)">${i+1}.</b> ${p}</p>`).join('')};
function openTheme(){openSheet(`<h2 class="t-title" style="margin-bottom:16px">Tungi rejim</h2><div class="group">`+[['system',"Tizim bo'yicha",'Telefon sozlamasiga moslashadi'],['light',"Yorug'",''],['dark','Tungi',"Kechqurun ko'zni charchatmaydi"]].map(([v,l,d])=>
  `<button class="cell" style="min-height:60px" onclick="S.theme='${v}';store.set('theme','${v}');applyTheme();closeSheet();refresh()"><div style="flex:1;text-align:left"><div>${l}</div>${d?`<div class="t-caption faint" style="font-weight:400">${d}</div>`:''}</div><span class="val">${S.theme===v?ic('check',20,{c:'var(--brand-fg)'}):''}</span></button>`).join('')+'</div>')}
function openLang(){openSheet(`<h2 class="t-title" style="margin-bottom:16px">Til</h2><div class="group">`+[['lat',"O'zbekcha (lotin)"],['cyr','Ўзбекча (кирилл)'],['ru','Русский'],['en','English']].map(([v,l])=>
  `<button class="cell" onclick="setLang('${v}')"><span class="notr">${uz(l)}</span><span class="val">${S.lang===v?ic('check',20,{c:'var(--brand-fg)'}):v==='en'?'<span class="t-caption">Tez orada</span>':''}</span></button>`).join('')+'</div>')}
function setLang(v){if(v==='en'){closeSheet();toast('English — coming soon');return}
  const changed=S.lang!==v;S.lang=v;store.set('lang',v);closeSheet();if(changed){renderTabbar();refresh()}}
R.notifSettings=el=>{const rows=[['msg','Yangi xabarlar','Xaridor yoki sotuvchi yozganda'],['ads',"E'lon holati","Moderatsiya va ko'rishlar"],['saved','Saqlangan qidiruvlar',"Mos yangi e'lon chiqqanda"],['top','Reklama muddati','Muddat tugashidan oldin eslatish'],['promo','Yangiliklar va takliflar','']];
  el.innerHTML=navBar('Bildirishnomalar')+`<div class="group">`+rows.map(([k,t,d])=>`<button class="cell" role="switch" aria-checked="${!!S.notif[k]}" style="min-height:64px" onclick="S.notif.${k}=!S.notif.${k};store.set('notif',S.notif);this.querySelector('.switch').classList.toggle('on',S.notif.${k})">
   <div style="flex:1;text-align:left"><div>${t}</div>${d?`<div class="t-caption faint" style="font-weight:400">${d}</div>`:''}</div><span class="switch ${S.notif[k]?'on':''}"></span></button>`).join('')+'</div>'};
R.help=el=>{const faq=[["E'lon joylash pullikmi?","Yo'q, e'lon joylash mutlaqo bepul. Faqat reklama xizmatlari pullik: TOP, VIP, «Shoshilinch» va tepaga ko'tarish."],
  ["E'lon qancha vaqtda chiqadi?","Moderatsiyadan so'ng, odatda 15 daqiqa ichida."],["Qanday qilib xavfsiz sotib olaman?","Tasdiqlangan sotuvchilarni tanlang, sharhlarni o'qing, hayvonni shaxsan ko'ring va hujjatlarini tekshiring. Oldindan to'lov qilmang."],
  ["Hamyon nima?","Ilova ichidagi balans. Uni Click, Payme, Uzcard yoki Humo orqali to'ldirib, reklama xizmatlari uchun bir bosishda to'laysiz."],
  ["Biznes hisob kimlar uchun?","Pitomnik, ferma, zoo do'kon va veterinarlar uchun: do'kon sahifasi, ko'proq e'lon va reklama."],["E'lonni qanday o'chiraman?","Profil → Mening e'lonlarim → «…» → O'chirish."]];
  el.innerHTML=navBar('Yordam markazi')+`<h2 class="t-headline" style="margin-bottom:12px">Ko'p beriladigan savollar</h2><div class="group">`+faq.map(([q,a])=>`<details><summary>${q}${ic('chev',18)}</summary><p>${a}</p></details>`).join('')+`</div>
  <div class="section"><h2 class="t-headline">Bog'lanish</h2></div><div class="group">
   <button class="cell" onclick="supportChat()"><span class="ic">${ic('chat',20)}</span>Qo'llab-quvvatlashga yozish<span class="val">${ic('right',18)}</span></button>
   <button class="cell" onclick="openCall('support')"><span class="ic">${ic('phone',20)}</span>Qo'ng'iroq qilish<span class="val num notr">+998 71 200 00 00</span></button></div>`};
function supportChat(){requireAuth(()=>{if(!THREADS.find(t=>t.id==='ts'))THREADS.push({id:'ts',who:'support',ad:null,unread:0,msgs:[{me:0,x:'Assalomu alaykum! Sizga qanday yordam bera olamiz?',t:now()}]});nav('chat','ts')})}
R.editProfile=el=>{el.innerHTML=navBar('Profilni tahrirlash')+`<div class="center" style="margin-bottom:24px"><div class="avatar" style="width:88px;height:88px;font-size:28px;margin:0 auto 10px">${initials(S.name)}</div></div>
  <div class="stack"><div class="field"><label for="pn">Ism va familiya</label><input class="inp" id="pn" value="${esc(S.name)}" maxlength="40"></div>
  <div class="field"><label>Telefon raqam</label><input class="inp num notr" value="+998 90 123 45 67" disabled><div class="hint">Raqamni o'zgartirish uchun yordam markaziga yozing</div></div>
  <button class="btn" style="margin-top:8px" onclick="S.name=$('#pn').value.trim()||S.name;store.set('name',S.name);toast('Saqlandi');back()">Saqlash</button></div>`};
let myTab='active';
R.myads=el=>{const l=myAds().filter(a=>myTab==='active'?!a.sold:a.sold);
  el.innerHTML=navBar("Mening e'lonlarim",`<button class="icon-btn" onclick="startPost()" aria-label="Yangi e'lon">${ic('plus',20)}</button>`)+
  `<div class="seg" style="margin-bottom:16px"><button class="${myTab==='active'?'on':''}" onclick="myTab='active';refresh()">Faol (${myAds().filter(a=>!a.sold).length})</button><button class="${myTab==='sold'?'on':''}" onclick="myTab='sold';refresh()">Sotilgan (${myAds().filter(a=>a.sold).length})</button></div>`+
  (l.length?`<div class="group">${l.map(myAdCell).join('')}</div>`:emptyState('paw',"E'lonlar yo'q",myTab==='active'?"Yangi e'lon joylang":''))};
function adActions(id){const a=ad(id);openSheet(`<h2 class="t-headline ugc" style="margin-bottom:14px">${esc(a.n)}</h2><div class="group">
  ${a.sold?'':`<button class="cell" onclick="closeSheet();nav('promote',${id})"><span class="ic" style="color:var(--gold)">${ic('star',20,{fill:1})}</span>Reklama qilish (TOP, VIP)</button>
  <button class="cell" onclick="closeSheet();bump(${id})"><span class="ic">${ic('up',20)}</span>Tepaga ko'tarish<span class="val">${bumpFree(a)?'Bepul':"5 000 so'm"}</span></button>`}
  <button class="cell" onclick="closeSheet();nav('stats',${id})"><span class="ic">${ic('bar',20)}</span>Statistika</button>
  <button class="cell" onclick="closeSheet();startPost(${id})"><span class="ic">${ic('edit',20)}</span>Tahrirlash</button>
  <button class="cell" onclick="toggleSold(${id})"><span class="ic">${ic('archive',20)}</span>${a.sold?'Qayta faollashtirish':'Sotildi deb belgilash'}</button>
  <button class="cell" style="color:var(--red)" onclick="confirmDelete(${id})">${ic('trash',20)}O'chirish</button></div>
  <button class="btn secondary" style="margin-top:12px" onclick="closeSheet()">Bekor qilish</button>`)}
function toggleSold(id){const a=ad(id);a.sold=a.sold?0:1;a.top=0;a.vip=0;closeSheet();toast(a.sold?'Sotilgan deb belgilandi':"E'lon qayta faollashtirildi");refresh()}
function confirmDelete(id){openSheet(`<h2 class="t-headline center">E'lonni o'chirasizmi?</h2><p class="muted center" style="margin:8px 0 20px">Bu amalni ortga qaytarib bo'lmaydi.</p>
  <button class="btn danger" onclick="deleteAd(${id})">O'chirish</button><button class="btn text" style="margin-top:6px;color:var(--ink)" onclick="closeSheet()">Bekor qilish</button>`,true)}
function deleteAd(id){ADS=ADS.filter(a=>a.id!==id);S.favs=S.favs.filter(x=>x!==id);closeSheet();toast("E'lon o'chirildi");if(stack[stack.length-1].id==='detail')back();else refresh()}
function confirmLogout(){openSheet(`<h2 class="t-headline center">Hisobdan chiqasizmi?</h2><p class="muted center" style="margin:8px 0 20px">E'lonlaringiz saqlanib qoladi.</p>
  <button class="btn danger" onclick="S.logged=false;store.set('logged',false);closeSheet();renderTabbar();stack=[{id:'welcome'}];show(stack[0])">Chiqish</button><button class="btn text" style="margin-top:6px;color:var(--ink)" onclick="closeSheet()">Bekor qilish</button>`,true)}

/* =====================================================================
   DRAG-TO-SCROLL for mouse users (touch keeps native scrolling)
   ===================================================================== */
(function(){
  let d=null,suppress=false;const app=$('#app');
  const scale=()=>app.getBoundingClientRect().width/app.offsetWidth;
  app.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('input,textarea,select,video'))return;
    const h=e.target.closest('.chips,.hscroll,.gal-track'),v=e.target.closest('.chat-body,.sheet,.screen');
    d={x:e.clientX,y:e.clientY,h,v,hl:h?h.scrollLeft:0,vt:v?v.scrollTop:0,axis:null,k:scale()};
  });
  addEventListener('pointermove',e=>{if(!d)return;const dx=(e.clientX-d.x)/d.k,dy=(e.clientY-d.y)/d.k;
    if(!d.axis){if(Math.hypot(dx,dy)<6)return;d.axis=Math.abs(dx)>Math.abs(dy)&&d.h?'h':d.v?'v':null;if(!d.axis){d=null;return}
      app.classList.add('dragging');if(d.axis==='h'&&d.h.classList.contains('gal-track'))d.h.style.scrollSnapType='none'}
    if(d.axis==='h')d.h.scrollLeft=d.hl-dx;else d.v.scrollTop=d.vt-dy;e.preventDefault()});
  addEventListener('pointerup',()=>{if(!d)return;
    if(d.axis){suppress=true;setTimeout(()=>suppress=false,0);app.classList.remove('dragging');
      if(d.h&&d.axis==='h'&&d.h.classList.contains('gal-track')){const t=d.h,w=t.clientWidth,i=Math.round(t.scrollLeft/w);t.scrollTo({left:i*w,behavior:'smooth'});setTimeout(()=>t.style.scrollSnapType='',450)}}
    d=null});
  app.addEventListener('click',e=>{if(suppress){e.stopPropagation();e.preventDefault()}},true);
  app.addEventListener('dragstart',e=>e.preventDefault());
})();
document.addEventListener('scroll',e=>{const id=e.target.id;if(id==='s-detail'||id==='s-lostDetail'||id==='s-seller')$('#sb').classList.toggle('clear',e.target.scrollTop<330)},true);

/* ---------- fit device to window ---------- */
function fit(){const s=Math.min(1,(innerHeight-24)/978,(innerWidth-16)/462);$('#stage').style.transform=`scale(${s})`;$('#stage').style.margin=`${(978*s-978)/2}px ${(462*s-462)/2}px`}
addEventListener('resize',fit);fit();
try{renderTabbar();stack=[{id:'splash'}];show(stack[0])}
catch(e){$('#screens').innerHTML=`<section class="screen on"><h2 class="t-headline">Ilovani ochib bo'lmadi</h2><p class="muted" style="margin-top:8px">${esc(e.message)}</p></section>`}
