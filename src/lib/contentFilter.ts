/**
 * Filtro de conteúdo impróprio da NEXORIA.
 *
 * Cada palavra ou expressão proibida é trocada por uma máscara fixa:
 * - palavrões → "######"
 * - violência extrema → "########"
 * - conteúdo sexual → "#######"
 *
 * Vale para mensagens do chat, nomes e descrições de itens, nomes de jogos e
 * nomes de usuário (que são recusados no cadastro).
 */

export type FilterCategory = 'profanity' | 'violence' | 'sexual';

export const FILTER_MASKS: Record<FilterCategory, string> = {
  profanity: '######',
  violence: '########',
  sexual: '#######',
};

type WordList = {
  /** Palavras e expressões que precisam bater exatamente (depois de normalizadas). */
  words: string[];
  /** Pedaços tão específicos que qualquer palavra que os contenha é bloqueada. */
  fragments: string[];
};

const LISTS: Record<FilterCategory, WordList> = {
  profanity: {
    words: [
      // português
      'porra', 'porras', 'caralho', 'caralhos', 'krl', 'crl', 'carai', 'caraio', 'merda', 'merdas', 'mrd', 'bosta', 'bostas',
      'puta', 'putas', 'puto', 'putos', 'pqp', 'fdp', 'vsf', 'vtnc', 'tnc', 'foda', 'fodas', 'fodase', 'foder', 'fodido',
      'fodida', 'fodidos', 'fudido', 'fudida', 'fuder', 'cu', 'cus', 'cuzao', 'cuzão', 'cuzinho', 'arrombado', 'arrombada',
      'arrombados', 'cacete', 'cacetada', 'babaca', 'babacas', 'otario', 'otaria', 'otarios', 'viado', 'viados',
      'corno', 'cornos', 'corna', 'escroto', 'escrota', 'vagabundo', 'vagabunda', 'desgracado',
      'desgracada', 'retardado', 'retardada', 'imbecil', 'imbecis', 'filho da puta', 'vai tomar no cu', 'vai se foder',
      'vai se fuder',
      // inglês
      'shit', 'shits', 'shitty', 'bullshit', 'bitch', 'bitches', 'asshole', 'assholes', 'bastard', 'bastards', 'cunt',
      'cunts', 'wtf', 'stfu', 'damn', 'dumbass', 'jackass', 'retard', 'retards', 'fag', 'fags', 'faggot', 'piss off',
    ],
    fragments: ['fuck', 'caralh', 'porra', 'merda', 'fodase', 'motherf', 'filhodaput', 'bitch'],
  },
  violence: {
    words: [
      // português
      'decapitar', 'decapitado', 'decapitada', 'decapitou', 'decapito', 'degolar', 'degolado', 'degolada', 'degolou',
      'esquartejar', 'esquartejado', 'esquartejada', 'esquartejou', 'estripar', 'estripado', 'estripada', 'mutilar',
      'mutilado', 'mutilada', 'mutilacao', 'mutilação', 'torturar', 'torturado', 'torturada', 'chacina', 'chacinas',
      'genocidio', 'genocídio', 'estupro', 'estupros',
      'estuprar', 'estuprador', 'estuprada', 'estuprado', 'banho de sangue', 'cortar a garganta', 'cortar sua garganta',
      'arrancar a cabeca', 'arrancar sua cabeca', 'arrancar a cabeça', 'arrancar sua cabeça', 'tiro na cabeca',
      'tiro na cabeça', 'vai se matar', 'matar todos', 'matar todo mundo', 'explodir a escola',
      'ataque na escola',
      // inglês
      'decapitate', 'decapitated', 'behead', 'beheaded', 'beheading', 'dismember', 'dismembered', 'disembowel',
      'disemboweled', 'mutilate', 'mutilated', 'tortured', 'genocide', 'rape', 'raped', 'rapist',
      'gore', 'bloodbath', 'kys', 'kill yourself', 'kill urself', 'slit your throat', 'slit throat', 'school shooting',
      'shoot up the school',
    ],
    fragments: ['decapit', 'esquartej', 'estupr', 'degola', 'dismember', 'disembowel', 'behead'],
  },
  sexual: {
    words: [
      // português
      'sexo', 'sexual', 'sexuais', 'transar', 'transei', 'transou', 'putaria', 'putarias', 'buceta', 'bucetas', 'xoxota',
      'xereca', 'xota', 'boquete', 'boquetes', 'punheta', 'punhetas', 'siririca', 'gozar', 'gozei', 'gozou', 'gozada',
      'porno', 'pornô', 'pornografia', 'nude', 'nudes', 'tesao', 'tesão',
      'tesuda', 'tesudo', 'orgasmo', 'orgasmos', 'masturbar', 'masturbacao', 'masturbação', 'penis', 'pênis', 'vagina',
      'vaginas', 'pau duro', 'peitos de fora', 'manda nude',
      'manda nudes',
      // inglês
      'sex', 'sexy', 'porn', 'porno', 'naked', 'boobs', 'boob', 'tits', 'titties', 'pussy', 'pussies', 'cock', 'cocks',
      'dick', 'dicks', 'blowjob', 'handjob', 'horny', 'cum', 'orgasm', 'masturbate', 'hentai', 'nsfw', 'xxx', 'onlyfans',
      'slut', 'sluts', 'whore', 'whores', 'milf', 'send nudes',
    ],
    fragments: ['porn', 'buceta', 'xoxota', 'punhet', 'boquet', 'masturb', 'blowjob', 'onlyfans', 'hentai'],
  },
};

