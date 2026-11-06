# Generates one realistic cricketer with MPFB2 (MakeHuman, CC0 output):
# body + Mixamo rig, baked skin texture with painted hair and eyebrows, eyes, and
# shirt / trousers / shoes shells skinned to the same rig. Exports a .glb.
#
# usage: python athlete.py -- <spec.json> <out.glb> [<preview.blend>]
import bpy, bmesh, sys, json, math, os, importlib, random, traceback
import numpy as np
from mathutils import Vector
from PIL import Image, ImageDraw, ImageFilter

# Paths come from the environment (see tools/athletes/README.md):
#   MPFB_SRC  - checkout of github.com/makehumancommunity/mpfb2 (folder containing src/mpfb)
#   MH_EYES   - makehuman/data/eyes from github.com/makehumancommunity/makehuman
#   MPFB_ZIP  - where to write/read the zipped MPFB extension (built from MPFB_SRC on first run)
MPFB_SRC = os.environ['MPFB_SRC']
EYES = os.environ['MH_EYES']
MPFB_ZIP = os.environ.get('MPFB_ZIP', '/tmp/mpfb_extension.zip')
if not os.path.exists(MPFB_ZIP):
    import shutil as _sh; _sh.make_archive(MPFB_ZIP[:-4], 'zip', os.path.join(MPFB_SRC, 'src', 'mpfb'))
args = sys.argv[sys.argv.index('--') + 1:]
spec = json.load(open(args[0])); out_glb = args[1]; save_blend = args[2] if len(args) > 2 else None
random.seed(spec.get('seed', 1)); np.random.seed(spec.get('seed', 1))
TEX = spec.get('tex', 1024)

bpy.ops.wm.read_factory_settings(use_empty=True)
if 'bl_ext.user_default.mpfb' not in bpy.context.preferences.addons:
    bpy.ops.extensions.package_install_files(filepath=MPFB_ZIP, repo='user_default', enable_on_install=True)
HS = importlib.import_module('bl_ext.user_default.mpfb.services.humanservice').HumanService
TS = importlib.import_module('bl_ext.user_default.mpfb.services.targetservice').TargetService

# ---------------- body
macro = TS.get_default_macro_info_dict()
for k in ('gender', 'age', 'muscle', 'weight', 'height', 'proportions'):
    if k in spec: macro[k] = spec[k]
macro['race'] = spec['race']
bm = HS.create_human(macro_detail_dict=macro, scale=0.1)
for t, v in spec.get('targets', {}).items():
    try: TS.set_target_value(bm, t, v)
    except Exception as e: print('target skipped', t, e)
rig = HS.add_builtin_rig(bm, 'mixamo')
HS.set_character_skin(None, bm, skin_type='LAYERED')

# ---------------- eyes
try:
    eyes = HS.add_mhclo_asset(EYES + '/high-poly/high-poly.mhclo', bm, asset_type='Eyes', subdiv_levels=0)
except Exception:
    traceback.print_exc(); eyes = None

def col(c): return (c[0], c[1], c[2], 1.0)
# ---------------- skin texture painted from MPFB's UV masks (no baking needed)
MASKS = os.path.join(MPFB_SRC, 'src', 'mpfb', 'data', 'textures') + '/'
def mask(name):
    return np.array(Image.open(MASKS + name).convert('L').resize((TEX, TEX), Image.BILINEAR), np.float32)[..., None] / 255
