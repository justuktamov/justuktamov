# Loyihalar analitikasi

Loyihalar direktori har kuni proekt menejerdan bitta tushunarli hisobot oladigan platforma. Hisobotda bugun qaysi loyihaga targetga qancha sarflangani, nechta klik va lid boʻlgani, qaysi loyiha oqsoqlanayotgani, qayerga koʻproq lid kerakligi va qaysi kreativ ishlamayotgani koʻrinadi.

![Direktor paneli](screenshots/director.png)

## Kunlik ish jarayoni

1. **Targetolog** har bir loyiha boʻyicha xarajat ($), koʻrishlar va kliklarni kiritadi. Har bir post yoki kreativni ham qoʻshadi: video, rasm, stories.
2. **ROP** (sotuv boʻlimi boshligʻi) lidlar, sotuvlar, tushum va «nega sotib olmadi» sabablarini kiritadi. Lid operatori lidlarni ROP oʻrniga kiritishi ham mumkin.
3. **Moliya** kassaga tushgan pul va qayta sotuvlarni kiritadi.
4. **Proekt menejer (PM)** «PM hisoboti» sahifasida hammasini bitta joyda koʻradi:
   - kim kiritmaganini koʻradi va yetishmaganini toʻldiradi;
   - har bir loyihaga holat tanlaydi (tizim oʻzi taklif qiladi) va izoh yozadi;
   - kun xulosasi va ertangi rejani yozadi;
   - **«Direktorga yuborish»**ni bosadi. Direktorga Telegram xabari ham boradi.
5. **Direktor** «Bugun» sahifasini ochadi va quyidagilarni koʻradi:
   - PM xulosasi;
   - har bir loyiha kartasi: bugungi xarajat, klik, lid, lid narxi, sotuv, holat (*Yaxshi, Oʻstirish mumkin, Lid kerak, Kreativ ishlamayapti, Sotuvda muammo, Zarar*) va kim nima qilishi kerakligi;
   - **byudjetni qayta taqsimlash taklifi**: qaysi loyihaga koʻproq, qaysisiga kamroq pul tikish kerak (7 kunlik ROAS asosida, $/kun bilan);
   - **ishlamayotgan va eng yaxshi kreativlar**.

   Direktor izoh yozib «Koʻrib chiqildi»ni bosadi, PM ga Telegram xabari boradi.

Tizimdagi rollar va har biri nima berib, nima olishi «Jamoa» sahifasida koʻrsatilgan.

| Rol | Nima beradi | Nima oladi |
|---|---|---|
| Direktor | oylik reja, byudjet qarorlari, hisobotga izoh | PM hisoboti, tavsiyalar, byudjet taqsimoti |
| Proekt menejer | kunlik hisobot: holat, izoh, xulosa, ertangi reja | hamma raqamlar, kim kiritmagani, avtomatik tavsiyalar |
| Targetolog | xarajat, koʻrishlar, kliklar; har bir post/kreativ | qaysi kreativ ishlamayapti, qayerga byudjet qoʻshish kerak |
| ROP | lidlar, sotuvlar, tushum, rad sabablari | qaysi loyihada lid→sotuv past |
| Lid operatori | bot startlar, lidlar | — |
| Moliya | kassaga tushum, qayta sotuvlar | tushum va toʻlovlar farqi |
| Kreativchi (mobilograf) | video/rasm kreativlar | har bir kreativning CTR va lid narxi |

### Tavsiyalar qanday hisoblanadi (soʻnggi 7 kun)
- **Zarar:** ROAS < 1 boʻlsa, byudjetni qisqartirish taklif qilinadi.
- **Sotuvda muammo:** lid→sotuv oʻrtachaning 60% idan past boʻlsa. ROP ga asosiy rad sababi bilan vazifa beriladi.
- **Kreativ ishlamayapti:** quyidagilardan biri boʻlsa — kreativning CTR i oʻrtachaning 65% idan past, lid narxi 1.5 baravardan qimmat, $20 dan koʻp sarflanib lid yoʻq, yoki loyihaning lid narxi 1.4 baravardan qimmat.
- **Lid kerak:** oylik lid rejasidan orqada boʻlsa (kuniga qancha lid kerakligi hisoblanadi) yoki lidlar 15% dan koʻp kamaygan boʻlsa.
- **Oʻstirish mumkin:** ROAS oʻrtachadan 1.3 baravar yuqori va konversiya yaxshi boʻlsa.
- **Byudjet taqsimoti:** hozirgi ulush × (loyiha ROAS i / oʻrtacha ROAS). Koeffitsient 0.5 dan 1.6 gacha cheklanadi.

