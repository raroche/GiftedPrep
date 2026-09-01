#!/usr/bin/env python3
"""Join capital cities onto the country list the shape game already uses.

Capitals and their Spanish names come from Wikidata, which is the only source
that carries both in one place -- the country dataset behind the shape game
translates country names but not city names, and hand-writing 200 Spanish
capitals is 200 chances to be wrong.

Territories are left out on purpose. The flag and shape games include them,
because a flag or an outline is recognisable on its own, but "the capital of
Wallis and Futuna" is not knowledge worth drilling into a child. What is left is
sovereign states.
"""
import json, unicodedata, re, sys

RAW = ('/private/tmp/claude-501/-Users-rolandaroche-Documents-repos-GiftedPrep/'
       '168b8464-f75f-463b-abec-6f789844f5c6/scratchpad/caps-raw.json')

# Sovereign states Wikidata's query missed, filled by hand.
EXTRA = {
    'dk': (['Copenhagen'], ['Copenhague']),
    'ag': (["Saint John's"], ["Saint John's", 'Saint John']),
    'va': (['Vatican City'], ['Ciudad del Vaticano']),
}

# Where the official label is not what a person would type.
ALIAS = {
    'us': ['Washington DC', 'Washington', 'Washington D.C.'],
    'mx': ['Mexico City', 'Ciudad de Mexico', 'CDMX', 'Mexico D.F.'],
    'gb': ['London', 'Londres'],
    'kr': ['Seoul', 'Seul'],
    'kp': ['Pyongyang'],
    'cn': ['Beijing', 'Peking', 'Pekin'],
    'in': ['New Delhi', 'Nueva Delhi', 'Delhi'],
    'ru': ['Moscow', 'Moscu'],
    'ua': ['Kyiv', 'Kiev'],
    'cz': ['Prague', 'Praga', 'Praha'],
    'eg': ['Cairo', 'El Cairo'],
    'ma': ['Rabat'],
    'za': ['Pretoria', 'Cape Town', 'Bloemfontein'],
    'nl': ['Amsterdam', 'The Hague', 'La Haya'],
    'bo': ['Sucre', 'La Paz'],
    'ci': ['Yamoussoukro', 'Abidjan'],
    'mm': ['Naypyidaw', 'Nay Pyi Taw', 'Rangoon', 'Yangon'],
    'tz': ['Dodoma', 'Dar es Salaam'],
    'il': ['Jerusalem', 'Jerusalen'],
    'ch': ['Bern', 'Berne', 'Berna'],
    'tr': ['Ankara'],
    'ar': ['Buenos Aires'],
    'br': ['Brasilia', 'Brasília'],
}

def norm(s):
    s = unicodedata.normalize('NFKD', str(s))
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"['’]", '', s)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def main():
    wd = json.load(open(RAW))['results']['bindings']
    shapes = json.load(open('data/fun/shapes.json'))

    caps = {}
    for r in wd:
        iso = r['iso']['value'].lower()
        e = caps.setdefault(iso, {'en': [], 'es': []})
        for k, lang in (('enLabel', 'en'), ('esLabel', 'es')):
            v = r[k]['value']
            if v not in e[lang]:
                e[lang].append(v)
    for iso, (en, es) in EXTRA.items():
        caps.setdefault(iso, {'en': [], 'es': []})
        caps[iso]['en'] = en + caps[iso]['en']
        caps[iso]['es'] = es + caps[iso]['es']

    out, skipped = [], []
    for c in shapes['countries']:
        iso = c['code']
        if iso not in caps:
            skipped.append(c['name'])
            continue
        e = caps[iso]
        display = e['en'][0]
        names, seen = [], set()
        for n in e['en'] + e['es'] + ALIAS.get(iso, []):
            k = norm(n)
            if k and k not in seen:
                seen.add(k)
                names.append(n)
        out.append({
            'code': iso,
            'country': c['name'],
            'countryNames': c.get('names', [c['name']]),
            'continent': c['continent'],
            'capital': display,
            'names': names,
        })

    out.sort(key=lambda x: x['country'])
    data = {
        'note': ('Capital cities for the sovereign states in the shape game. '
                 'Territories are excluded on purpose: a flag or an outline is '
                 'recognisable on its own, but the capital of a dependency is not '
                 'knowledge worth drilling. Every capital carries its English and '
                 'Spanish spellings and the names people actually type.'),
        'attribution': {
            'capitals': ('Capital names in English and Spanish from Wikidata '
                         '(https://query.wikidata.org), CC0. Retrieved for this project.'),
            'countries': shapes['attribution'].get('countries', ''),
        },
        'continents': shapes['continents'],
        'countries': out,
    }
    json.dump(data, open('data/fun/capitals.json', 'w'), ensure_ascii=False, indent=1)
    open('data/fun/capitals.json', 'a').write('\n')

    total_names = sum(len(c['names']) for c in out)
    print(f'{len(out)} countries, {total_names} accepted spellings '
          f'({total_names/len(out):.1f} each)')
    print(f'{len(skipped)} left out as territories')

if __name__ == '__main__':
    main()