def blurred_noise(scale, amp):
    n = Image.fromarray((np.random.rand(TEX // scale, TEX // scale) * 255).astype(np.uint8), 'L').resize((TEX, TEX), Image.BICUBIC)
    return (np.array(n, np.float32)[..., None] / 255 - .5) * amp
tone = np.array(spec['skinRGB'], np.float32)[None, None, :]        # sRGB 0-255
tex = np.ones((TEX, TEX, 3), np.float32) * tone
tex *= 1 + blurred_noise(32, .10) + blurred_noise(4, .05) + blurred_noise(1, .035)   # blotches, mottling, pores
redness = np.array([1.06, .96, .95], np.float32)[None, None, :]
tex = tex * (1 - mask('mpfb_ears.jpg') * .5) + tex * redness * mask('mpfb_ears.jpg') * .5
lip = tone * np.array([.82, .58, .56], np.float32)[None, None, :]
m = mask('mpfb_lips.jpg'); tex = tex * (1 - m) + lip * m
m = mask('mpfb_eyelids.jpg'); tex = tex * (1 - m * .35) + tex * .78 * m * .35
m = mask('mpfb_fingernails.jpg'); tex = tex * (1 - m * .6) + (tone * .55 + 255 * .45) * m * .6
m = mask('mpfb_toenails.jpg'); tex = tex * (1 - m * .6) + (tone * .55 + 255 * .45) * m * .6
base = Image.fromarray(np.clip(tex, 0, 255).astype(np.uint8), 'RGB')

# ---------------- paint hair and eyebrows into the texture (UV space)
me = bm.data
uv = me.uv_layers.active.data
co = np.array([v.co[:] for v in me.vertices])          # z up, -y forward
head_bone = rig.data.bones['mixamorig:Head']
head_z = (rig.matrix_world @ head_bone.head_local).z
top_z = co[:, 2].max()
def group_center(name):
    g = bm.vertex_groups[name]; pts = [bm.matrix_world @ v.co for v in bm.data.vertices if any(x.group == g.index and x.weight > .5 for x in v.groups)]
    return sum(pts, Vector()) / len(pts)
eye_z = group_center('joint-l-eye').z
body_grp = bm.vertex_groups.get('body')
in_body = np.zeros(len(co), bool)
if body_grp:
    gi = body_grp.index
    for v in me.vertices:
        if any(g.group == gi for g in v.groups): in_body[v.index] = True
front_y = co[(co[:, 2] > eye_z - .02) & (co[:, 2] < eye_z + .03) & in_body][:, 1].min()
hair_col = tuple(spec.get('hair', (28, 22, 18)))
brow_col = tuple(int(c * .9) for c in hair_col)
hair_style = spec.get('hairStyle', 'short')     # short | crop | bald
beard = spec.get('beard', 0)                     # 0 none, 1 stubble, 2 beard

# position map: for every texel, the 3D point on the body it belongs to (rasterised per triangle in UV space)
pos = np.full((TEX, TEX, 3), np.nan, np.float32)
tris_uv, tris_p = [], []
for poly in me.polygons:
    if not all(in_body[v] for v in poly.vertices): continue
    vs = list(poly.vertices); ls = list(poly.loop_indices)
    if co[vs, 2].max() < head_z - .08: continue          # only the head and neck matter here
    for k in range(1, len(vs) - 1):
        tris_uv.append([uv[ls[0]].uv[:], uv[ls[k]].uv[:], uv[ls[k + 1]].uv[:]]); tris_p.append(co[[vs[0], vs[k], vs[k + 1]]])
tris_uv = np.array(tris_uv) * [TEX, TEX]; tris_uv[..., 1] = TEX - tris_uv[..., 1]
for t_uv, t_p in zip(tris_uv, np.array(tris_p)):
    x0, y0 = np.floor(t_uv.min(0)).astype(int); x1, y1 = np.ceil(t_uv.max(0)).astype(int)
    x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, TEX - 1), min(y1, TEX - 1)
    if x1 < x0 or y1 < y0: continue
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
    (ax, ay), (bx, by), (cx, cy) = t_uv
    den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(den) < 1e-9: continue
    w0 = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / den
    w1 = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / den
    w2 = 1 - w0 - w1
    inside = (w0 >= -.02) & (w1 >= -.02) & (w2 >= -.02)
    P = w0[..., None] * t_p[0] + w1[..., None] * t_p[1] + w2[..., None] * t_p[2]
    sub = pos[y0:y1 + 1, x0:x1 + 1]; sub[inside] = P[inside]
X, Y, Z = pos[..., 0], pos[..., 1], pos[..., 2]
valid = ~np.isnan(Z)
X, Y, Z = np.nan_to_num(X), np.nan_to_num(Y), np.nan_to_num(Z, nan=-9)
depth = Y - front_y
def ss(a, b, v): t = np.clip((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
strands = np.array(Image.fromarray((np.random.rand(TEX, TEX) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7)), np.float32) / 255
hair = np.zeros((TEX, TEX), np.float32); brow = np.zeros_like(hair); beard_m = np.zeros_like(hair)
if hair_style != 'bald':
    line = eye_z + (.07 if hair_style == 'short' else .078) - .1 * ss(.05, .15, depth)
    hair = ss(-.006, .006, Z - line) * (1 - ss(.0, .012, np.abs(X) - .066) * (1 - ss(-.004, .004, Z - (eye_z + .03))))
    hair *= .75 + .25 * strands
ax = np.abs(X)
brow_c = eye_z + .031 - .009 * ss(.02, .058, ax)
half = .0042 * (1 - .5 * ss(.014, .058, ax))
brow = ss(.0025, -.0005, np.abs(Z - brow_c) - half) * ss(.011, .019, ax) * (1 - ss(.05, .06, ax)) * (1 - ss(.025, .04, depth))
brow *= (.35 + .65 * strands) * .82
if beard:
    upper = eye_z - .054 + .034 * ss(.022, .062, ax)               # cheek line rises towards the sideburns
    beard_m = ss(.004, -.004, Z - upper) * ss(-.006, .006, Z - (eye_z - .128)) * (1 - ss(.065, .085, depth - .04 * ss(eye_z - .1, eye_z - .13, Z))) * (1 - ss(.0, .008, ax - .072))
    lips = np.array(Image.open(MASKS + 'mpfb_lips.jpg').convert('L').resize((TEX, TEX)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(3)), np.float32) / 255
    beard_m *= (1 - np.clip(lips * 1.6, 0, 1)) * (.38 if beard == 1 else .85) * (.45 + .55 * strands)
hc = np.array(hair_col, np.float32)
img = np.array(base, np.float32)
for m_, k in ((hair, .96), (brow, .92), (beard_m, 1.0)):
    m_ = (m_ * valid * k)[..., None]; img = img * (1 - m_) + hc * m_
final = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
print('MASKS hair', round(float(hair.sum())), 'brow', round(float(brow.sum())), 'beard', round(float(beard_m.sum())))
tex_path = out_glb.replace('.glb', '_skin.jpg'); final.save(tex_path, quality=88)

# replace the procedural skin with the baked texture (exportable)
pm = bpy.data.materials.new('skin'); pm.use_nodes = True
bsdf = pm.node_tree.nodes['Principled BSDF']; bsdf.inputs['Roughness'].default_value = .55
ti = pm.node_tree.nodes.new('ShaderNodeTexImage'); ti.image = bpy.data.images.load(tex_path)
pm.node_tree.links.new(ti.outputs['Color'], bsdf.inputs['Base Color'])
bm.data.materials.clear(); bm.data.materials.append(pm)
if eyes:
    em = bpy.data.materials.new('eyes'); em.use_nodes = True
    eb = em.node_tree.nodes['Principled BSDF']; eb.inputs['Roughness'].default_value = .15
    et = em.node_tree.nodes.new('ShaderNodeTexImage'); et.image = bpy.data.images.load(EYES + '/materials/brown_eye.png')
    em.node_tree.links.new(et.outputs['Color'], eb.inputs['Base Color'])
    eyes.data.materials.clear(); eyes.data.materials.append(em)

# ---------------- clothes: shells from body regions, pushed out along the normals
def dominant_bone(v, names):
    best, bw = None, 0
    for g in v.groups:
        n = bm.vertex_groups[g.group].name
        if n.startswith('mixamorig:') and g.weight > bw: best, bw = n[10:], g.weight
    return best
SHIRT = ('Spine', 'Spine1', 'Spine2', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm', 'Neck')
PANTS = ('Hips', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg')
SHOES = ('LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase', 'LeftToe_End', 'RightToe_End')
dom = [dominant_bone(v, None) for v in me.vertices]
neck_cut = head_z - .035          # collar height
hips_z = (rig.matrix_world @ rig.data.bones['mixamorig:Hips'].head_local).z
def bpos(n): return rig.matrix_world @ rig.data.bones['mixamorig:' + n].head_local
neck_z = bpos('Neck').z
sh_l, el_l, sh_r, el_r = bpos('LeftArm'), bpos('LeftForeArm'), bpos('RightArm'), bpos('RightForeArm')
SLEEVE = spec.get('sleeve', .5)          # fraction of the upper arm covered
def along(p, a, b): d = b - a; return (Vector(p) - a).dot(d) / d.length_squared
def keep_for(kind, i):
    if not in_body[i]: return False
    d = dom[i]; x, y, z = co[i]
    if kind == 'shirt':
        if d in ('LeftArm', 'LeftShoulder') or (d == 'LeftForeArm'):
            return along(co[i], sh_l, el_l) < SLEEVE
        if d in ('RightArm', 'RightShoulder') or (d == 'RightForeArm'):
            return along(co[i], sh_r, el_r) < SLEEVE
        collar = neck_z + .035 - .01 * (1 if y < -.05 else 0)      # polo collar standing up around the neck
        return d in SHIRT + ('Hips',) and hips_z - .025 < z < collar
    if kind == 'pants':
        return d in PANTS and .115 < z < hips_z + .04
    if kind == 'shoes': return z <= .125 and d in SHOES + ('LeftLeg', 'RightLeg')
def make_shell(kind, push, colour, rough):
    bpy.ops.object.select_all(action='DESELECT')
    bm.select_set(True); bpy.context.view_layer.objects.active = bm
    bpy.ops.object.duplicate(); sh = bpy.context.active_object; sh.name = kind
    for m in list(sh.modifiers):
        if m.type == 'MASK': sh.modifiers.remove(m)
    b = bmesh.new(); b.from_mesh(sh.data)
    b.verts.ensure_lookup_table()
    kill = [v for v in b.verts if not keep_for(kind, v.index)]
    bmesh.ops.delete(b, geom=kill, context='VERTS'); b.to_mesh(sh.data); b.free()
    disp = sh.modifiers.new('push', 'DISPLACE'); disp.direction = 'NORMAL'; disp.strength = push; disp.mid_level = 0
    while sh.modifiers[0] != disp: bpy.ops.object.modifier_move_up(modifier='push')
    cm = bpy.data.materials.new(kind); cm.use_nodes = True
    cb = cm.node_tree.nodes['Principled BSDF']; cb.inputs['Base Color'].default_value = col(colour); cb.inputs['Roughness'].default_value = rough
    sh.data.materials.clear(); sh.data.materials.append(cm)
    return sh
shirt = make_shell('shirt', .016, (.8, .8, .8), .8)
pants = make_shell('pants', .012, (.7, .7, .7), .85)
shoes = make_shell('shoes', .016, (.9, .9, .9), .45)

# hide body skin that is fully covered (prevents poke-through, saves triangles)
b = bmesh.new(); b.from_mesh(bm.data); b.faces.ensure_lookup_table()
covered = lambda i: keep_for('shirt', i) or keep_for('pants', i) or keep_for('shoes', i)
dead = [f for f in b.faces if all(covered(v.index) for v in f.verts) and all(
    (dom[v.index] not in ('Spine2', 'Neck', 'LeftArm', 'RightArm')) or co[v.index][2] < neck_cut - .04 for v in f.verts)]
bmesh.ops.delete(b, geom=dead, context='FACES_ONLY'); b.to_mesh(bm.data); b.free()

print('VERTS body', len(bm.data.vertices), 'shirt', len(shirt.data.vertices), 'pants', len(pants.data.vertices), 'shoes', len(shoes.data.vertices))
if save_blend: bpy.ops.wm.save_as_mainfile(filepath=save_blend)

# ---------------- export
bpy.ops.object.select_all(action='DESELECT')
for o in [rig, bm, shirt, pants, shoes] + ([eyes] if eyes else []): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', use_selection=True, export_apply=True,
                          export_animations=False, export_morph=False, export_image_format='JPEG', export_jpeg_quality=85)
print('EXPORTED', out_glb, os.path.getsize(out_glb))
