const diacriticsMap: Record<string, string> = {
  á: 'a', č: 'c', ď: 'd', é: 'e', ě: 'e', í: 'i', ň: 'n',
  ó: 'o', ř: 'r', š: 's', ť: 't', ú: 'u', ů: 'u', ý: 'y', ž: 'z',
  Á: 'a', Č: 'c', Ď: 'd', É: 'e', Ě: 'e', Í: 'i', Ň: 'n',
  Ó: 'o', Ř: 'r', Š: 's', Ť: 't', Ú: 'u', Ů: 'u', Ý: 'y', Ž: 'z',
};

export const slugify = (text: string): string =>
  text
    .replace(/[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, (ch) => diacriticsMap[ch] ?? ch)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
