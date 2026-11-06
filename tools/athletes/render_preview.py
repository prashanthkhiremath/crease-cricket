import bpy, sys, math
from mathutils import Vector
blend, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.open_mainfile(filepath=blend)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.view_settings.view_transform = 'Standard'
sc.cycles.device = 'CPU'
sc.cycles.samples = 24
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 640, 800
sc.render.filepath = out
world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.35, 0.4, 0.45, 1); world.node_tree.nodes['Background'].inputs[1].default_value = 0.6
def light(name, loc, energy, size=2):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.size = size
    o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector((0, 0, 1.4)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
light('key', (1.5, -2.5, 2.6), 400); light('fill', (-2.2, -1.5, 1.8), 180); light('rim', (0, 2.5, 2.4), 250)
cam = bpy.data.cameras.new('cam'); cam.lens = 85
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
mode = sys.argv[-3]
if mode == 'face':
    co.location = (0.05, -1.25, 1.62); target = Vector((0, 0, 1.6))
else:
    co.location = (0.3, -5.2, 1.1); target = Vector((0, 0, 0.9))
co.rotation_euler = (target - co.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.render.render(write_still=True)
print('RENDERED', out)
