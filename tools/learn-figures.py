# Draws the Learn-page illustrations into static/images/learn/*.svg.
# Run after editing:  python3 tools/learn-figures.py   (no dependencies)
# All eight share eye(), a side view of the front of the eye facing left with
# the optical axis along the bottom, so they stay consistent with each other.
import os
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'static', 'images', 'learn')
FONT='font-family="Helvetica Neue, Helvetica, Arial, sans-serif"'
INK='#1f2937'; BLUE='#2a6ebb'; MUTED='#5b6573'

def svg(w,h,body,title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}">'
            f'<title>{title}</title>'
            '<defs>'
            f'<marker id="ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{BLUE}"/></marker>'
            '<marker id="ahg" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#16a34a"/></marker>'
            '<pattern id="tm" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fde68a"/><line x1="0" y1="0" x2="0" y2="6" stroke="#b45309" stroke-width="2"/></pattern>'
            '<pattern id="cloud" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#d1d5db"/><circle cx="4" cy="4" r="2.2" fill="#9ca3af"/><circle cx="11" cy="10" r="1.6" fill="#9ca3af"/></pattern>'
            '</defs>'
            f'<rect width="{w}" height="{h}" fill="#ffffff"/>{body}</svg>')

def label(x,y,text,anchor='start',size=22,weight='600',color=INK):
    lines=text.split('\n'); out=''
    for i,l in enumerate(lines):
        out+=f'<text x="{x}" y="{y+i*(size+4)}" {FONT} font-size="{size}" font-weight="{weight if i==0 else 400}" fill="{color}" text-anchor="{anchor}">{l}</text>'
    return out

def leader(x1,y1,x2,y2):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{MUTED}" stroke-width="1.5"/><circle cx="{x2}" cy="{y2}" r="3.5" fill="{MUTED}"/>'

def eye(lens='clear', iris=True):
    """Upper half of the anterior segment. Key points: angle ~ (300,122),
    Schlemm's canal ~ (309,104), pupil margin ~ (272,300), lens equator ~ (385,178)."""
    s=''
    # sclera (white wall) from limbus to the right
    s+=f'<path d="M298,92 C420,50 560,40 720,44 L720,70 C560,66 422,76 304,116 Z" fill="#f8fafc" stroke="#6b7280" stroke-width="2"/>'
    # cornea (clear dome)
    s+=f'<path d="M110,400 C110,250 190,128 298,92 L304,116 C204,148 128,262 128,400 Z" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>'
    # ciliary body
    s+=f'<path d="M312,118 C340,106 372,98 400,96 C392,130 372,160 340,170 C326,160 314,142 312,118 Z" fill="#f2b8b5" stroke="#b45454" stroke-width="1.5"/>'
    # lens
    if lens=='clear':
        s+=f'<path d="M385,400 m-100,0 a100,222 0 0,1 200,0 Z" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/>'
    elif lens=='cloudy':
        s+=f'<path d="M385,400 m-100,0 a100,222 0 0,1 200,0 Z" fill="url(#cloud)" stroke="#6b7280" stroke-width="2"/>'
    elif lens=='iol':
        s+=f'<path d="M385,400 m-100,0 a100,222 0 0,1 200,0 Z" fill="none" stroke="#9ca3af" stroke-width="2" stroke-dasharray="6 5"/>'
        s+=f'<path d="M385,400 m-34,0 a34,118 0 0,1 68,0 Z" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5"/>'
        s+=f'<path d="M385,284 C392,250 395,215 386,186" fill="none" stroke="#0284c7" stroke-width="3"/>'
    # zonules
    for (x1,y1,x2,y2) in [(342,166,372,184),(352,160,388,180),(362,152,400,183),(372,144,412,190)]:
        s+=f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#a8a29e" stroke-width="1"/>'
    # iris
    if iris:
        s+=f'<path d="M300,124 C292,180 280,250 270,300 L286,302 C296,252 306,186 316,128 Z" fill="#8b5e3c" stroke="#5c3d26" stroke-width="1.5"/>'
    # trabecular meshwork (the drain) and Schlemm's canal
    s+=f'<path d="M292,104 L305,100 L309,122 L299,126 Z" fill="url(#tm)" stroke="#b45309" stroke-width="1.2"/>'
    s+=f'<ellipse cx="312" cy="100" rx="8" ry="4.5" fill="#93c5fd" stroke="#1d4ed8" stroke-width="1.2"/>'
    # axis
    s+=f'<line x1="90" y1="400" x2="720" y2="400" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="4 6"/>'
    return s

