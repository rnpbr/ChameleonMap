export type SearchKind = 'menu' | 'tag' | 'linksGroup' | 'kml' | 'location';

export interface NameTranslationLike {
  readonly language_code: string;
  readonly name: string;
}

export interface SearchableLike {
  readonly id: number;
  readonly name: string;
  readonly translations?: NameTranslationLike[];
}

export interface SearchMenuLike extends SearchableLike {
  readonly group: number;
  readonly active: boolean;
}

export interface SearchTagLike extends SearchableLike {
  readonly parent_menu: number;
  readonly active: boolean;
  readonly description?: string;
  readonly related_locations: number[];
}

export interface SearchLayerLike extends SearchableLike {
  readonly parent_menu: number;
}

export interface SearchLocationLike extends SearchableLike {
  readonly active: boolean;
  readonly description?: string;
}

export interface SearchSource {
  readonly menuGroups: SearchableLike[];
  readonly menus: SearchMenuLike[];
  readonly tags: SearchTagLike[];
  readonly linksGroups: SearchLayerLike[];
  readonly kmlLayers: SearchLayerLike[];
  readonly locations: SearchLocationLike[];
}

export interface SearchHit {
  readonly kind: SearchKind;
  readonly id: number;
  readonly score: number;
}

export type SearchSelection =
  | { readonly type: 'none' }
  | { readonly type: 'menus'; readonly menuIds: number[] }
  | {
      readonly type: 'tags';
      readonly tagIds: number[];
      readonly linksGroupIds: number[];
      readonly kmlIds: number[];
    }
  | { readonly type: 'location'; readonly locationIds: number[] };

interface SearchDocument {
  readonly kind: SearchKind;
  readonly id: number;
  readonly names: string[];
}

interface Postings {
  readonly docs: number[];
  readonly weights: number[];
}

export interface SearchIndex {
  readonly documents: SearchDocument[];
  readonly postings: Map<string, Postings>;
  readonly vocabulary: string[];
  readonly termsByLength: Map<number, string[]>;
  readonly tagIdsByLocation: Map<number, number[]>;
}

interface QueryTerm {
  readonly term: string;
  readonly isPartial: boolean;
}

const NAME_WEIGHT = 3;
const CONTEXT_WEIGHT = 0.5;
const TAG_DESCRIPTION_WEIGHT = 1;
const LOCATION_DESCRIPTION_WEIGHT = 0.5;

const PREFIX_QUALITY = 0.8;
const FUZZY_QUALITY = [1, 0.6, 0.4];
const MAX_PREFIX_EXPANSIONS = 500;

const EXACT_NAME_BONUS = 3;
const NAME_PREFIX_BONUS = 1.5;
const KIND_PRIOR: Record<SearchKind, number> = {
  menu: 1,
  tag: 1,
  linksGroup: 1,
  kml: 1,
  location: 0.9
};
const KIND_ORDER: SearchKind[] = ['tag', 'linksGroup', 'kml', 'menu', 'location'];

const BEST_SELECTION_RATIO = 0.5;
const BEST_SELECTION_LIMIT = 25;

const ABOUT_LOCATION_NAMES = new Set(['sobre este mapa', 'about this map']);

const STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos', 'e', 'em',
  'no', 'na', 'nos', 'nas', 'ao', 'aos', 'para', 'pra', 'por', 'pelo', 'pela', 'pelos', 'pelas',
  'com', 'sem', 'se', 'que', 'qual', 'quais', 'onde', 'como', 'ou', 'sobre', 'entre', 'mostrar',
  'mostre', 'mostra', 'ver', 'exibir', 'quero', 'fica', 'ficam', 'esta', 'estao',
  'the', 'an', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'where', 'what', 'which',
  'is', 'are', 'show', 'me', 'all', 'from', 'by',
  'el', 'la', 'los', 'las', 'una', 'unos', 'unas', 'y', 'en', 'del', 'al', 'con', 'donde', 'cual',
  'cuales', 'muestra'
]);

const DIACRITICS = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC = new RegExp('[^\\p{L}\\p{N}]+', 'gu');
const LETTER_ENTITY = /&([a-z])(?:acute|grave|circ|tilde|uml|cedil|ring|slash);/gi;

