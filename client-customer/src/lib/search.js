// -- Tìm xe: cùng quy tắc với server/src/utils/search.js (có test so khớp hai bên) --

export function fold(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

export function searchTokens(query) {
  return fold(query)
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 8);
}

function indexChars(chars) {
  let compact = '';
  const origin = [];
  const starts = [];
  const ends = [];
  let inWord = false;
  chars.forEach((ch, i) => {
    const folded = fold(ch);
    const alnum = folded.replace(/[^a-z0-9]/g, '');
    if (alnum) {
      if (!inWord) starts.push(compact.length);
      for (const c of alnum) {
        compact += c;
        origin.push(i);
      }
      inWord = true;
    } else if (folded) {
      if (inWord) ends.push(compact.length);
      inWord = false;
    }
  });
  if (inWord) ends.push(compact.length);
  return { compact, origin, starts, ends };
}

export function findToken(index, token) {
  let word = 0;
  for (let at = index.compact.indexOf(token); at !== -1; at = index.compact.indexOf(token, at + 1)) {
    while (word + 1 < index.starts.length && index.starts[word + 1] <= at) word += 1;
    if (index.starts[word] === at || at + token.length <= index.ends[word]) return at;
  }
  return -1;
}

export function matchesText(text, query) {
  const tokens = searchTokens(query);
  const index = indexChars([...String(text ?? '')]);
  return tokens.length > 0 && tokens.every((token) => findToken(index, token) !== -1);
}

export function highlight(text, query) {
  const chars = [...String(text ?? '')];
  const index = indexChars(chars);
  const marked = chars.map(() => false);
  for (const token of searchTokens(query)) {
    const at = findToken(index, token);
    if (at === -1) continue;
    for (let i = index.origin[at]; i <= index.origin[at + token.length - 1]; i++) marked[i] = true;
  }

  const segments = [];
  chars.forEach((ch, i) => {
    const last = segments[segments.length - 1];
    if (last && last.match === marked[i]) last.text += ch;
    else segments.push({ text: ch, match: marked[i] });
  });
  return segments;
}
