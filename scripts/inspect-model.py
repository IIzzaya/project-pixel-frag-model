"""Orthographic geometry proof, independent of browser/GPU rendering.

Reads the generated .artifacts/voxels.json and draws projected visible cube faces.
This checks the sculpture's silhouette, proportions, and equipment placement.
"""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw

data=json.loads(Path('.artifacts/voxels.json').read_text())
size=1/13
def rotate(p,r):
    x,y,z=p; rx,ry,rz=r
    y,z=y*math.cos(rx)-z*math.sin(rx),y*math.sin(rx)+z*math.cos(rx)
    x,z=x*math.cos(ry)+z*math.sin(ry),-x*math.sin(ry)+z*math.cos(ry)
    x,y=x*math.cos(rz)-y*math.sin(rz),x*math.sin(rz)+y*math.cos(rz)
    return x,y,z
faces=[([(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)],(0,0,1)),([(-1,-1,-1),(-1,1,-1),(1,1,-1),(1,-1,-1)],(0,0,-1)),([(1,-1,-1),(1,1,-1),(1,1,1),(1,-1,1)],(1,0,0)),([(-1,-1,-1),(-1,-1,1),(-1,1,1),(-1,1,-1)],(-1,0,0)),([(-1,1,-1),(-1,1,1),(1,1,1),(1,1,-1)],(0,1,0)),([(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1)],(0,-1,0))]
for name,angle,form in [('front',-.38,0),('back',2.8,0),('shadow',-.38,1)]:
    image=Image.new('RGB',(1000,1000),'#f3f5ee');draw=ImageDraw.Draw(image);polygons=[]
    camera_rotation=(.18,angle,0)
    for v in data['voxels']:
        rotation=data['rotations'][v['part']]
        for points,normal in faces:
            n=rotate(rotate(normal,rotation),camera_rotation)
            if n[2]<=0:continue
            corners=[]
            for p in points:
                q=rotate(tuple(c*size*.502 for c in p),rotation)
                corners.append(rotate((q[0]+v['x'],q[1]+v['y'],q[2]+v['z']),camera_rotation))
            hex_color=data['palette'][v['material']][form].lstrip('#')
            light=(.7+.25*max(0,n[1])+.2*max(0,n[2])+.08*max(0,-n[0]))*v['shade']
            color=tuple(min(255,round(int(hex_color[i:i+2],16)*light)) for i in (0,2,4))
            polygons.append((sum(q[2] for q in corners)/4,[(round(520+q[0]*170),round(500-q[1]*170)) for q in corners],color))
    for _,points,color in sorted(polygons,key=lambda p:p[0]):draw.polygon(points,fill=color)
    image.save(f'.artifacts/model-{name}.png')
print('Wrote geometry proofs: front, back, shadow')
