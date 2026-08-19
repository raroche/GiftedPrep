#!/usr/bin/env python3
"""Convert British spellings and terms to US English.

The audience is Florida families, so "colour" and "pence" are wrong in the
child-facing text. This runs over prose only:

  * In JSON question files it walks the object and rewrites only the values of
    known prose keys. It never touches "c" (colour tokens like grey), "s"
    (shape names), "f" (fill names) or any structural field.
  * In code and docs it applies the same map with word boundaries, but leaves
    `grey` alone because that word is a palette token, and skips
    `aria-labelledby`.

Idempotent. Run it again after adding questions.
"""
import json, glob, re, sys

SPELLING = {
    "colour": "color", "colours": "colors", "coloured": "colored",
    "colouring": "coloring", "colourful": "colorful", "colourless": "colorless",
    "favourite": "favorite", "favourites": "favorites",
    "neighbour": "neighbor", "neighbours": "neighbor" + "s",
    "behaviour": "behavior", "flavour": "flavor", "flavours": "flavors",
    "harbour": "harbor", "labour": "labor", "odour": "odor", "humour": "humor",
    "rumour": "rumor", "armour": "armor", "vapour": "vapor",
    "practise": "practice", "practises": "practices",
    "practising": "practicing", "practised": "practiced",
    "recognise": "recognize", "recognises": "recognizes",
    "recognised": "recognized", "recognising": "recognizing",
    "organise": "organize", "organised": "organized", "organising": "organizing",
    "realise": "realize", "realised": "realized", "realising": "realizing",
    "apologise": "apologize", "memorise": "memorize",
    "summarise": "summarize", "emphasise": "emphasize",
    "analyse": "analyze", "analysed": "analyzed",
    "centre": "center", "centres": "centers", "centred": "centered",
    "metre": "meter", "metres": "meters",
    "litre": "liter", "litres": "liters",
    "theatre": "theater", "fibre": "fiber",
    "travelled": "traveled", "travelling": "traveling", "traveller": "traveler",
    "cancelled": "canceled", "cancelling": "canceling",
    "labelled": "labeled", "labelling": "labeling",
    "modelled": "modeled", "marvellous": "marvelous", "jewellery": "jewelry",
    "towards": "toward", "maths": "math", "whilst": "while", "amongst": "among",
    "learnt": "learned", "spelt": "spelled", "dreamt": "dreamed",
    "burnt": "burned", "aeroplane": "airplane", "tyre": "tire", "tyres": "tires",
    "kerb": "curb", "plough": "plow", "mould": "mold",
    "sceptical": "skeptical", "defence": "defense", "offence": "offense",
    "pyjamas": "pajamas", "aluminium": "aluminum", "familiarisation": "familiarization",
}

# Words that only make sense to a British child.
TERMS = {
    "motorway": "highway", "motorways": "highways",
    "torch": "flashlight", "torches": "flashlights",
    "cinema": "movie theater", "cinemas": "movie theaters",
    "lorry": "truck", "lorries": "trucks",
    "biscuit": "cookie", "biscuits": "cookies",
    "sweets": "candies", "sweet": "candy",
    "spanner": "wrench", "spanners": "wrenches",
    "pavement": "sidewalk", "petrol": "gas",
    "pence": "cents", "penny": "cent",
    "rubbish": "trash", "autumn": "fall", "nappy": "diaper",
    "postbox": "mailbox", "trainers": "sneakers", "jumper": "sweater",
}

# "pound" is also a verb meaning to hit hard, which one analogy uses. Only
# convert it when it is clearly money: preceded by a number.
MONEY = [(re.compile(r"\b(\d[\d.,]*)\s+pounds?\b"), r"\1 dollars"),
         (re.compile(r"\b(\d[\d.,]*)\s+pence\b"), r"\1 cents")]

PROSE_KEYS = {
    "prompt", "promptSpeech", "explanation", "strategy", "label", "text",
    "alt", "blurb", "howItWorks", "parentTip", "childIntro", "name", "note",
    "detail", "keyText", "title", "unit",
}

def build(mapping):
    out = {}
    for a, b in mapping.items():
        out[a] = b
        out[a.capitalize()] = b.capitalize()
        out[a.upper()] = b.upper()
    return out

FULL = build({**SPELLING, **TERMS})
PATTERN = re.compile(r"\b(" + "|".join(sorted(map(re.escape, FULL), key=len, reverse=True)) + r")\b")

def convert(text, allow_grey=True):
    if not isinstance(text, str):
        return text
    for rx, rep in MONEY:
        text = rx.sub(rep, text)
    text = PATTERN.sub(lambda m: FULL[m.group(1)], text)
    if allow_grey:
        text = re.sub(r"\bgrey\b", "gray", text)
        text = re.sub(r"\bGrey\b", "Gray", text)
    return text

def walk(node, key=None):
    if isinstance(node, dict):
        return {k: walk(v, k) for k, v in node.items()}
    if isinstance(node, list):
        return [walk(v, key) for v in node]
    if isinstance(node, str) and key in PROSE_KEYS:
        return convert(node, allow_grey=True)
    return node

def main():
    changed = []
    for path in sorted(glob.glob("data/**/*.json", recursive=True)):
        before = open(path).read()
        data = json.loads(before)
        after = json.dumps(walk(data), indent=2, ensure_ascii=False) + "\n"
        if after != before:
            open(path, "w").write(after)
            changed.append(path)

    # Code and docs: same map, but `grey` names a palette token so it stays,
    # and aria-labelledby must survive intact.
    for path in ["assets/js/modules/parents.js", "index.html", "README.md",
                 "docs/AUTHORING.md"] + sorted(glob.glob("docs/research/*.md")):
        before = open(path).read()
        guarded = before.replace("aria-labelledby", "\x00ARIA\x00")
        after = convert(guarded, allow_grey=False).replace("\x00ARIA\x00", "aria-labelledby")
        if after != before:
            open(path, "w").write(after)
            changed.append(path)

    print(f"{len(changed)} files updated")
    for c in changed:
        print("  ", c)

if __name__ == "__main__":
    main()
