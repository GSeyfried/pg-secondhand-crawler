const NA = new Set(['US','CA','MX','BZ','CR','SV','GT','HN','NI','PA','AG','BS','BB','CU','DM','DO','GD','HT','JM','KN','LC','VC','TT','GL']);
const aliases = new Map(Object.entries({
  'united states':'US', usa:'US', us:'US', canada:'CA', mexico:'MX', belize:'BZ', 'costa rica':'CR', 'el salvador':'SV', guatemala:'GT', honduras:'HN', nicaragua:'NI', panama:'PA', greenland:'GL',
  germany:'DE', france:'FR', italy:'IT', spain:'ES', portugal:'PT', austria:'AT', switzerland:'CH', netherlands:'NL', belgium:'BE', slovenia:'SI', slovakia:'SK', romania:'RO', poland:'PL', turkey:'TR', 'united kingdom':'GB', ireland:'IE', norway:'NO', sweden:'SE', finland:'FI', denmark:'DK', australia:'AU', 'new zealand':'NZ', brazil:'BR', argentina:'AR', chile:'CL', colombia:'CO', peru:'PE', india:'IN', china:'CN', japan:'JP', indonesia:'ID', nepal:'NP', 'south africa':'ZA', morocco:'MA'
}));
const usRegions = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' '));
export function classifyLocation(raw) {
  if (!raw) return { raw: null, city: null, region: null, country: null, isNorthAmerica: null };
  const parts = raw.split(',').map(s=>s.trim()).filter(Boolean); const lower=raw.toLowerCase();
  let country = [...aliases].find(([name]) => new RegExp(`\\b${name.replace(' ','\\s+')}\\b`,'i').test(lower))?.[1] ?? null;
  const region = parts.find(p => usRegions.has(p.toUpperCase()))?.toUpperCase() ?? null;
  if (!country && region) country='US';
  const city = parts.length > 1 ? parts[0] : null;
  return { raw, city, region, country, isNorthAmerica: country ? NA.has(country) : null };
}
