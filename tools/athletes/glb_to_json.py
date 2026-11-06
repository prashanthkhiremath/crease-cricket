"""Convert .glb files to embedded-buffer glTF .json (the artifact host does not serve .glb).
usage: python glb_to_json.py out_dir file1.glb [file2.glb ...]"""
import base64, json, os, struct, sys
out = sys.argv[1]
for f in sys.argv[2:]:
    b = open(f, 'rb').read(); jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl])
    o = 20 + jl; bl = struct.unpack('<I', b[o:o + 4])[0]; binc = b[o + 8:o + 8 + bl]
    j['buffers'][0]['uri'] = 'data:application/octet-stream;base64,' + base64.b64encode(binc).decode()
    dst = os.path.join(out, os.path.basename(f)[:-4] + '.json')
    open(dst, 'w').write(json.dumps(j, separators=(',', ':'))); print(dst, os.path.getsize(dst) // 1024, 'KB')
