// «Agar … tiksak, qancha keladi?» — reklama byudjetidan lid, sotuv, tushum va sof foydani taxmin qiladi.
// DOM ga bog'liq emas (testda ham ishlatiladi). m — /api/control dagi loyiha «model» i (oylik asosda).
//
// Taxmin qoidasi: byudjet oshsa, reklama kengroq auditoriyaga chiqadi — 1 lid (yoki 1 xarid) qimmatlashadi:
// byudjet 2 barobar bo'lsa, narx ~19% oshadi (daraja 0,25). Kamaysa — eng arzon auditoriya qoladi, narx biroz tushadi (0,1).
// Konversiya, o'rtacha chek, tannarx foizi, marketing va doimiy xarajat — shu davrdagidek qoladi deb olinadi.
export function forecast(m, budget) {
  if (!m || !m.unit_cost || !m.rate || !(budget >= 0)) return null;
  const base = m.spend_month > 0 ? m.spend_month : budget || 1;
  const scale = budget > 0 ? budget / base : 1;
  const k = scale >= 1 ? scale ** 0.25 : scale ** 0.1;
  const unit = m.unit_cost * k;
  const units = budget > 0 ? budget / unit : 0;
  const leads = m.kind === 'auto' ? null : units;
  const sales = m.kind === 'auto' ? units : units * (m.conv || 0);
  const revenue = sales * (m.avg_check || 0);
  const adUzs = budget * m.rate;
  const profit = revenue * (1 - (m.var_pct || 0)) - adUzs - (m.marketing_month || 0) - (m.fixed_month || 0);
  return { budget, unit, leads, sales, revenue, ad_uzs: adUzs, profit, cac: sales > 0 ? (adUzs + (m.marketing_month || 0)) / sales : null };
}

// Eng ko'p sof foyda beradigan byudjet (oyiga, $): hozirgisining 0,2× … 4× oralig'ida qidiriladi
export function bestBudget(m) {
  if (!m || !m.unit_cost || !m.rate || !m.avg_check) return null;
  const base = m.spend_month > 0 ? m.spend_month : 300;
  let best = null;
  for (let i = 0; i <= 76; i++) {
    const b = base * (0.2 + i * 0.05);
    const f = forecast(m, b);
    if (f && (!best || f.profit > best.profit)) best = f;
  }
  return best;
}
