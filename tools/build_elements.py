#!/usr/bin/env python3
"""Build the periodic table data for the Name the Element game.

Three decisions came out of reading how this is actually taught to children.

Not all 118 at once. The standard elementary starting point is the first twenty,
and what makes an element stick is meeting it somewhere real -- a pencil, a
balloon, a battery -- not its place in a list. So the game has three sets: the
elements a child actually meets, the first twenty, and the whole table for
anyone who wants it.

Everyday uses are the centre of the game, not a footnote. An illustrated table
of what each element is FOR is the single most recommended way to make this
relatable, so the uses are hand-written for the everyday set and each one gets a
drawn icon.

And the layout is computed, not typed. Every element's row and column on the
table follow from its atomic number by the same rules the table itself is built
from, so a mistyped cell is impossible: the script asserts all 118 land in
distinct cells.

Element names in English and Spanish come from Wikidata. The Spanish names are
the reason this game is worth building for a bilingual child -- Iron/Hierro,
Silver/Plata, Lead/Plomo, Tin/Estano, Sulfur/Azufre share no letters at all.
"""

import json, os, sys, unicodedata

RAW = ('/private/tmp/claude-501/-Users-rolandaroche-Documents-repos-GiftedPrep/'
       '168b8464-f75f-463b-abec-6f789844f5c6/scratchpad/elements-raw.json')

GASES = {1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86}
LIQUIDS = {35, 80}

# ---------------------------------------------------------------- layout

def cell(z):
    """Row and column on the standard 18-wide table.

    The f-block is pulled out underneath, as every printed table does, so the
    lanthanides and actinides get rows 9 and 10 rather than being crammed in.
    """
    if z == 1:   return 1, 1
    if z == 2:   return 1, 18
    if 3 <= z <= 4:    return 2, z - 2
    if 5 <= z <= 10:   return 2, z + 8
    if 11 <= z <= 12:  return 3, z - 10
    if 13 <= z <= 18:  return 3, z
    if 19 <= z <= 36:  return 4, z - 18
    if 37 <= z <= 54:  return 5, z - 36
    if 55 <= z <= 56:  return 6, z - 54
    if 57 <= z <= 71:  return 9, z - 54          # lanthanides, own row
    if 72 <= z <= 86:  return 6, z - 68
    if 87 <= z <= 88:  return 7, z - 86
    if 89 <= z <= 103: return 10, z - 86         # actinides, own row
    if 104 <= z <= 118: return 7, z - 100
    raise ValueError(z)

def family(z, row, col):
    if z in (57 <= z <= 71 and range(57, 72) or []): return 'lanthanide'
    if 57 <= z <= 71:  return 'lanthanide'
    if 89 <= z <= 103: return 'actinide'
    if col == 18: return 'noble gas'
    if col == 17: return 'halogen'
    if col == 1 and z != 1: return 'alkali metal'
    if col == 2: return 'alkaline earth metal'
    if z in (1, 6, 7, 8, 15, 16, 34): return 'nonmetal'
    if z in (5, 14, 32, 33, 51, 52, 85): return 'metalloid'
    if 3 <= col <= 12: return 'transition metal'
    return 'metal'

# ------------------------------------------------- the ones a child meets

