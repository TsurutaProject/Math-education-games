"""Restrict KeinannPOP AAT vertical substitutions to vertical text."""
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / 'src/data/cake-assets/keinann-pop'

def checksum(data):
    data += b'\0' * (-len(data) % 4)
    return sum(struct.unpack('>' + 'I' * (len(data) // 4), data)) & 0xffffffff

def fix(original):
    data = bytearray(original)
    tables = {}
    for i in range(struct.unpack_from('>H', data, 4)[0]):
        entry = 12 + 16 * i
        tag, _, offset, length = struct.unpack_from('>4sIII', data, entry)
        tables[tag] = (entry, offset, length)
    entry, offset, length = tables[b'morx']
    p = offset + 8
    changed = 0
    for _ in range(struct.unpack_from('>I', data, offset + 4)[0]):
        _, chain_length, feature_count, subtable_count = struct.unpack_from('>IIII', data, p)
        vertical_flags = 0
        for i in range(feature_count):
            kind, setting, enable, _ = struct.unpack_from('>HHII', data, p + 16 + 12 * i)
            if kind == 4 and setting == 0:  # AAT Vertical Substitution / on
                vertical_flags |= enable
        q = p + 16 + 12 * feature_count
        for _ in range(subtable_count):
            size, coverage, flags = struct.unpack_from('>III', data, q)
            if flags & vertical_flags:
                assert flags & ~vertical_flags == 0, 'Shared feature: do not patch blindly'
                # Only vertical text. Clear the flag that permits both directions.
                corrected = (coverage | 0x80000000) & ~0x20000000
                struct.pack_into('>I', data, q + 4, corrected)
                changed += coverage != corrected
            q += size
        p += chain_length
    assert changed == 2, f'Unexpected original font: {changed} changes'
    struct.pack_into('>I', data, entry + 4, checksum(bytes(data[offset:offset + length])))
    _, head, _ = tables[b'head']
    struct.pack_into('>I', data, head + 8, 0)
    struct.pack_into('>I', data, head + 8, (0xB1B0AFBA - checksum(bytes(data))) & 0xffffffff)
    assert checksum(bytes(data)) == 0xB1B0AFBA
    for tag, (_, start, size) in tables.items():
        if tag not in (b'morx', b'head'):
            assert data[start:start + size] == original[start:start + size], tag
    return data

if __name__ == '__main__':
    target = FONT / 'keinann-pop-web.ttf'
    target.write_bytes(fix((FONT / 'keinann-pop.ttf').read_bytes()))
    print(f'Generated {target.name}: outlines, metrics and character mapping unchanged')
