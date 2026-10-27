// Tree layout consumes siblings from left to right. Priority is defined right to left.
function sortTreeMembers(members) {
  const groups = new Map();
  for (const member of members) {
    const key = member.parent_id == null ? 'root' : String(member.parent_id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(member);
  }
  const date = m => m.birth_date && m.birth_date_precision !== 'UNKNOWN' ? String(m.birth_date).slice(0, 10) : null;
  const gender = m => m.gender === 'M' ? 0 : m.gender === 'F' ? 1 : 2;
  const result = [];
  for (const siblings of groups.values()) {
    // Use a single rule for each year to keep sorting transitive when precision differs.
    const partialYears = new Set(siblings.filter(m => date(m) && ['YEAR', 'LEGACY'].includes(m.birth_date_precision)).map(m => date(m).slice(0, 4)));
    const priority = (a, b) => {
      const ad = date(a), bd = date(b);
      if (!!ad !== !!bd) return ad ? -1 : 1;
      if (ad && bd) {
        const year = ad.slice(0, 4).localeCompare(bd.slice(0, 4));
        if (year) return year;
        if (!partialYears.has(ad.slice(0, 4))) {
          const day = ad.localeCompare(bd);
          if (day) return day;
        }
      }
      return gender(a) - gender(b) || Number(a.id) - Number(b.id);
    };
    result.push(...siblings.slice().sort((a, b) => priority(b, a)));
  }
  return result;
}
module.exports = { sortTreeMembers };
