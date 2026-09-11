/**
 * Porter Stemmer implementation for English morphological normalization.
 */
export function stemWord(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.length < 3) return w;

  // Step 1a
  if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('ies')) w = w.slice(0, -2);
  else if (!w.endsWith('ss') && w.endsWith('s')) w = w.slice(0, -1);

  // Step 1b
  let extraStep = false;
  if (w.endsWith('eed')) {
    if (measure(w.slice(0, -3)) > 0) w = w.slice(0, -1);
  } else if ((w.endsWith('ed') && hasVowel(w.slice(0, -2))) || (w.endsWith('ing') && hasVowel(w.slice(0, -3)))) {
    w = w.endsWith('ed') ? w.slice(0, -2) : w.slice(0, -3);
    extraStep = true;
  }

  if (extraStep) {
    if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) w += 'e';
    else if (endsInDoubleConsonant(w) && !w.endsWith('l') && !w.endsWith('s') && !w.endsWith('z')) {
      w = w.slice(0, -1);
    } else if (measure(w) === 1 && endsInCvc(w)) {
      w += 'e';
    }
  }

  // Step 1c
  if (w.endsWith('y') && hasVowel(w.slice(0, -1))) {
    w = w.slice(0, -1) + 'i';
  }

  // Step 2
  const step2Suffixes: [string, string][] = [
    ['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'], ['anci', 'ance'],
    ['izer', 'ize'], ['abli', 'able'], ['alli', 'al'], ['entli', 'ent'],
    ['eli', 'e'], ['ousli', 'ous'], ['ization', 'ize'], ['ation', 'ate'],
    ['ator', 'ate'], ['alism', 'al'], ['iveness', 'ive'], ['fulness', 'ful'],
    ['ousness', 'ous'], ['aliti', 'al'], ['iviti', 'ive'], ['biliti', 'ble']
  ];

  for (const [suffix, replacement] of step2Suffixes) {
    if (w.endsWith(suffix)) {
      if (measure(w.slice(0, -suffix.length)) > 0) {
        w = w.slice(0, -suffix.length) + replacement;
      }
      break;
    }
  }

  // Step 3
  const step3Suffixes: [string, string][] = [
    ['icate', 'ic'], ['ative', ''], ['alize', 'al'],
    ['iciti', 'ic'], ['ical', 'ic'], ['ful', ''], ['ness', '']
  ];

  for (const [suffix, replacement] of step3Suffixes) {
    if (w.endsWith(suffix)) {
      if (measure(w.slice(0, -suffix.length)) > 0) {
        w = w.slice(0, -suffix.length) + replacement;
      }
      break;
    }
  }

  // Step 4
  const step4Suffixes = [
    'al', 'ance', 'ence', 'er', 'ic', 'able', 'ible', 'ant', 'ement',
    'ment', 'ent', 'ou', 'ism', 'ate', 'iti', 'ous', 'ive', 'ize'
  ];

  for (const suffix of step4Suffixes) {
    if (w.endsWith(suffix)) {
      if (measure(w.slice(0, -suffix.length)) > 1) {
        w = w.slice(0, -suffix.length);
      }
      break;
    }
  }

  // Step 5a & 5b
  if (w.endsWith('e')) {
    const stem = w.slice(0, -1);
    const m = measure(stem);
    if (m > 1 || (m === 1 && !endsInCvc(stem))) {
      w = stem;
    }
  }

  if (w.endsWith('ll') && measure(w.slice(0, -1)) > 1) {
    w = w.slice(0, -1);
  }

  return w;
}

function isConsonant(word: string, i: number): boolean {
  const letter = word[i];
  if ('aeiou'.includes(letter)) return false;
  if (letter === 'y') return i === 0 || !isConsonant(word, i - 1);
  return true;
}

function measure(word: string): number {
  let count = 0;
  let i = 0;
  const len = word.length;

  while (i < len && isConsonant(word, i)) i++;
  while (i < len) {
    while (i < len && !isConsonant(word, i)) i++;
    if (i < len) {
      count++;
      while (i < len && isConsonant(word, i)) i++;
    }
  }
  return count;
}

function hasVowel(word: string): boolean {
  for (let i = 0; i < word.length; i++) {
    if (!isConsonant(word, i)) return true;
  }
  return false;
}

function endsInDoubleConsonant(word: string): boolean {
  const len = word.length;
  if (len < 2) return false;
  return word[len - 1] === word[len - 2] && isConsonant(word, len - 1);
}

function endsInCvc(word: string): boolean {
  const len = word.length;
  if (len < 3) return false;
  const c1 = isConsonant(word, len - 3);
  const v = !isConsonant(word, len - 2);
  const c2 = isConsonant(word, len - 1);
  const last = word[len - 1];
  return c1 && v && c2 && last !== 'w' && last !== 'x' && last !== 'y';
}