// Ordem de prioridade quando a mesma palavra cai em mais de uma lista.
const CATEGORY_ORDER: FilterCategory[] = ['violence', 'sexual', 'profanity'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

/** Minúsculas, sem acentos e com números/símbolos trocados por letras ("p0rr4" → "porra"). */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[013457@$!]/g, (char) => LEET[char] ?? char);
}

/** Formas de uma palavra com letras esticadas ("porraaaa", "puuuta"). */
function wordForms(normalized: string): string[] {
  const one = normalized.replace(/(.)\1{2,}/g, '$1');
  const two = normalized.replace(/(.)\1{2,}/g, '$1$1');
  const all = normalized.replace(/(.)\1+/g, '$1');
  return [...new Set([normalized, one, two, all])];
}

type Matcher = {
  single: Map<string, FilterCategory>;
  phrases: { tokens: string[]; category: FilterCategory }[];
  fragments: { fragment: string; category: FilterCategory }[];
};

function buildMatcher(): Matcher {
  const single = new Map<string, FilterCategory>();
  const phrases: Matcher['phrases'] = [];
  const fragments: Matcher['fragments'] = [];
  for (const category of [...CATEGORY_ORDER].reverse()) {
    for (const entry of LISTS[category].words) {
      const tokens = entry.split(/\s+/).map(normalizeWord);
      const [first] = tokens;
      if (tokens.length === 1 && first) {
        single.set(first, category);
      } else {
        phrases.push({ tokens, category });
      }
    }
    for (const fragment of LISTS[category].fragments) fragments.push({ fragment: normalizeWord(fragment), category });
  }
  // Expressões maiores primeiro, para "vai tomar no cu" virar uma máscara só.
  phrases.sort((a, b) => b.tokens.length - a.tokens.length);
  return { single, phrases, fragments };
}

const MATCHER = buildMatcher();

function squash(word: string): string {
  return word.replace(/(.)\1+/g, '$1');
}

function tokenMatches(token: string, expected: string): boolean {
  return wordForms(token).includes(expected) || (expected.length > 3 && squash(token) === squash(expected));
}

