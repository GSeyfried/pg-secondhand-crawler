export function validateListing(value) {
  const errors=[];
  if (!value.id) errors.push('stable internal id is required');
  if (!value.source) errors.push('source is required');
  try { const u=new URL(value.sourceUrl); if (!/^https?:$/.test(u.protocol)) throw new Error(); } catch { errors.push('valid source URL is required'); }
  if (!value.title?.trim() && !value.description?.trim()) errors.push('title or meaningful description is required');
  if (!value.retrievedAt || Number.isNaN(Date.parse(value.retrievedAt))) errors.push('retrieval timestamp is required');
  if (value.price?.amount != null && (!Number.isFinite(value.price.amount) || value.price.amount < 0)) errors.push('price amount is invalid');
  return { success: errors.length === 0, errors };
}