## Ichki ish uchun qulayliklar

- **Vazifalar.** Direktor yoki PM tavsiya yonidagi «+» ni bosadi. Vazifa ijrochi, loyiha va muddat bilan avtomatik toʻldiriladi.
  - Ijrochi vazifani «Kiritish» sahifasining tepasida va «Vazifalar» boʻlimida koʻradi va Telegramga xabar oladi.
  - Bajarilganini belgilasa, vazifa beruvchiga xabar boradi. Muddati oʻtgan vazifa qizil rangda koʻrinadi.
- **Sof foyda («Foyda»).** Reklamadan tashqari xarajatlar oy boʻyicha kiritiladi: ish haqi, ijara, oʻqituvchi va boshqalar.
  - Formula: tushum − reklama − loyiha xarajati − umumiy xarajatdan ulush = sof foyda va marja.
  - Umumiy xarajat loyihalarga tushumga mutanosib boʻlinadi.
  - Joriy oyda xarajat oʻtgan kunlarga mutanosib hisoblanadi.
- **Jadval rejimida kiritish.** Hamma loyiha bitta jadvalda koʻrinadi: kulrang raqam — kechagi qiymat, Enter — pastki qatorga oʻtish. «Hammasini saqlash» bitta tugma.
- **Xodimga loyiha biriktirish.** Targetolog yoki ROP faqat oʻz loyihalarini koʻradi. Kerak boʻlsa «Hamma loyihalar» tugmasi bor.
- **Signallar.** Hisobot vaqtida direktorga Telegram orqali ogohlantirish boradi, «Bugun» sahifasida ham chiqadi. Qachon:
  - lid narxi odatdagidan 1.8 barobar oshsa;
  - lid 2 barobar kamaysa;
  - xarajat birdan oshib ketsa.
- **Haftalik hisobot.** Har dushanba hisobot guruhiga boradi. Koʻrinishi: Sozlamalar → Maʼlumotlar.
- **Excel/CSV import** (eski maʼlumotlarni yuklash) va **bazaning zaxira nusxasini** bir tugma bilan yuklab olish.
- **Telefonga oʻrnatish (PWA).** Brauzer menyusidan «Bosh ekranga qoʻshish» — ilova kabi ochiladi.

## Imkoniyatlar

### Voronka va analitika
- **Voronka:** reklama xarajati ($) → kliklar → bot /start (reklama + **organik**) → lidlar → sotuvlar → tushum → qayta sotuv (LTV).
- **Organik oqim** = bot startlar − reklama kliklari (1000 klik va 2500 start boʻlsa, 1500 tasi organik).
- **Koʻrsatkichlar:** 1 start narxi, klik narxi, lid narxi, mijoz narxi (CAC), oʻrtacha chek, LTV, ROAS, ROI, foyda, kassaga tushgan pul.
- Har bir koʻrsatkich oldingi shunday davr bilan solishtiriladi. KPI kartalarida mini-grafik bor.
- **Loyihalarni taqqoslash:** jadvalni istalgan ustun boʻyicha saralash mumkin. Qatorni bosganda loyiha sahifasi ochiladi.
- **Loyiha sahifasi:** bitta kurs boʻyicha voronka, reja, grafiklar, kunma-kun jadval, reklama postlari va izohlar.
- **Grafiklar:** 35 kundan uzun davrda maʼlumot avtomatik haftalarga jamlanadi.
- **CSV eksport:** Excel toʻgʻri ochadi.

### Oylik reja (KPI)
- Rahbar har bir loyiha uchun oylik maqsad qoʻyadi: byudjet, lid, sotuv, tushum.
- Bosh panelda bajarilish foizi, bugungacha kutilgan ulush (chiziqdagi belgi) va **oy oxirigacha prognoz** koʻrinadi.
- Holatlar: «Reja boʻyicha», «Xavf ostida», «Orqada». Byudjet uchun: «Tez sarflanyapti».
- Rejadan orqada qolgan loyiha avtomatik ogohlantirishga tushadi va Telegram hisobotida chiqadi.
- «Oʻtgan oydan nusxa» tugmasi bor.

### Reklama postlari
- Targetolog har bir post yoki kampaniyani alohida kiritadi: platforma, xarajat, kliklar.
- Har bir post uchun **alohida bot havolasi** beriladi: `t.me/<bot>?start=ielts__kanal_1`. Shu havola orqali kelgan startlar avtomatik postga yoziladi.
- Har bir post va platforma uchun 1 start, 1 lid va 1 sotuv narxi hisoblanadi. Qaysi kanal yoki bloger arzonroq odam olib kelayotgani koʻrinadi.

