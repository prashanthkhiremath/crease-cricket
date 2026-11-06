# Squad generator

Builds the game's players with [MPFB2](https://github.com/makehumancommunity/mpfb2) (MakeHuman for Blender). Characters created with MakeHuman are CC0, so the generated models can be used freely in the game.

Each spec in `specs/` describes one player: gender, age, muscle, weight, height and proportions (0–1 MakeHuman macros), ethnic mix, skin colour (sRGB), hair colour and style (`short`, `crop`, `bald`) and beard (0 none, 1 stubble, 2 full).

`athlete.py` then:

1. creates the body and adds MPFB's Mixamo-compatible skeleton,
2. adds MakeHuman's eyes (CC0),
3. paints a 1024² skin texture from MPFB's region masks (skin tone, pores, lips, eyelids, ears, nails) and draws hair, eyebrows and beard using a position map of the head,
4. builds shirt, trousers and shoes as shells offset from the body and skinned to the same skeleton (the game colours them per team),
5. exports a `.glb`.

## Regenerating

You need Python 3.11, the `bpy` wheel (Blender 5.0 as a Python module), Pillow and NumPy, plus checkouts of mpfb2 and makehuman:

```bash
python3.11 -m venv .venv && .venv/bin/pip install bpy==5.0.1 pillow numpy
git clone --depth 1 https://github.com/makehumancommunity/mpfb2
git clone --depth 1 --filter=blob:none --sparse https://github.com/makehumancommunity/makehuman
git -C makehuman sparse-checkout set makehuman/data/eyes
```

Then, from this folder:

```bash
export MPFB_SRC=$PWD/mpfb2 MH_EYES=$PWD/makehuman/makehuman/data/eyes
for k in p1 p2 p3 p4 p5 p6 p7 ump; do .venv/bin/python athlete.py -- specs/$k.json out/$k.glb; done
python glb_to_json.py ../../public/models/players out/*.glb
```

`render_preview.py -- face|body model.blend out.png` renders a Cycles preview (pass a `.blend` path as the third `athlete.py` argument to save one).
