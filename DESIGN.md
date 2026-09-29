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
