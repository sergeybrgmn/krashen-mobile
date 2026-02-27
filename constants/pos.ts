type PosLabels = Record<string, string>;

const POS_LABELS: Record<string, PosLabels> = {
  en: {
    ADJ: 'Adjective',
    ADP: 'Preposition',
    ADV: 'Adverb',
    AUX: 'Auxiliary verb',
    CCONJ: 'Conjunction',
    DET: 'Determiner',
    INTJ: 'Interjection',
    NOUN: 'Noun',
    NUM: 'Number',
    PART: 'Particle',
    PRON: 'Pronoun',
    PROPN: 'Proper noun',
    SCONJ: 'Conjunction',
    VERB: 'Verb',
  },
  es: {
    ADJ: 'Adjetivo',
    ADP: 'Preposición',
    ADV: 'Adverbio',
    AUX: 'Verbo auxiliar',
    CCONJ: 'Conjunción',
    DET: 'Determinante',
    INTJ: 'Interjección',
    NOUN: 'Sustantivo',
    NUM: 'Número',
    PART: 'Partícula',
    PRON: 'Pronombre',
    PROPN: 'Nombre propio',
    SCONJ: 'Conjunción',
    VERB: 'Verbo',
  },
};

// 4 color groups (muted tones that work on dark card background)
const POS_COLOR_MAP: Record<string, string> = {
  // Blue — nouns & noun-like
  NOUN: '#60a5fa',
  PROPN: '#60a5fa',
  PRON: '#60a5fa',
  DET: '#60a5fa',
  NUM: '#60a5fa',
  // Green — verbs & verb-like
  VERB: '#4ade80',
  AUX: '#4ade80',
  // Orange — modifiers
  ADJ: '#fbbf24',
  ADV: '#fbbf24',
  // Purple — function words & other
  ADP: '#c084fc',
  CCONJ: '#c084fc',
  SCONJ: '#c084fc',
  PART: '#c084fc',
  INTJ: '#c084fc',
};

// Falls back to English labels if language not found
export function getPosLabel(pos: string, language: string): string | null {
  const lang = language.slice(0, 2).toLowerCase(); // normalize "es-ES" → "es"
  const labels = POS_LABELS[lang] ?? POS_LABELS.en;
  return labels[pos] ?? null;
}

export function getPosColor(pos: string): string {
  return POS_COLOR_MAP[pos] ?? '#94a3b8'; // fallback to muted gray
}
