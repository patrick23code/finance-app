export const BANKS = [
  // ── US Banks ──────────────────────────────────────────────
  { id: 'chase',          name: 'Chase',           aliases: ['jpmorgan', 'jp morgan'],  domain: 'chase.com',           brandColor: '#117ACA', country: 'US' },
  { id: 'citi',           name: 'Citibank',        aliases: ['citi', 'citicorp'],       domain: 'citi.com',            brandColor: '#003B8E', country: 'US' },
  { id: 'capitalone',     name: 'Capital One',     aliases: ['cap one', 'cap1'],        domain: 'capitalone.com',      brandColor: '#D03027', country: 'US' },
  { id: 'amex',           name: 'American Express',aliases: ['amex', 'americanexpress'],domain: 'americanexpress.com', brandColor: '#007BC1', country: 'US' },
  { id: 'bofa',           name: 'Bank of America', aliases: ['boa', 'bank of america'], domain: 'bankofamerica.com',   brandColor: '#E31837', country: 'US' },
  { id: 'wellsfargo',     name: 'Wells Fargo',     aliases: ['wells'],                  domain: 'wellsfargo.com',      brandColor: '#D71E28', country: 'US' },
  { id: 'discover',       name: 'Discover',        aliases: [],                         domain: 'discover.com',        brandColor: '#F76A1A', country: 'US' },
  { id: 'usbank',         name: 'US Bank',         aliases: ['usb', 'us bancorp'],      domain: 'usbank.com',          brandColor: '#0860AE', country: 'US' },
  { id: 'apple',          name: 'Apple Card',      aliases: ['apple card', 'goldman'],  domain: 'apple.com',           brandColor: '#1C1C1E', country: 'US' },
  { id: 'synchrony',      name: 'Synchrony',       aliases: ['synchrony bank'],         domain: 'synchrony.com',       brandColor: '#6C3B9B', country: 'US' },
  { id: 'barclays',       name: 'Barclays',        aliases: [],                         domain: 'barclays.com',        brandColor: '#00AEEF', country: 'US' },
  { id: 'tdbank',         name: 'TD Bank',         aliases: ['td', 'toronto dominion'], domain: 'td.com',              brandColor: '#34A853', country: 'US' },
  { id: 'lendingclub',    name: 'LendingClub',     aliases: ['lending club'],           domain: 'lendingclub.com',     brandColor: '#4B2E83', country: 'US' },
  { id: 'bestbuy',        name: 'Best Buy',        aliases: [],                         domain: 'bestbuy.com',         brandColor: '#0046BE', country: 'US' },
  { id: 'paypal',         name: 'PayPal',          aliases: [],                         domain: 'paypal.com',          brandColor: '#003087', country: 'US' },
  { id: 'navy_federal',   name: 'Navy Federal',    aliases: ['navy fed', 'nfcu'],       domain: 'navyfederal.org',     brandColor: '#003087', country: 'US' },
  // ── Turkish Banks ─────────────────────────────────────────
  { id: 'ziraat',         name: 'Ziraat Bankası',  aliases: ['ziraat'],                 domain: 'ziraatbank.com.tr',   brandColor: '#E30613', country: 'TR' },
  { id: 'garanti',        name: 'Garanti BBVA',    aliases: ['garanti', 'bbva'],        domain: 'garantibbva.com.tr',  brandColor: '#009639', country: 'TR' },
  { id: 'isbank',         name: 'İş Bankası',      aliases: ['is bankasi', 'isbank'],   domain: 'isbank.com.tr',       brandColor: '#003087', country: 'TR' },
  { id: 'akbank',         name: 'Akbank',          aliases: [],                         domain: 'akbank.com',          brandColor: '#EF3024', country: 'TR' },
  { id: 'yapikredi',      name: 'Yapı Kredi',      aliases: ['yapi kredi', 'yk'],       domain: 'yapikredi.com.tr',    brandColor: '#003087', country: 'TR' },
  { id: 'finansbank',     name: 'QNB Finansbank',  aliases: ['finansbank', 'qnb'],      domain: 'finansbank.com.tr',   brandColor: '#8B0000', country: 'TR' },
  { id: 'halkbank',       name: 'Halkbank',        aliases: [],                         domain: 'halkbank.com.tr',     brandColor: '#003087', country: 'TR' },
  { id: 'vakifbank',      name: 'VakıfBank',       aliases: ['vakif bank', 'vakifbank'],domain: 'vakifbank.com.tr',    brandColor: '#FFC72C', country: 'TR' },
  { id: 'denizbank',      name: 'DenizBank',       aliases: ['deniz bank'],             domain: 'denizbank.com',       brandColor: '#003087', country: 'TR' },
  { id: 'teb',            name: 'TEB',             aliases: ['turk ekonomi bankasi'],   domain: 'teb.com.tr',          brandColor: '#003087', country: 'TR' },
]

export function getBank(idOrName) {
  if (!idOrName) return null
  const lower = idOrName.toLowerCase()
  return BANKS.find(b =>
    b.id === lower ||
    b.name.toLowerCase() === lower ||
    (b.aliases || []).some(a => a === lower)
  ) || null
}

export function searchBanks(query) {
  if (!query) return BANKS.slice(0, 8)
  const q = query.toLowerCase()
  return BANKS.filter(b =>
    b.name.toLowerCase().includes(q) ||
    b.id.includes(q) ||
    (b.aliases || []).some(a => a.includes(q))
  ).slice(0, 8)
}