export function buildSearchIndex(source: SearchSource): SearchIndex {
  const menusById = new Map(source.menus.map((menu) => [menu.id, menu]));
  const groupsById = new Map(source.menuGroups.map((group) => [group.id, group]));
  const isMenuActive = (menuId: number) => menusById.get(menuId)?.active === true;
  const builder = new SearchIndexBuilder();

  source.menus
    .filter((menu) => menu.active)
    .forEach((menu) =>
      builder.add('menu', menu, [[allNames(groupsById.get(menu.group)), CONTEXT_WEIGHT]])
    );

  const tags = source.tags.filter((tag) => tag.active && isMenuActive(tag.parent_menu));
  tags.forEach((tag) =>
    builder.add('tag', tag, [
      [allNames(menusById.get(tag.parent_menu)), CONTEXT_WEIGHT],
      [htmlToText(tag.description ?? ''), TAG_DESCRIPTION_WEIGHT]
    ])
  );

  source.linksGroups
    .filter((linksGroup) => isMenuActive(linksGroup.parent_menu))
    .forEach((linksGroup) =>
      builder.add('linksGroup', linksGroup, [
        [allNames(menusById.get(linksGroup.parent_menu)), CONTEXT_WEIGHT]
      ])
    );

  source.kmlLayers
    .filter((kml) => isMenuActive(kml.parent_menu))
    .forEach((kml) =>
      builder.add('kml', kml, [[allNames(menusById.get(kml.parent_menu)), CONTEXT_WEIGHT]])
    );

  const tagIdsByLocation = new Map<number, number[]>();
  const tagNamesById = new Map(tags.map((tag) => [tag.id, tag.name]));
  tags.forEach((tag) =>
    tag.related_locations.forEach((locationId) => {
      const tagIds = tagIdsByLocation.get(locationId);
      if (tagIds) {
        if (!tagIds.includes(tag.id)) tagIds.push(tag.id);
      } else {
        tagIdsByLocation.set(locationId, [tag.id]);
      }
    })
  );

  source.locations.forEach((location) => {
    const tagIds = tagIdsByLocation.get(location.id);
    if (!location.active || !tagIds) return;
    if (ABOUT_LOCATION_NAMES.has(normalizeText(location.name))) return;

    builder.add('location', location, [
      [tagIds.map((tagId) => tagNamesById.get(tagId)).join(' '), CONTEXT_WEIGHT],
      [htmlToText(location.description ?? ''), LOCATION_DESCRIPTION_WEIGHT]
    ]);
  });

  return builder.build(tagIdsByLocation);
}

export function searchIndex(index: SearchIndex, query: string, limit = 20): SearchHit[] {
  const terms = parseQuery(query);
  if (terms.length === 0) return [];

  const scoresByDoc = new Map<number, number[]>();
  terms.forEach(({ term, isPartial }, termIndex) => {
    scoreTerm(index, term, isPartial).forEach((score, doc) => {
      let perTerm = scoresByDoc.get(doc);
      if (!perTerm) {
        perTerm = new Array<number>(terms.length).fill(0);
        scoresByDoc.set(doc, perTerm);
      }
      perTerm[termIndex] = score;
    });
  });

  const normalizedQuery = normalizeText(query);
  const hits: SearchHit[] = [];
  scoresByDoc.forEach((perTerm, docIndex) => {
    const document = index.documents[docIndex];
    const coverage = perTerm.filter((score) => score > 0).length / terms.length;
    const total = perTerm.reduce((sum, score) => sum + score, 0);
    hits.push({
      kind: document.kind,
      id: document.id,
      score:
        total *
        coverage *
        coverage *
        nameBonus(document, normalizedQuery) *
        KIND_PRIOR[document.kind]
    });
  });

  return hits.sort(compareHits).slice(0, limit);
}

export function pickBestSelection(hits: SearchHit[]): SearchSelection {
  if (hits.length === 0) return { type: 'none' };

  const best = hits[0];
  const group = selectionGroup(best.kind);
  const picked = hits
    .filter((hit) => selectionGroup(hit.kind) === group && hit.score > best.score * BEST_SELECTION_RATIO)
    .slice(0, BEST_SELECTION_LIMIT);
  const idsOf = (kind: SearchKind) => picked.filter((hit) => hit.kind === kind).map((hit) => hit.id);

  switch (group) {
    case 'menus':
      return { type: 'menus', menuIds: idsOf('menu') };
    case 'locations':
      return { type: 'location', locationIds: idsOf('location') };
    default:
      return {
        type: 'tags',
        tagIds: idsOf('tag'),
        linksGroupIds: idsOf('linksGroup'),
        kmlIds: idsOf('kml')
      };
  }
}