### «Nega lid koʻp, sotuv past?»
- Menejerlar har kuni sotib olmaslik sabablarini kiritadi: qimmat, javob bermadi, oʻylab koʻradi, maqsadli emas va boshqalar.
- Har bir rol izoh qoldiradi.
- Avtomatik ogohlantirishlar chiqadi: konversiya oʻrtachadan past, ROAS < 1, lid narxi oshdi, sifatli lidlar kam, lid oʻsdi-yu sotuv oʻsmadi.

### Rollar va intizom

| Rol | Kim | Nimani kiritadi |
|---|---|---|
| Targetolog | targetolog | xarajat ($), koʻrishlar, kliklar, reklama postlari |
| Lid menejeri | Fotima | bot startlar (qoʻlda), lidlar, sifatli lidlar, sotib olmaslik sabablari |
| Sotuv menejeri | Madina | sotuvlar soni, tushum, sabablar |
| Moliya | Anvar | kassaga tushgan pul, qayta sotuvlar (LTV) |
| Rahbar (admin) | — | hammasi, loyihalar, rejalar, xodimlar, sozlamalar |

- Har bir xodim faqat oʻz maydonlarini koʻradi va oʻzgartiradi.
- Kiritish sahifasida kechagi qiymat koʻrinadi, konversiyalar yozish paytida hisoblanadi.
- Har bir oʻzgarish tarixga yoziladi: kim, qachon, eski va yangi qiymat.
- **Hisobot intizomi:** soʻnggi 14 kunda kim raqamlarni oʻz vaqtida kiritgani har bir rol uchun kunlik katakchalarda koʻrinadi.
- Yon panelda bugun kiritilmagan hisobotlar soni chiqadi.

### Telegram
- Bot `/start <loyiha>__<post>` deep linklarini sanaydi. Bitta odam kuniga bir marta hisoblanadi.
- Bot loyiha kanaliga **admin** qilib qoʻshilsa, kanalga qoʻshilgan va chiqib ketganlarni sanaydi.
- **Kunlik hisobot** belgilangan vaqtda guruhga boradi: voronka, loyihalar, oylik reja, ogohlantirishlar, kim kiritmagani. Xohlasangiz AI tahlil ham qoʻshiladi. Hisobot qanday koʻrinishini Sozlamalarda oldindan koʻrish mumkin.
- Hisobot kiritmagan menejerlarga shaxsiy **eslatma** boradi.
- **Telegram Mini App:** `APP_URL` berilsa, bot menyusida «Hisobot» tugmasi paydo boʻladi. Menejer platformani Telegram ichida ochadi va login-parolsiz kiradi: Telegram imzosi tekshiriladi, Telegram ID xodim profiliga bogʻlangan boʻlishi kerak.
- Bot buyruqlari: `/app`, `/hisobot`, `/kecha`, `/id`.
- Loyihaning oʻz boti boʻlsa, u hodisalarni `POST /api/track` orqali yuboradi (pastda).

### AI tahlil (Claude)
- Tanlangan davr va loyiha boʻyicha toʻliq tahlil beradi: qisqa xulosa, loyihalar, muammolar va sabablar, tavsiyalar (kim, nima qiladi).
- Tayyor savollar bor: «Byudjetni qaysi loyihaga oshirish kerak?», «Rejani bajarish uchun kim nima qilishi kerak?» va boshqalar. Erkin savol ham berish mumkin.
- Tahlillar tarixda saqlanadi.

### Boshqa
- Tungi va yorugʻ rejim. Telegram ichida Telegram mavzusiga moslashadi.
- Telefonga moslashgan: pastki menyu bor.
- Har bir xodim oʻz parolini oʻzgartira oladi.

![PM hisoboti](screenshots/pm-report.png)

![Kreativlar](screenshots/creatives.png)

## Ishga tushirish (lokal)

Node.js **22.5+** kerak. Maʼlumotlar bazasi Node ichidagi SQLite, alohida baza oʻrnatish shart emas.

```bash
cd analytika
npm install
cp .env.example .env      # kalitlarni yozing
npm run demo              # (ixtiyoriy) 45 kunlik namuna: 4 loyiha, postlar, oylik reja
npm start                 # http://localhost:3000
npm test                  # testlar
```