def flow():
    a=f'stroke="{BLUE}" stroke-width="4" fill="none" stroke-linecap="round"'
    return (f'<path d="M336,176 C318,214 306,262 293,312" {a} marker-end="url(#ah)"/>'
            f'<path d="M286,330 C270,352 236,350 214,322" {a} marker-end="url(#ah)"/>'
            f'<path d="M200,300 C186,250 226,170 284,128" {a} marker-end="url(#ah)"/>')


def open_eye(cx,cy):
    s=f'<path d="M{cx-130},{cy} Q{cx},{cy-95} {cx+130},{cy} Q{cx},{cy+120} {cx-130},{cy} Z" fill="#ffffff" stroke="{INK}" stroke-width="3"/>'
    s+=f'<path d="M{cx-112},{cy+14} Q{cx},{cy+112} {cx+112},{cy+14} Q{cx},{cy+70} {cx-112},{cy+14} Z" fill="#f9a8b4"/>'
    s+=f'<circle cx="{cx}" cy="{cy-18}" r="42" fill="#5b8bb5" stroke="#2c4f6e" stroke-width="2"/><circle cx="{cx}" cy="{cy-18}" r="17" fill="#111827"/><circle cx="{cx+10}" cy="{cy-28}" r="6" fill="#ffffff"/>'
    s+=f'<path d="M{cx-130},{cy} Q{cx},{cy-95} {cx+130},{cy}" fill="none" stroke="{INK}" stroke-width="5"/>'
    return s
def bottle(x,y):
    return (f'<rect x="{x-34}" y="{y-120}" width="68" height="92" rx="12" fill="#e0f2fe" stroke="#0369a1" stroke-width="3"/>'
            f'<rect x="{x-24}" y="{y-34}" width="48" height="16" fill="#0f9b8e"/>'
            f'<path d="M{x-18},{y-18} L{x+18},{y-18} L{x+5},{y+12} L{x-5},{y+12} Z" fill="#0f9b8e"/>'
            f'<path d="M{x},{y+30} C{x+10},{y+44} {x+10},{y+56} {x},{y+58} C{x-10},{y+56} {x-10},{y+44} {x},{y+30} Z" fill="{BLUE}"/>')
def finger(x,y,angle):
    return f'<g transform="rotate({angle} {x} {y})"><rect x="{x-22}" y="{y}" width="44" height="120" rx="22" fill="#f1c7a8" stroke="#b07d5b" stroke-width="2"/><path d="M{x-14},{y+16} Q{x},{y+6} {x+14},{y+16}" fill="none" stroke="#b07d5b" stroke-width="2"/></g>'

figs={}
DY=80  # headroom above the eye drawing for labels
def shifted(body): return f'<g transform="translate(0,{DY})">{body}</g>'

# 1. fluid flow
b=eye()+flow()
b+=label(150,250,'Cornea','end')+leader(156,244,190,236)
b+=label(222,160,'Fluid','middle',20,'700',BLUE)
b+=label(440,322,'Lens','start')+leader(436,316,420,316)
b+=label(205,385,'Iris','end')+leader(210,379,278,288)
b+=label(470,150,'Ciliary body\nmakes the fluid')+leader(466,145,388,116)
b+=label(330,-44,'Drain (trabecular meshwork):','start',20)+label(330,-20,'fluid leaves the eye here','start',20,'400')+leader(326,-26,304,104)
figs['aqueous-flow']=('How fluid moves through the front of the eye',720,420+DY,shifted(b))

# 2. optic nerve, with vessel arcades curving out of the disc
def disc(cx,cy,cup):
    s=f'<circle cx="{cx}" cy="{cy}" r="135" fill="#d9734a"/>'
    s+=f'<circle cx="{cx}" cy="{cy}" r="92" fill="#f4b183" stroke="#e8955f" stroke-width="2"/>'
    s+=f'<circle cx="{cx}" cy="{cy}" r="{cup}" fill="#fdf0d5"/>'
    v='stroke="#9f1d1d" stroke-width="5" fill="none" stroke-linecap="round"'
    for sy in (-1,1):          # superior and inferior arcades
        for sx in (-1,1):      # toward and away from the macula
            x1=cx+sx*6; y1=cy+sy*cup*0.9
            s+=f'<path d="M{cx+sx*4},{cy} L{x1},{y1} C{x1+sx*6},{cy+sy*(cup+40)} {cx+sx*60},{cy+sy*118} {cx+sx*128},{cy+sy*58}" {v}/>'
    return s