export function selectionForHit(hit: Pick<SearchHit, 'kind' | 'id'>): SearchSelection {
  switch (hit.kind) {
    case 'menu':
      return { type: 'menus', menuIds: [hit.id] };
    case 'location':
      return { type: 'location', locationIds: [hit.id] };
    default:
      return {
        type: 'tags',
        tagIds: hit.kind === 'tag' ? [hit.id] : [],
        linksGroupIds: hit.kind === 'linksGroup' ? [hit.id] : [],
        kmlIds: hit.kind === 'kml' ? [hit.id] : []
      };
  }
}

class SearchIndexBuilder {
  private readonly documents: SearchDocument[] = [];
  private readonly postings = new Map<string, Postings>();
  private readonly wordTerms = new Set<string>();

  add(kind: SearchKind, entity: SearchableLike, fields: Array<[string, number]>) {
    const doc = this.documents.length;
    const names = [...new Set(allNameList(entity).map(normalizeText).filter(Boolean))];
    const weights = new Map<string, number>();
    const keepHeaviest = (term: string, weight: number) => {
      if (weight > (weights.get(term) ?? 0)) weights.set(term, weight);
    };

    names.forEach((name) => {
      textTerms(name).forEach((term) => {
        keepHeaviest(term, NAME_WEIGHT);
        this.wordTerms.add(term);
      });
      const tokens = name.split(' ');
      for (let i = 0; i < tokens.length - 1; i++) {
        keepHeaviest(stemToken(tokens[i] + tokens[i + 1]), NAME_WEIGHT);
      }
    });
    fields.forEach(([text, weight]) =>
      textTerms(text).forEach((term) => {
        keepHeaviest(term, weight);
        this.wordTerms.add(term);
      })
    );

    weights.forEach((weight, term) => {
      const postings = this.postings.get(term);
      if (postings) {
        postings.docs.push(doc);
        postings.weights.push(weight);
      } else {
        this.postings.set(term, { docs: [doc], weights: [weight] });
      }
    });
    this.documents.push({ kind, id: entity.id, names });
  }

  build(tagIdsByLocation: Map<number, number[]>): SearchIndex {
    const vocabulary = [...this.wordTerms].sort();
    const termsByLength = new Map<number, string[]>();
    vocabulary.forEach((term) => {
      const terms = termsByLength.get(term.length);
      if (terms) terms.push(term);
      else termsByLength.set(term.length, [term]);
    });

    return {
      documents: this.documents,
      postings: this.postings,
      vocabulary,
      termsByLength,
      tagIdsByLocation
    };
  }
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, ' ')
    .trim();
}

function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(LETTER_ENTITY, '$1')
    .replace(/&#(\d+);/g, (_, code) => codePointToText(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => codePointToText(parseInt(hex, 16)))
    .replace(/&[a-z]+;/gi, ' ');
}

function codePointToText(codePoint: number): string {
  return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : ' ';
}

function stemToken(token: string): string {
  if (token.length <= 3 || /\d/.test(token)) return token;
  if (/[oa]es$/.test(token)) return token.slice(0, -3) + 'ao';
  if (token.endsWith('ais')) return token.slice(0, -2) + 'l';
  if (token.endsWith('eis')) return token.slice(0, -3) + 'el';
  if (token.endsWith('ns')) return token.slice(0, -2) + 'm';
  if (/[rz]es$/.test(token)) return token.slice(0, -2);
  if (token.endsWith('s') && !/(ss|us|is)$/.test(token)) return token.slice(0, -1);
  return token;
}

function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized ? normalized.split(' ') : [];
}

function allNameList(entity: SearchableLike | undefined): string[] {
  if (!entity) return [];
  return [entity.name ?? '', ...(entity.translations ?? []).map((translation) => translation.name)];
}

function allNames(entity: SearchableLike | undefined): string {
  return allNameList(entity).join(' ');
}

