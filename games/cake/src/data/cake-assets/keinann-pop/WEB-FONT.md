# Safari horizontal text fix

The original `keinann-pop.ttf` and its license/readme are retained unchanged.
The game loads `keinann-pop-web.ttf`, generated with:

```sh
python3 scripts/fix-cake-font.py
```

The original Apple AAT `morx` chain enables Vertical Substitution (feature
4, selector 0, flag 0x80) by default, but its two substitution subtables have
horizontal coverage (0x00000004). Safari consequently displays vertical
forms of prolonged sound marks, punctuation, brackets and arrows in horizontal
text. CSS `vert`/`vrt2` disabling did not fix the observed Safari rendering.

The generated font restricts only these two subtables to vertical coverage
(0x80000004), and recalculates the morx and font checksums. All other tables
except the head checksum adjustment are byte-identical, including outlines,
metrics and character mapping. The generator verifies those invariants.

The bundled Readme.pdf identifies the font as SIL Open Font License 1.1.
This derivative retains the original license. This is a game-specific
compatibility correction, not an upstream font release.

Manual check: native macOS Safari title, stage list and stage 1 showed correct
horizontal long marks, brackets, punctuation and back arrow after the change.
Chrome title screen was also observed with correct horizontal glyphs; full
Chrome interaction comparison was blocked by unavailable browser connection.