b=disc(200,190,30)+disc(560,190,74)
b+=label(380,40,'Cup','middle',20)+leader(366,46,214,182)+leader(394,46,532,168)
b+=label(380,372,'Rim (nerve fibers)','middle',20)+leader(320,360,268,262)+leader(440,360,500,258)
b+=label(200,420,'Healthy nerve','middle',24,'700')+label(200,448,'small cup, thick rim','middle',20,'400',MUTED)
b+=label(560,420,'Glaucoma damage','middle',24,'700')+label(560,448,'large cup, thin rim','middle',20,'400',MUTED)
figs['optic-nerve']=('Healthy optic nerve compared with glaucoma damage',760,470,b)

# 3. eye drop technique
b=bottle(200,230)+open_eye(200,380)+finger(200,452,0)
b+=label(30,40,'1','start',30,'700',BLUE)+label(60,40,'Look up and pull the','start',20,'600')+label(60,64,'lower lid down. Put one','start',20,'400')+label(60,88,'drop into the pocket.','start',20,'400')
cx=570; cy=370
b+=f'<path d="M{cx-130},{cy} Q{cx},{cy-60} {cx+130},{cy} Q{cx},{cy+40} {cx-130},{cy} Z" fill="#fde7d9" stroke="{INK}" stroke-width="3"/>'
b+=f'<path d="M{cx-125},{cy+4} Q{cx},{cy+46} {cx+125},{cy+4}" fill="none" stroke="{INK}" stroke-width="4"/>'
for i in range(-4,5):
    b+=f'<line x1="{cx+i*24}" y1="{cy+24-abs(i)*2}" x2="{cx+i*26}" y2="{cy+42-abs(i)*2}" stroke="{INK}" stroke-width="2.5"/>'
b+=finger(cx-142,cy+8,-35)
b+=f'<circle cx="{cx-130}" cy="{cy}" r="30" fill="none" stroke="{BLUE}" stroke-width="3" stroke-dasharray="6 5"/>'
b+=label(410,40,'2','start',30,'700',BLUE)+label(440,40,'Close the eye gently and','start',20,'600')+label(440,64,'press the inner corner','start',20,'400')+label(440,88,'for 1 to 2 minutes.','start',20,'400')
b+=label(408,cy-74,'Inner corner, beside the nose','start',18,'400',MUTED)+leader(cx-130,cy-66,cx-130,cy-32)
b+=f'<line x1="390" y1="20" x2="390" y2="540" stroke="#e5e7eb" stroke-width="2"/>'
figs['eye-drop-technique']=('How to put in an eye drop: two steps',760,560,b)

# 4. SLT: contact lens resting on the cornea, laser aimed at the drain
b=eye()
b+=f'<path d="M58,262 C64,170 140,86 250,52 L298,92 C190,128 110,250 110,330 L80,330 Z" fill="#e0e7ff" stroke="#6366f1" stroke-width="2" opacity="0.8"/>'
b+=eye()  # redraw the eye over the lens edge so the cornea stays crisp
b+=f'<path d="M14,196 L290,114" stroke="#16a34a" stroke-width="5" marker-end="url(#ahg)"/>'
b+=f'<circle cx="300" cy="114" r="6" fill="#16a34a" opacity="0.85"/>'
b+=label(14,180,'Laser','start',22,'700','#15803d')
b+=label(20,-44,'Contact lens rests on','start',20)+label(20,-20,'the numbed eye','start',20,'400')+leader(120,-14,150,100)
b+=label(360,-44,'Laser pulses treat the drain','start',20)+label(360,-20,'so fluid leaves more easily','start',20,'400')+leader(356,-26,304,108)
b+=label(205,385,'Iris','end')+leader(210,379,278,288)
b+=label(440,322,'Lens','start')+leader(436,316,420,316)
figs['slt']=('Selective laser trabeculoplasty: the laser is aimed at the drain through a contact lens',720,420+DY,shifted(b))

