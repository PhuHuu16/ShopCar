// -- Tìm xe theo tên: không phân biệt hoa thường, có dấu hay không, có gạch / khoảng trắng hay không --

function fold(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

function searchTokens(query) {
  return fold(query)
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 8);
}

function indexText(text) {
  let compact = '';
  const starts = [];
  const ends = [];
  for (const word of fold(text).split(/[^a-z0-9]+/).filter(Boolean)) {
    starts.push(compact.length);
    compact += word;
    ends.push(compact.length);
  }
  return { compact, starts, ends };
}

function findToken(index, token) {
  let word = 0;
  for (let at = index.compact.indexOf(token); at !== -1; at = index.compact.indexOf(token, at + 1)) {
    while (word + 1 < index.starts.length && index.starts[word + 1] <= at) word += 1;
    if (index.starts[word] === at || at + token.length <= index.ends[word]) return at;
  }
  return -1;
}

const label = (car) => `${car.brand?.name || ''} ${car.name}`;

function matches(car, tokens) {
  const index = indexText(label(car));
  return tokens.every((token) => findToken(index, token) !== -1);
}

function score(car, tokens) {
  const name = indexText(car.name).compact;
  const index = indexText(label(car));
  let total = 0;
  for (const token of tokens) {
    if (name.startsWith(token)) total += 3;
    else if (index.starts.some((at) => index.compact.startsWith(token, at))) total += 2;
    else total += 1;
  }
  return total;
}

module.exports = { fold, searchTokens, indexText, findToken, matches, score };