function textTerms(text: string): string[] {
  return tokenize(text)
    .filter((token) => !STOPWORDS.has(token))
    .map(stemToken);
}

function parseQuery(query: string): QueryTerm[] {
  const tokens = tokenize(query);
  const lastWordIsPartial = !/\s$/.test(query);
  return tokens
    .map((token, i) => ({ token, isPartial: lastWordIsPartial && i === tokens.length - 1 }))
    .filter(({ token }) => !STOPWORDS.has(token))
    .map(({ token, isPartial }) => ({ term: stemToken(token), isPartial }));
}

function scoreTerm(index: SearchIndex, term: string, isPartial: boolean): Map<number, number> {
  const scores = new Map<number, number>();
  const exactPostings = index.postings.get(term);
  const hasExactMatch = exactPostings !== undefined;
  if (exactPostings) addPostings(index, scores, term, 1);

  if (isPartial ? term.length >= 2 : !hasExactMatch && term.length >= 3) {
    const maxIdf = exactPostings ? inverseDocumentFrequency(index, exactPostings) : Infinity;
    forEachTermWithPrefix(index.vocabulary, term, (candidate) => {
      if (candidate !== term) addPostings(index, scores, candidate, PREFIX_QUALITY, maxIdf);
    });
  }

  if (!hasExactMatch && term.length >= 4) {
    const maxDistance = term.length >= 8 ? 2 : 1;
    for (let length = term.length - maxDistance; length <= term.length + maxDistance; length++) {
      index.termsByLength.get(length)?.forEach((candidate) => {
        const distance = boundedEditDistance(term, candidate, maxDistance);
        if (distance > 0 && distance <= maxDistance) {
          addPostings(index, scores, candidate, FUZZY_QUALITY[distance]);
        }
      });
    }
  }

  return scores;
}

function addPostings(
  index: SearchIndex,
  scores: Map<number, number>,
  term: string,
  quality: number,
  maxIdf = Infinity
) {
  const postings = index.postings.get(term);
  if (!postings) return;

  const idf = Math.min(inverseDocumentFrequency(index, postings), maxIdf);
  postings.docs.forEach((doc, i) => {
    const score = postings.weights[i] * quality * idf;
    if (score > (scores.get(doc) ?? 0)) scores.set(doc, score);
  });
}

function inverseDocumentFrequency(index: SearchIndex, postings: Postings): number {
  const frequency = postings.docs.length;
  return Math.log(1 + (index.documents.length - frequency + 0.5) / (frequency + 0.5));
}

function forEachTermWithPrefix(
  vocabulary: string[],
  prefix: string,
  callback: (term: string) => void
) {
  let low = 0;
  let high = vocabulary.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (vocabulary[middle] < prefix) low = middle + 1;
    else high = middle;
  }

  for (
    let i = low, expanded = 0;
    i < vocabulary.length && expanded < MAX_PREFIX_EXPANSIONS && vocabulary[i].startsWith(prefix);
    i++, expanded++
  ) {
    callback(vocabulary[i]);
  }
}

function boundedEditDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let beforePrevious = new Array<number>(b.length + 1).fill(0);
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  let current = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    let rowMinimum = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let distance = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        distance = Math.min(distance, beforePrevious[j - 2] + 1);
      }
      current[j] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }
    if (rowMinimum > max) return max + 1;
    [beforePrevious, previous, current] = [previous, current, beforePrevious];
  }

  return Math.min(previous[b.length], max + 1);
}

function nameBonus(document: SearchDocument, normalizedQuery: string): number {
  if (normalizedQuery.length < 2) return 1;
  const compactQuery = normalizedQuery.replace(/ /g, '');
  if (document.names.some((name) => name === normalizedQuery || name.replace(/ /g, '') === compactQuery)) {
    return EXACT_NAME_BONUS;
  }
  if (document.names.some((name) => name.startsWith(normalizedQuery + ' '))) return NAME_PREFIX_BONUS;
  return 1;
}

function compareHits(a: SearchHit, b: SearchHit): number {
  return (
    b.score - a.score ||
    KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
    a.id - b.id
  );
}

function selectionGroup(kind: SearchKind): 'menus' | 'layers' | 'locations' {
  if (kind === 'menu') return 'menus';
  if (kind === 'location') return 'locations';
  return 'layers';
}