# 5. MIGS stent: close-up of the drainage angle (eye facing left)
def wall_y(x, inner):  # straight eye wall running up to the right
    return (330 if inner else 230) - x*0.31
W=lambda x,inner: f'{x},{wall_y(x,inner):.0f}'
b=''
b+=f'<path d="M0,{wall_y(0,0):.0f} L340,{wall_y(340,0):.0f} L340,{wall_y(340,1):.0f} L0,{wall_y(0,1):.0f} Z" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>'  # cornea
b+=f'<path d="M340,{wall_y(340,0):.0f} L720,{wall_y(720,0):.0f} L720,{wall_y(720,1):.0f} L340,{wall_y(340,1):.0f} Z" fill="#f8fafc" stroke="#6b7280" stroke-width="2"/>'  # sclera
b+=f'<path d="M520,{wall_y(520,1):.0f} L720,{wall_y(720,1):.0f} L720,300 C640,300 560,280 500,240 Z" fill="#f2b8b5" stroke="#b45454" stroke-width="2"/>'  # ciliary body
b+=f'<path d="M440,{wall_y(440,1)+4:.0f} L520,{wall_y(520,1)+2:.0f} C510,300 500,380 496,480 L404,480 C410,380 425,290 440,{wall_y(440,1)+4:.0f} Z" fill="#8b5e3c" stroke="#5c3d26" stroke-width="2"/>'  # iris root
tm=[(350,wall_y(350,1)),(440,wall_y(440,1)),(440,wall_y(440,1)-22),(350,wall_y(350,1)-22)]
b+='<path d="M'+' L'.join(f'{x:.0f},{y:.0f}' for x,y in tm)+' Z" fill="url(#tm)" stroke="#b45309" stroke-width="2"/>'  # trabecular meshwork
cx,cy=395,wall_y(395,1)-48
b+=f'<ellipse cx="{cx}" cy="{cy:.0f}" rx="44" ry="14" transform="rotate(-17 {cx} {cy:.0f})" fill="#93c5fd" stroke="#1d4ed8" stroke-width="2"/>'  # Schlemm's canal
sx,sy=372,wall_y(372,1)+8
b+=f'<g transform="rotate(-62 {sx} {sy:.0f})"><rect x="{sx-6}" y="{sy-9:.0f}" width="78" height="18" rx="9" fill="#d4a017" stroke="#7c5a06" stroke-width="2"/><rect x="{sx+6}" y="{sy-3:.0f}" width="54" height="6" rx="3" fill="#fff7d6"/></g>'  # stent
a=f'stroke="{BLUE}" stroke-width="4" fill="none" stroke-linecap="round"'
b+=f'<path d="M150,420 C240,390 320,320 360,252" {a} marker-end="url(#ah)"/>'
b+=f'<path d="M420,{cy-10:.0f} C450,{cy-50:.0f} 470,{cy-90:.0f} 500,{cy-120:.0f}" {a} marker-end="url(#ah)"/>'
b+=label(60,250,'Cornea','start',22)
b+=label(600,48,'Sclera','start',20,'400',MUTED)
b+=label(510,76,'To the','start',18,'600',BLUE)+label(510,98,'bloodstream','start',18,'600',BLUE)
b+=label(70,470,'Fluid in the front chamber','start',20,'600',BLUE)
b+=label(160,130,"Schlemm's canal",'start',20)+leader(250,138,372,160)
b+=label(150,214,'Stent','start',22)+leader(206,208,374,208)
b+=label(570,330,'Drain','start',20)+label(570,354,'(trabecular','start',18,'400')+label(570,376,'meshwork)','start',18,'400')+leader(566,326,428,196)
b+=label(530,470,'Iris','start',22)+leader(526,464,486,440)
figs['migs-stent']=('A MIGS stent opens a path from the front chamber into the eye\'s drainage canal',720,500,b)

