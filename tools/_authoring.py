"""Small helpers for hand-authoring question JSON.

Not part of the shipped app. These just make the source files below
readable while writing them; the output is plain JSON that the app loads
directly. Run tools/validate.mjs afterwards to check the result.
"""
import json, os

def sh(s, c, *pairs):
    """A shape. Extra attributes are passed as alternating key, value."""
    o = {"s": s, "c": c}
    for i in range(0, len(pairs), 2):
        o[pairs[i]] = pairs[i + 1]
    return o

def cell(*shapes):
    return {"shapes": list(shapes)}

def txt(t):
    return {"text": t}

def ch(i, *shapes):
    return {"id": i, "figure": {"shapes": list(shapes)}}

def cht(i, t, label=None):
    d = {"id": i, "text": t}
    if label: d["label"] = label
    return d

def chf(i, fig, label=None):
    d = {"id": i, "figure": fig}
    if label: d["label"] = label
    return d

MISS = {"missing": True}

def mat(rows, cols, cells, alt):
    return {"kind": "matrix", "rows": rows, "cols": cols, "alt": alt, "cells": cells}

def g3x3(cells, alt):
    return mat(3, 3, cells, alt)

def series(cells, alt, missing_index=None):
    d = {"kind": "series", "alt": alt, "cells": cells}
    if missing_index is not None: d["missingIndex"] = missing_index
    return d

def anal(a, b, c, alt):
    return {"kind": "analogy", "alt": alt, "a": a, "b": b, "c": c}

def table(rows, alt, header=False, cell_width=None):
    d = {"kind": "table", "header": header, "alt": alt, "rows": rows}
    if cell_width: d["cellWidth"] = cell_width
    return d

def q(qid, grade, diff, prompt, fig, choices, ans, expl, strat, speech=None):
    d = {"id": qid, "grade": grade, "difficulty": diff, "prompt": prompt}
    if speech: d["promptSpeech"] = speech
    if fig: d["figure"] = fig
    d.update({"choices": choices, "answer": ans, "explanation": expl, "strategy": strat})
    return d

def write(data, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"{path}: {len(data['questions'])} questions")
