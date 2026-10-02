# Loyihalar analitikasi

Kompaniyaning data-analitigi: hamma loyihalar (STARPAY, VIZART, DIZIPRO, SELFENG) bir ekranda — qaysi loyihaga qancha pul sarflandi, qancha tushdi, foyda va sof foyda qancha, konversiya qanday, lid sifati nega past, narxni koʻtarish kerakmi yoki tushirish. Har kungi majlisda (PM, ROP, targetolog) shu ekran ochiladi.

Raqamlarni har kuni **proekt menejer (PM)** kiritadi: targetologdan, sotuv boʻlimi rahbaridan (ROP) va botdan olib. Direktor kunlik hisobotni Telegramda oladi va javob qilib yechim yozadi.

## Loyihalar (bosh sahifa)

- **Tepada — jami pul:** reklamaga sarflandi, tushum, foyda (tushum − reklama), sof foyda va marja (%). Har biri oldingi shuncha kunga nisbatan oʻzgarishi bilan. Zarardagi loyihalar alohida qatorda.
- **Har kungi pul:** har kuni tushgan pul va barcha xarajat (reklama + tannarx + doimiy) grafigi.
- **Loyihalar ketma-ket:** har bir qatorda reklama, tushum, sof foyda, marja, konversiya va holat. **Bosilsa ochiladi, yana bosilsa yigʻiladi.** Ichida:
  - **Pul:** tushum → − reklama → foyda → − tannarx → − doimiy xarajat → sof foyda, har biri tushumning necha foizi;
  - **Voronka:** klik → lid → sifatli lid → sotuv (avtovoronkada klik → bot start → xarid), har bosqich konversiyasi; 1 lid, 1 sifatli lid, 1 mijoz narxi, oʻrtacha chek;
  - **Lid sifati:** sifatli / potensial / sifatsiz ulushi, **nega sifatsiz** (sabablar foizda) va sifatsiz lidlarga ketgan pul;
  - **Nega sotib olmadi:** sabablar foizda;
  - **Narx:** koʻtarish, tushirish yoki oʻzgartirmaslik tavsiyasi — 1 sotuvdan sof foyda va zararsizlik narxi bilan;
  - **Xulosa:** zarar va uning eng katta sababi, sifatsiz lidlar, past konversiya, qimmatlashgan lid, javob kutayotgan potensial lidlar; targetolog va ROP izohlari;
  - har kungi pul grafigi va kunma-kun jadval.
- Pastda — oylik reja (tushum, sotuv, lid, byudjet) va prognoz.

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

«Bugungi hisobot» boʻlimida PM qaysi qadamda turgani yuqorida koʻrinadi. 1 va 2-qadamda soʻraladigan savollar roʻyxati bor. «Nusxalash» tugmasi ularni tayyor xabar qilib beradi — targetolog yoki ROP ga Telegramda yuborasiz.

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

4. **Yuborish.** Direktor Telegramda har bir loyiha boʻyicha raqamlar, muammolar (⚠️) va PM takliflarini (💡) oladi.
   - Direktor shu xabarga **javob (reply)** qilib yechim yozadi. Javob hisobotga saqlanadi va PM ga Telegramda boradi.
   - Ertasi kuni «Bugun» sahifasining tepasida «Direktor yechimi» boʻlib turadi.

Har qadamni «Oʻtkazib yuborish» mumkin. Belgilangan vaqtgacha hisobot yuborilmasa, PM ga Telegramda eslatma boradi; avto-hisobot vaqtigacha ham yuborilmasa, direktorga «PM hisobotni yubormadi» belgisi bilan avtomatik hisobot ketadi.

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
| Loyihalar | butun biznes raqamlarda: pul, foyda, konversiya, lid sifati, narx; loyiha bosilsa ochiladi; CSV |
| Bugungi hisobot | PM ning 4 qadami: target → sotuv va tushgan pul → tahlil → direktorga |
| Hisobotlar | oldingi kunlar; istalgan kunni ochib tuzatish mumkin |
| Sozlamalar | loyihalar (turi, tannarx %, doimiy xarajat), oylik reja, Telegram, profil |

## Ishga tushirish (lokal)

Node.js **22.5+** kerak. Maʼlumotlar bazasi Node ichidagi SQLite, alohida baza oʻrnatish shart emas.

```bash
cd analytika
npm install
cp .env.example .env      # TELEGRAM_BOT_TOKEN, ADMIN_PASSWORD
npm run demo              # (ixtiyoriy) 45 kunlik namuna: 4 loyiha va oylik reja
npm start                 # http://localhost:3000
npm test                  # testlar
```

Namuna maʼlumot bilan kirish: login `pm`, parol `demo1234`.
Haqiqiy ishga tushirishda `npm run demo` ni bajarmang. Birinchi ishga tushganda PM logini (`ADMIN_LOGIN`, odatda `pm`) yaratiladi, parol `ADMIN_PASSWORD` dan olinadi yoki konsolga chiqadi.

## Serverga joylash

### Docker (eng oson)
```bash
cp .env.example .env      # TELEGRAM_BOT_TOKEN, ADMIN_PASSWORD
docker compose up -d      # ma'lumotlar ./data papkasida saqlanadi
```

### Oddiy VPS (Ubuntu)
1. Node 22 ni oʻrnating va kodni `/opt/analytika` ga joylang, keyin `npm ci --omit=dev`.
2. `deploy/analytika.service` → systemd orqali avtomatik ishga tushadi.
3. `deploy/nginx.conf` → domen va HTTPS (`certbot --nginx`).
4. `.env` ga `COOKIE_SECURE=1` yozing.
5. `deploy/backup.sh` → bazaning kunlik zaxira nusxasi (cron).

### Sozlash tartibi
1. Birinchi kirishda «Bugun» sahifasi STARPAY, VIZART, DIZIPRO, SELFENG ni bir bosishda qoʻshishni taklif qiladi.
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
src/demo-data.js   namuna ma'lumotlar (server va brauzer demosi uchun)
public/js/         interfeys: core, pm (4 qadam va arxiv), stats, settings
demo/              brauzer demosini yig'ish
deploy/            systemd, nginx, zaxira nusxa
test/              testlar — npm test
```