# 6. trabeculectomy
b=eye()
b+=f'<path d="M296,88 C330,40 420,30 470,58 C450,60 380,70 330,92 Z" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2"/>'
b+=f'<path d="M290,86 C330,24 430,14 480,56 C560,40 640,34 720,36" fill="none" stroke="#dc2626" stroke-width="2.5"/>'
b+=f'<path d="M320,84 L372,66 L378,74 L326,94 Z" fill="#f8fafc" stroke="#374151" stroke-width="2"/>'
b+=f'<path d="M298,112 L318,92" stroke="{BLUE}" stroke-width="7" stroke-linecap="round"/>'
a=f'stroke="{BLUE}" stroke-width="4" fill="none" stroke-linecap="round"'
b+=f'<path d="M210,250 C220,190 256,148 292,120" {a} marker-end="url(#ah)"/>'
b+=f'<path d="M330,84 C360,60 400,52 430,56" {a} marker-end="url(#ah)"/>'
b+=label(470,130,'Bleb: fluid collects under','start',20)+label(470,154,'the conjunctiva, hidden','start',20,'400')+label(470,178,'by the upper eyelid','start',20,'400')+leader(466,125,420,60)
b+=label(20,-44,'Small flap and opening','start',20)+label(20,-20,'in the eye wall','start',20,'400')+leader(160,-14,340,84)
b+=label(540,-20,'Conjunctiva','start',18,'600','#b91c1c')+leader(560,-12,600,38)
b+=label(205,385,'Iris','end')+leader(210,379,278,288)
b+=label(440,322,'Lens','start')+leader(436,316,420,316)
figs['trabeculectomy']=('Trabeculectomy: fluid leaves through a new opening into a bleb under the eyelid',720,420+DY,shifted(b))

# 7. tube shunt
b=eye()
b+=f'<ellipse cx="605" cy="30" rx="112" ry="24" fill="#bfdbfe" opacity="0.55"/>'
b+=f'<rect x="520" y="20" width="170" height="24" rx="12" fill="#e5e7eb" stroke="#4b5563" stroke-width="2"/>'
b+=f'<path d="M530,32 C440,38 360,64 320,90 L250,150" fill="none" stroke="#4b5563" stroke-width="8" stroke-linecap="round"/>'
b+=f'<path d="M530,32 C440,38 360,64 320,90 L250,150" fill="none" stroke="#d1d5db" stroke-width="3" stroke-linecap="round"/>'
b+=f'<path d="M330,72 C360,56 400,46 430,44 L436,56 C404,58 366,68 336,84 Z" fill="#fef3c7" stroke="#a16207" stroke-width="1.5" opacity="0.95"/>'
a=f'stroke="{BLUE}" stroke-width="4" fill="none" stroke-linecap="round"'
b+=f'<path d="M200,260 C210,210 230,180 246,160" {a} marker-end="url(#ah)"/>'
b+=label(470,130,'Plate sits on the eye wall','start',20)+label(470,154,'under the upper eyelid;','start',20,'400')+label(470,178,'fluid is absorbed around it','start',20,'400')+leader(560,112,600,46)
b+=label(20,-44,'Tube tip sits in the','start',20)+label(20,-20,'front chamber','start',20,'400')+leader(150,-14,250,146)
b+=label(330,-44,'A patch covers the tube','start',20)+leader(390,-36,388,56)
b+=label(205,385,'Iris','end')+leader(210,379,278,288)
figs['tube-shunt']=('Tube shunt: a small tube carries fluid to a plate on the eye wall',720,420+DY,shifted(b))

# 8. cataract: before / after, each panel clipped to its half
b='<clipPath id="cl"><rect x="0" y="0" width="396" height="380"/></clipPath><clipPath id="cr"><rect x="404" y="0" width="396" height="380"/></clipPath>'
b+=f'<g clip-path="url(#cl)"><g transform="translate(-20,50) scale(0.66)">{eye("cloudy")}</g></g>'
b+=f'<g clip-path="url(#cr)"><g transform="translate(384,50) scale(0.66)">{eye("iol")}</g></g>'
b+=label(200,34,'Cataract','middle',24,'700')+label(600,34,'After surgery','middle',24,'700')
b+=label(250,345,'Cloudy natural lens','middle',20)
b+=label(640,345,'Clear lens implant','middle',20)+label(640,369,'in the same capsule','middle',20,'400')
b+=f'<line x1="400" y1="10" x2="400" y2="380" stroke="#e5e7eb" stroke-width="2"/>'
figs['cataract-lens']=('A cloudy natural lens compared with a clear lens implant after cataract surgery',800,390,b)

for name,(title,w,h,body) in figs.items():
    open(os.path.join(OUT,name+'.svg'),'w').write(svg(w,h,body,title))
    print(name, os.path.getsize(os.path.join(OUT,name+'.svg')),'bytes')
