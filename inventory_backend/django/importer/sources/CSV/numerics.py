"""
Loose parsing for numeric cells from CSV/Excel (locale and float-to-int quirks).
"""

from __future__ import annotations


def normalize_number_string(raw: str) -> str:
    """
    Turn common spreadsheet number text into something float() accepts.
    Handles: whitespace, Unicode minus, US thousands (1,234.56),
    European decimals (3,5 or 1.234,56), plain 5.0 integers.
    """
    if raw is None:
        raise ValueError('empty')
    s = str(raw).strip()
    if not s:
        raise ValueError('empty')
    s = s.replace('\u2212', '-').replace('\u00a0', '').replace(' ', '')
    if s.startswith('(') and s.endswith(')'):
        s = '-' + s[1:-1]
    neg = s.startswith('-')
    if neg:
        s = s[1:]
    if ',' in s and '.' in s:
        if s.rfind(',') > s.rfind('.'):
            s = s.replace('.', '').replace(',', '.')
        else:
            s = s.replace(',', '')
    elif ',' in s:
        parts = s.split(',')
        if (
            len(parts) == 2
            and parts[0].isdigit()
            and parts[1].isdigit()
            and len(parts[1]) == 3
        ):
            s = parts[0] + parts[1]
        elif len(parts) == 2 and parts[0].replace('.', '', 1).isdigit():
            s = parts[0] + '.' + parts[1]
        else:
            s = s.replace(',', '.')
    if neg:
        s = '-' + s
    return s


def parse_float_loose(value) -> float:
    s = normalize_number_string(value)
    return float(s)


def parse_int_loose(value) -> int:
    """Integer fields: accept 5, 5.0, 5,0 etc.; reject 5.5."""
    f = parse_float_loose(value)
    if not (f == f):  # NaN
        raise ValueError('nan')
    if abs(f) == float('inf'):
        raise ValueError('inf')
    r = round(f)
    if abs(f - r) > 1e-9:
        raise ValueError('not an integer')
    return int(r)
