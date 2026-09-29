# Do'stim — uy hayvonlari bozori (UI/UX konsepti, kattalar auditoriyasi 20-60 yosh, iPhone 17 Pro Max maketi)

**Model:** e'lon joylash bepul; faqat TOP ga chiqarish pullik (1/3/7 kun). Ro'yxatdan o'tmasdan ko'rish mumkin, e'lon berish/aloqa uchun telefon orqali kirish.

## Ekranlar (prototype/index.html — brauzerda oching)
1. Welcome — bitta CTA "Boshlash"
2. Bosh sahifa — hudud tanlagich (respublika/viloyat), qidiruv, 8 kategoriya, TOP e'lonlar (gorizontal), yangi e'lonlar (2 ustun)
3. E'lon tafsiloti — katta rasm, yosh/jins/vazn, tavsif, sotuvchi, "Qo'ng'iroq" + chat
4. Sevimlilar
5. E'lon berish — 3 qadam: rasm → ma'lumot → narx va hudud; oxirida "TOP ga chiqarish" taklifi
6. TOP tariflari — 1/3/7 kun, Click/Payme/Uzcard
7. Xabarlar, Profil (mening e'lonlarim, TOP tugmasi)

## UX tamoyillari
- Qo'l bilan ishlashga qulay: pastki tab bar, markazda katta "+" tugma
- Har qadamda bitta asosiy harakat, katta (54px) tugmalar
- "Bepul" xabari e'lon berish jarayonida doim ko'rinadi
- Yumshoq yalpiz (mint) uslub, TOP = oltin aksent
- Xavfsizlik eslatmasi va shikoyat tugmasi

## Keyingi qadamlar
Backend (auth OTP, rasm yuklash, qidiruv/filtr), to'lov (Click/Payme), moderatsiya, push xabarlar; mobil ilova (Flutter yoki React Native).

## Dizayn tizimi (v3)
- **Shrift:** bitta oila — Inter (Google Fonts), tizim shrifti zaxira. Serif yo'q.
- **O'lchamlar:** Display 28/34 · Title 22/28 · Headline 17/24 · Body 15/22 · Callout 14/20 · Caption 12/16. Narxlar va raqamlar — tabular raqamlar.
- **Ranglar:** fon #F4F4F1, kartalar oq, matn #121815 / #4B5550 / #8A928E, brend yashil #1E4D3A, TOP oltin #94650F.
- **Shakl:** radius 12 (tugma, input) · 16 (karta, guruh) · 24 (sheet); gutter 20px; soyalar faqat suzuvchi elementlarda.
- **O'zbek imlosi:** oʻ/gʻ uchun U+02BB, tutuq belgisi uchun U+02BC avtomatik qo'yiladi.
- **Komponentlar:** guruhlangan ro'yxat (iOS uslubi), segment boshqaruv, pastki sheet, pastda qotirilgan CTA.

## Prototip imkoniyatlari (v4)
- **Barcha tugmalar ishlaydi:** hudud, qidiruv, filtr/saralash, kategoriya, saqlash, ulashish, qo'ng'iroq, shikoyat, sotuvchi sahifasi, chat (xabar yuborish), bildirishnomalar.
- **Kirish:** telefon raqam + SMS kod (prototipda istalgan 4 raqam). Mehmon rejimida ko'rish mumkin; e'lon berish va yozish uchun kirish so'raladi.
- **E'lon berish:** kamera/galereyadan haqiqiy rasm tanlash, 3 qadam, tekshiruv, tahrirlash.
- **Mening e'lonlarim:** faol/sotilgan, TOP ga chiqarish, tahrirlash, sotildi deb belgilash, o'chirish.
- **TOP to'lov:** tarif, to'lov usuli, to'lov jarayoni, to'lovlar tarixi.
- **Sozlamalar:** tungi rejim (tizim/yorug'/tungi), til (lotin/kirill), bildirishnomalar, yordam markazi (FAQ + qo'llab-quvvatlash chati), profilni tahrirlash, ilova haqida, chiqish.
- **Scroll:** sichqoncha bilan sudrab aylantirish (ekranlar, kategoriyalar, TOP karusel, rasm galereyasi).
- **Rasmlar:** namuna fotosuratlar `index.html` ichiga joylangan va `<canvas>` ga chiziladi, shuning uchun rasm havolalarini bloklaydigan (CSP) oynalarda ham ko'rinadi. Foydalanuvchi yuklagan rasmlar 1080 px gacha kichraytirilib xotirada saqlanadi.
- **Maket:** iPhone 17 Pro Max, ingichka ramka (440×956 ekran).

## Tuzilishi
- `prototype/src/app.html` — sahifa tuzilishi va uslublar
- `prototype/src/app.js` — ilova kodi
- `prototype/src/i18n-ru.json` — rus tili lug'ati
- `prototype/img/` — namuna fotosuratlar (manba: `img/CREDITS.md`)
- `python3 prototype/build.py` — rasmlarni ichiga joylab `prototype/index.html` ni yig'adi

## v1.1 — qo'shilgan imkoniyatlar
**Ishonch va xavfsizlik**
- Tasdiqlangan sotuvchi (ko'k belgi): telefon → pasport/ID rasmi → selfi → tekshiruv.
- Sotuvchi reytingi va sharhlar; sharh yozish (1–5 yulduz + izoh).
- Veterinar hujjatlari: e'longa hujjat turlari belgilanadi, «Hujjatli» belgisi, filtrda «Faqat hujjatlilar».
- Chatda firibgarlik ogohlantirishi: «karta», «oldindan to'lov», karta raqami kabi so'zlar aniqlanadi.

**E'lon beruvchi uchun**
- Video qo'shish (15–30 soniya), filtrda «Faqat videoli».
- Kategoriyaga mos maydonlar: it/mushuk zoti; chorva turi, zoti, bosh soni, sut miqdori; qushlar — tuxum beradi.
- Narx turi: Narx / Kelishiladi / Bepul beraman.
- Tepaga ko'tarish: 7 kunda bir marta bepul, keyin 5 000 so'm.
- E'lon statistikasi: 7 kunlik ko'rishlar, qo'ng'iroqlar, saqlashlar grafigi va konversiya.

**Xaridor uchun**
- Saqlangan qidiruvlar va ular bo'yicha bildirishnoma.
- Viloyat → tuman tanlash, «Yaqinlari» saralash (km bilan).
- Sxematik xarita: hududlar bo'yicha e'lonlar soni, bosilganda ro'yxat.
- O'xshash e'lonlar.

**Daromad**
- Reklama: TOP (1/3/7 kun), VIP (oltin ramka, ro'yxatda birinchi), «Shoshilinch» belgisi.
- Biznes hisob (Start / Pro obuna): do'kon sahifasi, logotip, muqova.
- Xizmatlar bo'limi: veterinar, gruming, kinolog, yem-xashak, aksessuarlar.
- Hamyon: to'ldirish (Click, Payme, Uzcard, Humo) va bir bosishda to'lash, tarix.

**Qo'shimcha**
- Rus tili (to'liq interfeys; foydalanuvchi matnlari tarjima qilinmaydi).
- Yo'qolgan va topilgan hayvonlar bo'limi (bepul, mukofot ko'rsatish mumkin).
- Chatda rasm, joylashuv yuborish va tayyor javoblar.