# (symbol, what it is for, icon key, a second fact worth knowing)
EVERYDAY = [
    ('H',  'The Sun is mostly made of it, and it is half of water.', 'sun'),
    ('He', 'The gas that makes party balloons float.',               'balloon'),
    ('Li', 'Inside the battery in a phone or a laptop.',             'battery'),
    ('C',  'The grey part of a pencil. Diamonds are the same stuff.', 'pencil'),
    ('N',  'Most of the air around you is this, not oxygen.',        'cloud'),
    ('O',  'The part of the air your body actually uses.',           'bubble'),
    ('F',  'Put into toothpaste to keep teeth from rotting.',        'toothbrush'),
    ('Ne', 'Makes the orange glow in a glowing sign.',               'sign'),
    ('Na', 'Half of table salt. The other half is chlorine.',        'salt'),
    ('Mg', 'Burns with a blinding white light in fireworks.',        'spark'),
    ('Al', 'Drink cans and kitchen foil.',                           'can'),
    ('Si', 'Sand, glass, and the chip inside every computer.',       'chip'),
    ('P',  'The head of a match.',                                   'match'),
    ('S',  'Smells like rotten eggs. Found around volcanoes.',       'volcano'),
    ('Cl', 'Keeps swimming pools clean.',                            'drop'),
    ('K',  'Bananas are full of it.',                                'banana'),
    ('Ca', 'What your bones and teeth are built from.',              'bone'),
    ('Ti', 'Aeroplanes and replacement hips. Strong and light.',     'plane'),
    ('Fe', 'Nails, bridges, and the red in your blood.',             'magnet'),
    ('Cu', 'The wires in your walls, and old pennies.',              'wire'),
    ('Zn', 'The white stuff in sunscreen.',                          'sunblock'),
    ('Ag', 'Jewellery and the back of a mirror.',                    'mirror'),
    ('Sn', 'Tin cans, and the solder that joins wires.',             'can'),
    ('I',  'Painted on cuts to kill germs. Also added to salt.',     'bottle'),
    ('W',  'The glowing wire inside an old light bulb.',             'bulb'),
    ('Au', 'Jewellery and treasure. It never rusts, ever.',          'ring'),
    ('Hg', 'The only metal that is liquid. Old thermometers.',       'thermometer'),
    ('Pb', 'Very heavy. Old pipes and fishing weights.',             'weight'),
    ('U',  'Powers nuclear power stations.',                         'atom'),
]

def main():
    rows = json.load(open(RAW))['results']['bindings']
    seen = {}
    for r in rows:
        z = int(r['num']['value'])
        if not 1 <= z <= 118 or z in seen:
            continue
        seen[z] = {
            'z': z,
            'symbol': r['symbol']['value'],
            'name': r['enLabel']['value'].strip().capitalize(),
            'es': r['esLabel']['value'].strip().capitalize(),
        }
    missing = [z for z in range(1, 119) if z not in seen]
    if missing:
        sys.exit(f'missing atomic numbers: {missing}')

    uses = {sym: (txt, art) for sym, txt, art in EVERYDAY}

    out = []
    taken = {}
    for z in range(1, 119):
        e = seen[z]
        row, col = cell(z)
        if (row, col) in taken:
            sys.exit(f'{e["symbol"]} and {taken[(row, col)]} both land on r{row} c{col}')
        taken[(row, col)] = e['symbol']
        e['row'], e['col'] = row, col
        e['family'] = family(z, row, col)
        e['phase'] = 'gas' if z in GASES else 'liquid' if z in LIQUIDS else 'solid'
        if e['symbol'] in uses:
            e['use'], e['art'] = uses[e['symbol']]
        out.append(e)

    unmatched = sorted(set(uses) - {e['symbol'] for e in out if 'use' in e})
    if unmatched:
        sys.exit(f'everyday list names symbols that do not exist: {unmatched}')

    data = {
        'note': ('The periodic table, for a game rather than a reference. Sets: '
                 '"everyday" is what a child actually meets, "first20" is the '
                 'usual elementary starting point, "all" is the whole table. '
                 'Row and column are computed from the atomic number, so every '
                 'element lands in its own cell by construction.'),
        'attribution': {
            'names': ('Element names in English and Spanish from Wikidata '
                      '(https://query.wikidata.org), CC0.'),
            'uses': 'Everyday uses written for this project.',
        },
        'families': sorted({e['family'] for e in out}),
        'elements': out,
    }
    os.makedirs('data/fun', exist_ok=True)
    json.dump(data, open('data/fun/elements.json', 'w'), ensure_ascii=False, indent=1)
    open('data/fun/elements.json', 'a').write('\n')

    n_use = sum(1 for e in out if 'use' in e)
    diff = sum(1 for e in out
               if unicodedata.normalize('NFKD', e['es']).encode('ascii', 'ignore').decode().lower()
               != e['name'].lower())
    print(f'{len(out)} elements, all in distinct cells')
    print(f'{n_use} with an everyday use and an icon')
    print(f'{diff} have a Spanish name that differs from the English one')

if __name__ == '__main__':
    main()