Namuna maʼlumot bilan kirish uchun loginlar: `admin` (direktor), `pm`, `target`, `madina` (ROP), `fotima`, `anvar`, `kreativ`. Hammasining paroli `demo1234`.
Haqiqiy ishga tushirishda `npm run demo` ni bajarmang. Birinchi ishga tushganda admin paroli konsolga chiqadi yoki `ADMIN_PASSWORD` dan olinadi.

## Serverga joylash

### Docker (eng oson)
```bash
cp .env.example .env      # ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, APP_URL, ADMIN_PASSWORD
docker compose up -d      # ma'lumotlar ./data papkasida saqlanadi
```

### Oddiy VPS (Ubuntu)
1. Node 22 ni oʻrnating va kodni `/opt/analytika` ga joylang, keyin `npm ci --omit=dev`.
2. `deploy/analytika.service` → systemd orqali avtomatik ishga tushadi.
3. `deploy/nginx.conf` → domen va HTTPS (`certbot --nginx`). Telegram Mini App uchun HTTPS majburiy.
4. `.env` ga `COOKIE_SECURE=1` va `APP_URL=https://sizning-domen` yozing.
5. `deploy/backup.sh` → bazaning kunlik zaxira nusxasi (cron).

### Sozlash tartibi
1. **Sozlamalar → Loyihalar:** har bir kurs yoki loyihani qoʻshing.
2. **Sozlamalar → Oylik rejalar:** har bir loyiha uchun maqsad kiriting.
3. **Sozlamalar → Xodimlar:** Fotima, Madina, Anvar va targetologga login bering va rol tanlang. Telegram ID ni ham kiriting: xodim botga `/id` yozib bilib oladi.
4. **Telegram:** botni kanallarga admin qiling va kanal ID sini loyihaga kiriting. Hisobot boradigan guruh ID sini va vaqtni belgilang.
5. **Reklama:** targetolog «Reklama postlari» boʻlimida post qoʻshadi va bergan havolani postga qoʻyadi.

## Tracking API

```http
POST /api/track
Content-Type: application/json

{"key": "<loyihaning tracking kaliti>", "event": "start", "tg_user_id": 123456, "source": "kanal_1"}
```

`event`: `start` · `lead` · `sale` · `join` · `leave`. Kalit **Sozlamalar → Loyihalar** boʻlimida.
- `source` post tegiga teng boʻlsa, natija shu postga yoziladi.
- Avtomatik sanalgan startlar qoʻlda kiritilganidan ustun turadi.
- Lid va sotuvlar esa qoʻlda kiritilmagan boʻlsagina avtomatik hisobdan olinadi.

## Brauzer demosi

`npm run build:demo` server kodini oʻzgartirmasdan bitta HTML faylga (`dist/demo.html`) yigʻadi. Unda server oʻrniga brauzer ichidagi xotira ishlaydi, hisob-kitob kodi esa oʻsha (`src/metrics.js`). claude.ai artifakt sifatida joylanganda AI tahlil va CSV yuklab olish ham ishlaydi.

## Tuzilishi

```
src/server.js      HTTP server, API, rejalashtiruvchi (hisobot/eslatma)
src/db.js          SQLite sxema, rollar, maydonlar, platformalar
src/metrics.js     voronka, konversiya, LTV/ROAS, o'sish, reja/prognoz, postlar, intizom, avto-xulosalar
src/extras.js      vazifalar, xarajat va sof foyda, signallar, haftalik hisobot, CSV import
src/reports.js     PM hisoboti: qoralama → yuborish → direktor ko'rib chiqadi, Telegram matni
src/auth.js        parollar, sessiyalar, Telegram Mini App imzosini tekshirish
src/ai.js          Claude orqali AI tahlil (ko'rsatma: ai-prompt.js)
src/telegram.js    bot: deep link, kanal a'zolari, hisobot, eslatma, Mini App menyusi
src/demo-data.js   namuna ma'lumotlar (server va brauzer demosi uchun)
public/js/         interfeys: core, today (direktor), report (PM, arxiv, jamoa), tasks, profit, dashboard, project, entry, campaigns, ai, settings
demo/              brauzer demosini yig'ish
deploy/            systemd, nginx, zaxira nusxa
test/              testlar — npm test
```

## Keyingi qadamlar (taklif)
- Facebook/Instagram Ads API: xarajat va kliklar avtomatik keladi, targetolog qoʻlda kiritmaydi.
- AmoCRM yoki Bitrix24 bilan ulash: lid va sotuvlar avtomatik tushadi.
- Payme/Click toʻlovlarini avtomatik hisobga olish (moliya uchun).
- Kogorta tahlili: qaysi oyda kelgan mijozlar keyin qancha qayta sotib oldi.