/** Categoria de uma palavra sozinha, ou null se ela for permitida. */
export function categorizeWord(word: string): FilterCategory | null {
  const normalized = normalizeWord(word);
  if (!normalized) return null;
  const forms = wordForms(normalized);
  for (const category of CATEGORY_ORDER) {
    for (const form of forms) {
      if (MATCHER.single.get(form) === category) return category;
    }
  }
  // Forma com todas as letras repetidas juntadas só vale para palavras maiores,
  // para não confundir palavras curtas normais.
  const squashed = squash(normalized);
  if (squashed.length > 3) {
    for (const [entry, category] of MATCHER.single) {
      if (entry.length > 3 && squash(entry) === squashed) return category;
    }
  }
  for (const category of CATEGORY_ORDER) {
    for (const { fragment, category: fragmentCategory } of MATCHER.fragments) {
      if (fragmentCategory === category && forms.some((form) => form.includes(fragment))) return category;
    }
  }
  return null;
}

type Token = { start: number; end: number; text: string; normalized: string };

// Letras, números e os símbolos que costumam substituir letras.
const TOKEN_PATTERN = /[\p{L}\p{N}@$]+/gu;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const start = match.index ?? 0;
    tokens.push({ start, end: start + match[0].length, text: match[0], normalized: normalizeWord(match[0]) });
  }
  return tokens;
}

export type FilterResult = {
  /** Texto com as partes proibidas trocadas pelas máscaras. */
  text: string;
  /** Tipos de conteúdo encontrados (vazio quando o texto está limpo). */
  categories: FilterCategory[];
};

type Hit = { start: number; end: number; category: FilterCategory };

function findHits(text: string): Hit[] {
  const tokens = tokenize(text);
  const at = (position: number): Token => tokens[position] as Token;
  const hits: Hit[] = [];
  let index = 0;
  while (index < tokens.length) {
    // 1) Expressões com várias palavras.
    const phrase = MATCHER.phrases.find(
      ({ tokens: expected }) =>
        index + expected.length <= tokens.length &&
        expected.every((word, offset) => tokenMatches(at(index + offset).normalized, word)),
    );
    if (phrase) {
      hits.push({ start: at(index).start, end: at(index + phrase.tokens.length - 1).end, category: phrase.category });
      index += phrase.tokens.length;
      continue;
    }

    // 2) Letras separadas ("p u t a", "p.u.t.a").
    if (at(index).text.length === 1) {
      let last = index;
      while (
        last + 1 < tokens.length &&
        at(last + 1).text.length === 1 &&
        at(last + 1).start - at(last).end <= 2
      ) {
        last += 1;
      }
      if (last - index >= 2) {
        const joined = tokens.slice(index, last + 1).map((token) => token.text).join('');
        const category = categorizeWord(joined);
        if (category) {
          hits.push({ start: at(index).start, end: at(last).end, category });
          index = last + 1;
          continue;
        }
      }
    }

    // 3) Palavra sozinha.
    const category = categorizeWord(at(index).text);
    if (category) hits.push({ start: at(index).start, end: at(index).end, category });
    index += 1;
  }
  return hits;
}

/** Troca palavrões, violência extrema e conteúdo sexual pelas máscaras. */
export function filterText(text: string): FilterResult {
  const hits = findHits(text);
  if (hits.length === 0) return { text, categories: [] };
  let result = '';
  let cursor = 0;
  for (const hit of hits) {
    result += text.slice(cursor, hit.start) + FILTER_MASKS[hit.category];
    cursor = hit.end;
  }
  result += text.slice(cursor);
  const found = new Set(hits.map((hit) => hit.category));
  return { text: result, categories: CATEGORY_ORDER.filter((category) => found.has(category)) };
}

/** Atalho para mostrar um texto já filtrado. */
export function cleanText(text: string): string {
  return filterText(text).text;
}

/** Nomes de usuário não podem ter nada proibido, nem grudado (ex.: "xx_p0rra_xx", "caralhoboy"). */
export function isUsernameBlocked(username: string): boolean {
  if (filterText(username.replace(/_/g, ' ')).categories.length > 0) return true;
  return categorizeWord(username.replace(/_/g, '')) !== null;
}
