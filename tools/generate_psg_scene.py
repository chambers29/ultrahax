#!/usr/bin/env python3
"""Generate PSG presentation scene stadium JSON."""
from pathlib import Path
import json

CHAR_HEIGHT = 28
H = CHAR_HEIGHT
MID = H // 2

WHITE = "FFFFFF"
RED = "DA291C"
NAVY = "0D1B2A"
PSG_BLUE = "004170"

# Font: char → {width, strokes: [((x1,y1),(x2,y2)), ...]}
# Origin = top-left. y grows downward (HaxBall screen coords).
FONT = {
    'P': {'width': 16, 'strokes': [
        ((0, H), (0, 0)), ((0, 0), (16, 0)), ((16, 0), (16, MID)), ((16, MID), (0, MID)),
    ]},
    'A': {'width': 16, 'strokes': [
        ((0, H), (8, 0)), ((8, 0), (16, H)), ((4, MID), (12, MID)),
    ]},
    'R': {'width': 16, 'strokes': [
        ((0, H), (0, 0)), ((0, 0), (16, 0)), ((16, 0), (16, MID)), ((16, MID), (0, MID)),
        ((8, MID), (16, H)),
    ]},
    'I': {'width': 4, 'strokes': [
        ((2, 0), (2, H)),
    ]},
    'S': {'width': 16, 'strokes': [
        ((16, 0), (0, 0)), ((0, 0), (0, MID)), ((0, MID), (16, MID)),
        ((16, MID), (16, H)), ((16, H), (0, H)),
    ]},
    'N': {'width': 16, 'strokes': [
        ((0, H), (0, 0)), ((0, 0), (16, H)), ((16, H), (16, 0)),
    ]},
    'T': {'width': 16, 'strokes': [
        ((0, 0), (16, 0)), ((8, 0), (8, H)),
    ]},
    'G': {'width': 16, 'strokes': [
        ((16, 0), (0, 0)), ((0, 0), (0, H)), ((0, H), (16, H)),
        ((16, H), (16, MID)), ((16, MID), (8, MID)),
    ]},
    'E': {'width': 16, 'strokes': [
        ((16, 0), (0, 0)), ((0, 0), (0, H)), ((0, H), (16, H)), ((0, MID), (12, MID)),
    ]},
    'M': {'width': 20, 'strokes': [
        ((0, H), (0, 0)), ((0, 0), (10, MID)), ((10, MID), (20, 0)), ((20, 0), (20, H)),
    ]},
    '-': {'width': 10, 'strokes': [
        ((1, MID), (9, MID)),
    ]},
    ' ': {'width': 10, 'strokes': []},
}


def text_width(text: str, spacing: int) -> int:
    return sum(FONT[ch]['width'] for ch in text) + (len(text) - 1) * spacing


def build_text(text: str, center_x: float, top_y: float, spacing: int, color: str, base_idx: int):
    vertices: list[dict] = []
    segments: list[dict] = []

    cursor_x = center_x - text_width(text, spacing) / 2

    for ch in text:
        for (x1, y1), (x2, y2) in FONT[ch]['strokes']:
            idx = base_idx + len(vertices)
            vertices.append({'x': round(cursor_x + x1), 'y': round(top_y + y1), 'cMask': [], 'cGroup': []})
            vertices.append({'x': round(cursor_x + x2), 'y': round(top_y + y2), 'cMask': [], 'cGroup': []})
            segments.append({'v0': idx, 'v1': idx + 1, 'color': color, 'vis': True, 'cMask': [], 'cGroup': []})
        cursor_x += FONT[ch]['width'] + spacing

    return vertices, segments


def build_line(x1: int, y1: int, x2: int, y2: int, color: str, base_idx: int):
    vertices = [
        {'x': x1, 'y': y1, 'cMask': [], 'cGroup': []},
        {'x': x2, 'y': y2, 'cMask': [], 'cGroup': []},
    ]
    segments = [{'v0': base_idx, 'v1': base_idx + 1, 'color': color, 'vis': True, 'cMask': [], 'cGroup': []}]
    return vertices, segments


def main():
    all_v: list[dict] = []
    all_s: list[dict] = []

    def add(v, s):
        all_v.extend(v)
        all_s.extend(s)

    # "PARIS" — wide letter spacing for heading effect
    add(*build_text("PARIS", 0, -55, 10, WHITE, len(all_v)))

    # "SAINT-GERMAIN"
    add(*build_text("SAINT-GERMAIN", 0, -10, 5, WHITE, len(all_v)))

    # Red accent line above
    half = 135
    add(*build_line(-half, -68, half, -68, RED, len(all_v)))

    # Red separator between lines
    add(*build_line(-90, -18, 90, -18, RED, len(all_v)))

    # Red accent line below
    add(*build_line(-half, 30, half, 30, RED, len(all_v)))

    stadium = {
        'name': 'PARIS SAINT-GERMAIN',
        'width': 500,
        'height': 350,
        'spawnDistance': 0,
        'bg': {
            'type': 'none',
            'width': 0,
            'height': 0,
            'kickOffRadius': 0,
            'cornerRadius': 0,
            'color': NAVY,
        },
        'playerPhysics': {
            'bCoef': 0.3, 'invMass': 0.5, 'damping': 0.96,
            'acceleration': 0.12, 'kickingAcceleration': 0.07,
            'kickingDamping': 0.96, 'kickStrength': 5.65,
        },
        'ballPhysics': {
            'radius': 6, 'bCoef': 0.5, 'invMass': 1,
            'damping': 0.99, 'color': WHITE,
            'cMask': ['all'], 'cGroup': ['ball'],
        },
        'vertexes': all_v,
        'segments': all_s,
        'goals': [],
        'discs': [
            {'pos': [-20, 45], 'radius': 4, 'color': RED, 'invMass': 0, 'cMask': [], 'cGroup': []},
            {'pos': [0, 45], 'radius': 4, 'color': WHITE, 'invMass': 0, 'cMask': [], 'cGroup': []},
            {'pos': [20, 45], 'radius': 4, 'color': PSG_BLUE, 'invMass': 0, 'cMask': [], 'cGroup': []},
        ],
        'planes': [],
        'joints': [],
        'traits': {},
        'redSpawnPoints': [],
        'blueSpawnPoints': [],
        'canBeStored': False,
    }

    out = Path(__file__).resolve().parent.parent / 'data' / 'generated_stadiums' / 'psg_presentation.json'
    out.write_text(json.dumps(stadium, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"Generated: {out}")
    print(f"Vertices: {len(all_v)}, Segments: {len(all_s)}, Discs: {len(stadium['discs'])}")


if __name__ == '__main__':
    main()
