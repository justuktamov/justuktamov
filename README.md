# Loyihalar analitikasi

Loyihalar direktori har kuni proekt menejerdan bitta tushunarli hisobot oladigan platforma. Hisobotda bugun qaysi loyihaga targetga qancha sarflangani, nechta klik va lid boʻlgani, qaysi loyiha oqsoqlanayotgani, qayerga koʻproq lid kerakligi va qaysi kreativ ishlamayotgani koʻrinadi.

## Kim ishlatadi

Dasturda bitta foydalanuvchi bor: **proekt menejer (PM)**. Targetolog va ROP tizimga kirmaydi — PM raqamlarni ulardan oladi va oʻzi kiritadi. Direktor hisobotni Telegramda oladi.

## Kunlik ish: 4 qadam

PM kirganda «Bugun» sahifasi ochiladi va qaysi qadamda turgani yuqorida koʻrinadi. 1 va 2-qadamda soʻraladigan savollar roʻyxati bor. «Nusxalash» tugmasi ularni tayyor xabar qilib beradi — targetolog yoki ROP ga Telegramda yuborasiz.

1. **Targetologdan soʻrang** (har bir loyiha boʻyicha):
   - qancha pul sarflandi ($), nechta koʻrish va klik boʻldi;
   - bugun nechta yangi kreativ chiqdi;
   - qaysi kreativ yaxshi ishladi, qaysi biri ishlamadi;
   - reklamada muammo boʻldimi (akkaunt, moderatsiya, toʻlov).

   **Lid narxi** soʻralmaydi — tizim oʻzi hisoblaydi: xarajat ÷ lid.
2. **Sotuv boʻlimi rahbaridan (ROP) soʻrang:**
   - jami lid, shundan **sifatli** (sotib olishga tayyor), **potensial** (qiziqdi, keyinroq oladi) va **sifatsiz** (maqsadli emas);
   - nechta sotuv va qancha summa;
   - nega sotib olmayapti (izoh).

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
| Bugun | 4 qadamli kunlik hisobot |
| Hisobotlar | oldingi kunlar; istalgan kunni ochib tuzatish mumkin |
| Statistika | davr boʻyicha raqamlar, oylik reja, loyihalar taqqoslash, grafiklar; loyihani bossangiz — kunma-kun jadval va izohlar; CSV |
| Sozlamalar | loyihalar, oylik reja, Telegram (hisobot qayerga boradi, eslatma vaqti, dollar kursi), profil va parol |

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
