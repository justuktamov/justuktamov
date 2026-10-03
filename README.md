# Loyihalar analitikasi

Kompaniyaning data-analitigi: hamma loyihalar (STARPAY, VIZART, DIZIPRO, SELFENG) bir ekranda — qaysi loyihaga qancha pul sarflandi, qancha tushdi, foyda va sof foyda qancha, konversiya qanday, lid sifati nega past, narxni koʻtarish kerakmi yoki tushirish. Har kungi majlisda (PM, ROP, targetolog) shu ekran ochiladi.

Raqamlarni har kuni **proekt menejer (PM)** kiritadi: targetologdan, sotuv boʻlimi rahbaridan (ROP) va botdan olib. Direktor kunlik hisobotni Telegramda oladi va javob qilib yechim yozadi.

## Loyihalar (bosh sahifa)

Kirganda — **doska**, CRM dagi kabi: har bir loyiha alohida rangli ustun, yonma-yon. Tepada davr (kecha, kechadan oldin, hafta, oy, oraliq) va jami: tushum, sof foyda, reklama, marja. Raqamlar kechagi kun uchun kiritiladi, shuning uchun hamma davrlar kechadan orqaga hisoblanadi. Har bir ustunda bir xil tartibda kartochkalar:

1. **Sof foyda** — katta raqam; ostida tushum, reklama, marja;
2. **Voronka** — klik → lid → sotuv (avtovoronkada klik → bot start → xarid), 1 lid narxi va konversiya;
3. **Lid sifati** — sifatli / potensial / sifatsiz chizig'i va asosiy sabab;
4. **Diqqat** — eng muhim muammo (agar bo'lsa);
5. **Narx** — ko'tarish, tushirish yoki o'zgartirmaslik.

**Ustunni bossangiz — loyihaning to'liq sahifasi** ochiladi (yuqorida boshqa loyihaga o'tish tugmalari bor):
- 4 ta asosiy raqam: reklama, tushum, sof foyda, marja (oldingi davrga nisbatan o'zgarish bilan);
- **Pul:** tushum → − reklama → foyda → − tannarx → − doimiy xarajat → sof foyda, har biri tushumning necha foizi; yonida har kungi tushum va xarajat grafigi;
- **Voronka**, **Lid sifati** («nega sifatsiz» sabablari, sifatsiz lidlarga ketgan pul), **Nega sotib olmadi**;
- **Narx** tavsiyasi (1 sotuvdan sof foyda, zararsizlik narxi) va **Xulosa** (zarar sababi, past konversiya, qimmatlashgan lid, targetolog va ROP izohlari);
- **Ko'p reklama = ko'p foydami?** — oxirgi 30 kun reytingi: eng ko'p reklama ketgan kun tushum, sof foyda va ROMI (sof foyda ÷ reklama) bo'yicha nechanchi o'rinda, eng foydali 5 kun va eng ko'p reklama ketgan 5 kun, ko'p va kam sarflangan kunlar sof foydasi solishtiriladi, eng foydali kunlardagi o'rtacha byudjet — kunlik byudjet uchun mo'ljal;
- oylik reja va kunma-kun jadval.

### Oylik reja
Oy boshida **Sozlamalar → Oylik reja** da har bir loyiha uchun maqsad qo'yiladi: reklama byudjeti ($), lidlar, sotuvlar, tushum (so'm). Har kartada o'tgan oy fakti mo'ljal sifatida turadi («↺ … faktini qo'yish» bir bosishda yozib beradi). Raqam yozilishi bilan rejadan chiqadigan ko'rsatkichlar (1 lid narxi, konversiya, 1 mijoz narxi, o'rtacha chek) o'tgan oy bilan solishtirib ko'rsatiladi — reja realmi, darhol ko'rinadi.

Oy davomida:
- doskada har ustunda **«Oylik reja»** kartasi: tushum, sotuv, lid — bajarilgan foiz va «bugungacha kutilgan» belgisi; reja kiritilmagan bo'lsa, tepada eslatma;
- loyiha sahifasida: har ko'rsatkich, prognoz, **qolgan kunlarda kuniga qancha kerak** va **«Nega orqada»** — sababi bilan:
  - lid orqada + byudjet to'liq sarflanmagan → «targetolog reklamani ko'paytirsin»;
  - lid orqada + 1 lid rejadagidan qimmat → «kreativ va auditoriyani yangilash»;
  - lid yetarli, sotuv orqada → «sabab sotuvda: konversiya rejada X%, hozir Y%»;
  - sotuv soni rejada, tushum orqada → «o'rtacha chek kichik»;
  - byudjet tez sarflanyapti → «kunlik byudjetni $X ga tushirish»;
- PM ning kunlik tahlilida va direktorga boradigan hisobotda ham shu ogohlantirishlar (📅);
- loyiha jiddiy orqada qolsa (kutilganning 80% idan kam) — **Telegramga alohida xabar**, har ko'rsatkich bo'yicha oyiga bir marta.

Oyning birinchi 4 kunida xulosa chiqarilmaydi («Oy boshi») — bir-ikki kunlik raqam yetarli emas.

### Reklama xarajati — umumiy
PM 1-qadamda uch xil xarajatni yozadi: **target** (reklama kabinet), **blogerlarga** va **Telegram kanallarga** to'lov. Foyda, 1 lid va 1 mijoz narxi, ROAS — umumiy xarajatdan. Doskada «Reklama · umumiy» kartasi bosilsa: target, blogerlar, Telegram kanallar — summasi va ulushi. Voronka (ko'rish, klik, CTR, 1 klik narxi) — faqat target statistikasi.

### Lid qayerdan keldi
2-qadamda har loyiha uchun lid manbasi kiritiladi: **sayt / forma**, **Instagram direkt**, **Telegram admin lichkasi**, **boshqa**. Yig'indi jami lidga teng bo'lmasa — ogohlantirish (≠); jami lid bo'sh qolsa, manbalar yig'indisi yoziladi. Loyiha sahifasida «Lid qayerdan keldi» bloki (soni va ulushi), doskada «Manba: Sayt 60% · IG direkt 25% · TG lichka 15%», Telegram hisobotida 📥 qatori.

### Voronka tashxisi — qayerda yo'qotyapmiz?
Har o'tish loyihaning o'z me'yori (oldingi 4 hafta, konversiya uchun — reja) bilan solishtiriladi; 25% dan past bo'lsa — muammo:
- **Ko'rish ko'p, klik kam** (CTR past) → reklama e'tiborni tortmayapti: CTA, sarlavha, rasm — targetolog;
- **Klik ko'p, lid kam** (klik → lid past) → kreativ boshqa narsa va'da qilyapti yoki sayt/forma ishlamayapti — targetolog;
- **Lid ko'p, sotuv kam** (lid → sotuv past) → muammo sotuv bo'limida — ROP;
- avtovoronkada: klik → bot start (reklama va bot mos emas), start → xarid (botdagi taklif, to'lov).
Doskada past o'tish qizil (↓) bilan, voronka ostida asosiy muammo yoziladi; loyiha sahifasida «Qayerda yo'qotyapmiz?» jadvali va kim nima qilishi.

### Kanallar, kechikish, LTV
- **Reklama kanallari.** Sozlamalarda har loyihaga kanallar belgilanadi (Telegram Ads, Instagram / Facebook, kanal posti, bloger, YouTube, Google, organik…). PM 2-qadamda «Kanallar bo'yicha» bo'limiga har kanal raqamini yozadi (ixtiyoriy). Loyiha sahifasida jadval: xarajat ulushi, lid, 1 lid, sifatli %, sotuv, 1 mijoz narxi, tushum, ROAS — eng yaxshi kanal yashil, eng qimmati qizil. Xulosada: «Instagram lidlarining faqat 31% sifatli, Telegram Ads — 88%», «byudjetning bir qismini … ga o'tkazish», «Blogerga $X sarflandi, sotuv yo'q».
- **Lid → sotuv kechikishi.** Kursni odam bugun lid bo'lib, 1–2 haftadan keyin sotib oladi. Loyihaga kechikish (kun) qo'yilsa, konversiya = davrdagi sotuvlar ÷ shuncha kun oldingi lidlar. Sozlamalarda tizim oxirgi 90 kun ma'lumotidan kechikishni o'zi taxmin qiladi («Ma'lumotga ko'ra: ~7 kun · qo'yish»).
- **Qayta sotuv va LTV.** PM 2-qadamda qayta sotuvlar sonini va ulardan tushgan pulni yozadi (jami sotuv ichida). Loyiha sahifasida «Mijoz qiymati (LTV)», 90 kun: 1 yangi mijozdan jami pul, tannarxdan keyin, 1 mijozni olib kelish narxi va **LTV/CAC** (3 dan yuqori — yaxshi, 1.5 dan past — reklama zo'rg'a qoplanadi). O'rtacha chek faqat yangi mijozlardan hisoblanadi.

### Dinamika
Menyuda **Dinamika** — oxirgi 6 yoki 12 oy, hammasi yoki bitta loyiha: tushum va barcha xarajat grafigi, ko'rsatkichlar jadvali (tushum, reklama, sof foyda, marja, lid, sifatli ulush, 1 lid, sotuv, konversiya, 1 mijoz, o'rtacha chek, ROAS, qayta sotuv ulushi) va o'tgan oyga nisbatan ▲▼ o'zgarish. Turli uzunlikdagi oylar (va tugamagan joriy oy) kunlik sur'at bo'yicha solishtiriladi. «Hammasi» tanlanganda — har loyihaning sof foydasi oyma-oy.

### Pul qanday hisoblanadi
- **Foyda** = tushum − reklama (dollar kursi Sozlamalarda).
- **Sof foyda** = foyda − tannarx − doimiy xarajat. Har bir loyiha uchun Sozlamalarda kiritiladi:
  - **tannarx** — tushumdan foizda (STARPAY uchun Stars/Premium xaridi, kurslar uchun ROP bonusi, toʻlov komissiyasi);
  - **doimiy xarajat** — oyiga soʻmda (ish haqi, ijara, mentorlar); kunlarga boʻlib hisoblanadi.
- **Marja** = sof foyda ÷ tushum.

### Narx tavsiyasi
- 1 sotuvdan zarar boʻlsa → «Narxni koʻtarish kerak» va **zararsizlik narxi**; agar sotib olmaganlarning 35%+ «qimmat» desa → narxni emas, xarajatni kamaytirish tavsiya qilinadi.
- «Qimmat» deganlar 35%+ va konversiya meʼyordan past → chegirma, boʻlib toʻlash yoki arzonroq tarif.
- Konversiya meʼyorida, «qimmat» deganlar kam, lekin marja 15% dan past → narxni 5–10% koʻtarib sinash (qancha qoʻshimcha foyda berishi hisoblanadi).
- Aks holda — «Narx meʼyorida».

### Loyiha turi
- **Sotuv boʻlimi orqali** — lid → ROP qoʻngʻiroq qiladi → sotuv. Lid sifati va sabablar kuzatiladi.
- **Avtovoronka (bot)** — STARPAY kabi: odam botga kirib oʻzi sotib oladi. Lid kuzatilmaydi — faqat klik, bot start, xarid va tushum.

## Kunlik ish: 4 qadam

«Kechagi hisobot» boʻlimida PM qaysi qadamda turgani yuqorida koʻrinadi. 1 va 2-qadamda soʻraladigan savollar roʻyxati bor. «Nusxalash» tugmasi ularni tayyor xabar qilib beradi — targetolog yoki ROP ga Telegramda yuborasiz.

1. **Targetologdan soʻrang** (har bir loyiha boʻyicha):
   - qancha pul sarflandi ($), nechta koʻrish va klik boʻldi;
   - bugun nechta yangi kreativ chiqdi;
   - qaysi kreativ yaxshi ishladi, qaysi biri ishlamadi;
   - reklamada muammo boʻldimi (akkaunt, moderatsiya, toʻlov).

   **Lid narxi** soʻralmaydi — tizim oʻzi hisoblaydi: xarajat ÷ lid.
2. **Sotuv va tushgan pul:**
   - ROP dan: jami lid, shundan **sifatli** (sotib olishga tayyor), **potensial** (qiziqdi, keyinroq oladi) va **sifatsiz** (maqsadli emas); nechta sotuv va qancha pul tushdi;
   - ROP dan **sabablar raqamda**: sifatsizlar nega sifatsiz (maqsadli emas, puli yoʻq, javob bermadi…) va sotib olmaganlar nega olmadi (qimmat, oʻylab koʻradi, keyinroq…) — har sababdan nechta;
   - avtovoronkadan (botdan / toʻlov tizimidan): bot start, xarid, tushgan pul.

   Jami lid boʻsh qolsa, uch turi qoʻshib yoziladi. Yigʻindi mos kelmasa, ogohlantirish chiqadi.
3. **Tahlil.** Tizim har bir loyihada bugungi muammoni topadi va tayyor taklif yozib qoʻyadi. PM uni tahrirlaydi:

| Muammo (tizim aniqlaydi) | Taklif (PM direktorga) | Kim bilan hal qilinadi |
|---|---|---|
| Lid narxi odatdagidan 30%+ qimmat | Kreativlarni yangilash, ishlamayotganini toʻxtatish (7 kun yangi kreativ chiqmagan boʻlsa, bu ham aytiladi) | Targetolog |
| CTR odatdagidan past | Kreativ va sarlavhani almashtirish | Targetolog |
| Lidlarning 40%+ sifatsiz | Auditoriyani qayta sozlash | Targetolog |
| Lid rejadan orqada | Byudjetni oshirish yoki yangi kanal | Targetolog |
| Lid koʻp, sotuv kam (meʼyorning 60% idan past) yoki sotuv umuman yoʻq | Sotuv boʻlimi rahbari bilan gaplashish: qoʻngʻiroq tezligi, skript | Sotuv boʻlimi |
| Potensial lidlar koʻp | Ertaga qayta qoʻngʻiroq (follow-up) | Sotuv boʻlimi |
| 7 kunda zarar | Byudjetni qisqartirish yoki taklifni oʻzgartirish | Direktor qarori |
| 7 kunda eng yaxshi natija | Byudjetni +20% oshirish | Direktor qarori |

### AI tahlil (3-qadam)
Serverda AI kaliti boʻlsa, 3-qadamda **«AI bilan tahlil qilish»** tugmasi chiqadi. AI kechagi raqamlarni, loyiha meʼyorini, sabablarni, kanallarni va yuqoridagi jadval boʻyicha tizim topgan muammolarni oʻqib, har loyiha boʻyicha qisqa tahlil (🔎) va takliflar (•) yozadi, 4-qadam uchun kun xulosasi va «ertaga» rejasini ham taklif qiladi.
- AI matni «Direktorga taklif» maydonlariga qoʻyiladi (🤖 belgisi bilan). **PM oʻqiydi, xatosini tuzatadi va «Saqlash» bosadi** — direktorga faqat PM saqlagan matn boradi.
- Raqamlar AI tahlildan keyin oʻzgarsa, «Raqamlar AI tahlildan keyin oʻzgardi — qayta tahlil qiling» ogohlantirishi chiqadi.
- **Provayder** `.env` da tanlanadi, kod oʻzgarmaydi: `AI_PROVIDER` = `openrouter` (standart: DeepSeek modeli OpenRouter orqali, `deepseek/deepseek-v4-pro`; kalit — https://openrouter.ai/keys), `deepseek` (DeepSeek ning oʻz API si, `deepseek-v4-pro`), `anthropic` (Claude, `claude-opus-5-5`) yoki `openai` (OpenAI formatidagi boshqa xizmat — `AI_MODEL`, kerak boʻlsa `AI_BASE_URL`). Kalit — `AI_API_KEY`. OpenRouter da boshqa modelga oʻtish uchun faqat `AI_MODEL` oʻzgartiriladi (masalan `deepseek/deepseek-v4-flash`). Oʻzgartirgach serverni qayta ishga tushiring. Holat: Sozlamalar → Telegram → «AI tahlil».
- OpenRouter so'rovni faqat JSON rejimini qo'llaydigan provayderga yuboradi (`require_parameters`). Maʼlumotlarimizda model oʻqitadigan provayderlarni taqiqlash — OpenRouter hisobidagi maxfiylik sozlamalarida (openrouter.ai/settings/privacy).
- Kalit boʻlmasa AI tugmasi chiqmaydi, tahlil avvalgidek tizim qoidalari boʻyicha yoziladi.
- AI ga kechagi biznes raqamlari, kreativ nomlari va targetolog/ROP izohlari yuboriladi (mijozlarning ism va telefonlari tizimda yoʻq, ular yuborilmaydi). Provayder maʼlumotni qayerda saqlashini uning shartlaridan tekshiring. Har bosish pullik: OpenRouter orqali `deepseek/deepseek-v4-pro` da bir tahlil odatda 1 sentdan kam (narx OpenRouter dagi model sahifasida).

4. **Yuborish.** Direktor Telegramda har bir loyiha boʻyicha raqamlar, muammolar (⚠️) va PM takliflarini (💡) oladi.
   - Direktor shu xabarga **javob (reply)** qilib yechim yozadi. Javob hisobotga saqlanadi va PM ga Telegramda boradi.
   - Ertasi kuni «Kechagi hisobot» sahifasining tepasida «Direktor yechimi» boʻlib turadi.

PM har kuni **kechagi kun** hisobotini tayyorlaydi (sana tanlagichda oldingi kunlarni ham ochish mumkin). Har qadamni «Oʻtkazib yuborish» mumkin. Belgilangan vaqtgacha (standart 11:00) hisobot yuborilmasa, PM ga Telegramda eslatma boradi; avto-hisobot vaqtigacha (standart 13:00) ham yuborilmasa, direktorga «PM hisobotni yubormadi» belgisi bilan avtomatik hisobot ketadi.

### Holat va meʼyor qanday hisoblanadi
Loyihalar bir-biri bilan solishtirilmaydi: STARPAY doʻkon (chek kichik, konversiya yuqori), VIZART, DIZIPRO va SELFENG esa kurslar. Har bir loyiha **oʻz meʼyori** bilan solishtiriladi:
- konversiya meʼyori — oylik rejadagi sotuv/lid; reja boʻlmasa — loyihaning oʻzining oldingi 4 haftasi;
- lid narxi va CTR meʼyori — loyihaning oʻzining oldingi 4 haftasi.

Holat (7 kun va bugungi muammolardan eng jiddiysi):
- **Zarar:** ROAS < 1 boʻlsa, byudjetni qisqartirish taklif qilinadi.
- **Sotuvda muammo:** lid→sotuv loyiha meʼyorining 60% idan past boʻlsa.
- **Kreativ ishlamayapti:** lid narxi odatdagidan 1.4 baravar qimmat yoki CTR odatdagidan 30% past.
- **Lid kerak:** oylik lid rejasidan orqada boʻlsa (kuniga qancha lid kerakligi hisoblanadi) yoki lidlar 15% dan koʻp kamaygan boʻlsa.
- **Oʻstirish mumkin:** ROAS hamma loyihalar oʻrtachasidan 1.3 baravar yuqori (pul qaytishi — loyihalar oʻrtasida solishtirsa boʻladigan yagona koʻrsatkich) va konversiya meʼyorida boʻlsa.
- **Byudjet taqsimoti:** hozirgi ulush × (loyiha ROAS i / oʻrtacha ROAS). Koeffitsient 0.5 dan 1.6 gacha cheklanadi.

## Menyu

| Boʻlim | Nima uchun |
|---|---|
| Loyihalar | doska: har loyiha — ustun; ustun bosilsa loyihaning to'liq sahifasi; CSV |
| Kechagi hisobot | PM ning 4 qadami: target → sotuv va tushgan pul → tahlil → direktorga |
| Dinamika | oyma-oy: tushum, xarajat, foyda, lid narxi, konversiya — ▲▼ o'zgarish |
| Hisobotlar | oldingi kunlar; istalgan kunni ochib tuzatish mumkin |
| Sozlamalar | loyihalar (turi, tannarx %, doimiy xarajat, kanallar, lid → sotuv kechikishi), oylik reja, Telegram, profil |

## Ishga tushirish (lokal)

Node.js **22.13+** kerak (undan eski 22.x da ichki SQLite bayroqsiz ishlamaydi). Maʼlumotlar bazasi Node ichidagi SQLite, alohida baza oʻrnatish shart emas.

```bash
cd analytika
npm install
cp .env.example .env      # TELEGRAM_BOT_TOKEN, ADMIN_PASSWORD, AI_API_KEY (ixtiyoriy)
npm run demo              # (ixtiyoriy) 150 kunlik namuna: 4 loyiha, kanallar va oylik reja
npm start                 # http://localhost:3000
npm test                  # testlar
```

Namuna maʼlumot bilan kirish: login `pm`, parol `demo1234`.
Haqiqiy ishga tushirishda `npm run demo` ni bajarmang. Birinchi ishga tushganda PM logini (`ADMIN_LOGIN`, odatda `pm`) yaratiladi, parol `ADMIN_PASSWORD` dan olinadi yoki konsolga chiqadi.

## Serverga joylash

### Coolify (production, CI/CD)
Production: `buzzi-uz/CRM-Analitics` repozitoriysining `main` branchi Coolify orqali joylanadi. Har push da GitHub Actions testlarni ishlatadi; testlar o'tsa — Coolify yangi versiyani yig'ib ishga tushiradi. Sozlash bosqichma-bosqich: [deploy/COOLIFY.md](deploy/COOLIFY.md) (doimiy disk `/data`, `.env` qiymatlari, domen, health check `/api/health`, kunlik zaxira nusxa `npm run backup`).

### Docker (eng oson)
```bash
cp .env.example .env      # TELEGRAM_BOT_TOKEN, ADMIN_PASSWORD
docker compose up -d      # ma'lumotlar ./data papkasida saqlanadi
```

### Oddiy VPS (Ubuntu)
1. Node 22.13+ ni oʻrnating va kodni `/opt/analytika` ga joylang, keyin `npm ci --omit=dev`.
2. `deploy/analytika.service` → systemd orqali avtomatik ishga tushadi.
3. `deploy/nginx.conf` → domen va HTTPS (`certbot --nginx`).
4. `.env` ga `COOKIE_SECURE=1` yozing.
5. `deploy/backup.sh` → bazaning kunlik zaxira nusxasi (cron).

### Sozlash tartibi
1. Birinchi kirishda «Kechagi hisobot» sahifasi STARPAY, VIZART, DIZIPRO, SELFENG ni bir bosishda qoʻshishni taklif qiladi.
2. **Sozlamalar → Oylik reja:** har bir loyiha uchun lid, sotuv, tushum va byudjet rejasi.
3. **Sozlamalar → Telegram:** direktor botga `/id` yozadi — chiqqan raqamni birinchi maydonga yozing. Oʻzingiz ham `/id` yozib, ikkinchi maydonga kiriting. Eslatma va avto-hisobot vaqtini belgilang.

## Brauzer demosi

`npm run build:demo` bitta HTML faylga (`dist/demo.html`) yigʻadi. Unda server oʻrniga brauzer ichidagi xotira ishlaydi, hisob-kitob kodi esa oʻsha (`src/metrics.js`, `src/reports.js`).

## Tuzilishi

```
src/server.js      HTTP server, API, rejalashtiruvchi (eslatma, avto-hisobot)
src/db.js          SQLite sxema va kunlik maydonlar
src/metrics.js     hisob-kitob: lid narxi, konversiya, ROAS, reja/prognoz, loyiha me'yori, kunlik tahlil
src/reports.js     PM hisoboti: qoralama → yuborish → direktor javobi, Telegram matni
src/auth.js        parol va sessiyalar
src/telegram.js    bot: hisobot yuborish, /id, direktorning javobi (reply)
src/ai/            AI tahlil: index (provayder tanlash), prompt (ma'lumot va ko'rsatma), openai-compatible (OpenRouter, DeepSeek, OpenAI), anthropic (Claude)
src/demo-data.js   namuna ma'lumotlar (server va brauzer demosi uchun)
public/js/         interfeys: core, board (doska), project (loyiha sahifasi), blocks, pm (4 qadam va arxiv), settings
demo/              brauzer demosini yig'ish
deploy/            systemd, nginx, zaxira nusxa
test/              testlar — npm test
```
