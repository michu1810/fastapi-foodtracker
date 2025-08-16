export type AnyCategory = {
  id?: number;
  name?: string | null;
  icon_name?: string | null;
};

const VALID_ICON_KEYS = new Set([
  'dairy',
  'vegetables',
  'fruits',
  'meat',
  'fish_seafood',
  'bakery',
  'beverages',
  'sweets_snacks',
  'dry_goods',
  'frozen',
  'other',
]);

export function categoryI18nKey(cat?: AnyCategory | null): string {
  const key = (cat?.icon_name ?? '').trim();
  if (VALID_ICON_KEYS.has(key)) return key;
  return 'other';
}
