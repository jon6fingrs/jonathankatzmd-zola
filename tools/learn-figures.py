# Draws the Learn-page illustrations into static/images/learn/*.svg.
# Run after editing:  python3 tools/learn-figures.py   (no dependencies)
# All but the iridotomy front view share eye(), a side view of the front of the eye facing left with
# the optical axis along the bottom, so they stay consistent with each other.
import os, math
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

# The iris as a strip around a centerline from its root (u=0) to the pupil
# margin (u=1); bow=1 is the narrow-angle shape. Same maths as static/js/lpi.js,
# which animates between the two, so keep them in step.
IRIS_N=30; HOLE_U=0.25
def iris_center(u,bow):
    push=40*(1-math.exp(-u/0.07))*(1-u)**1.1-9*u**4
    return (308-30*u-bow*push, 126+175*u)
def iris_sides(bow):
    front=[];back=[]
    for i in range(IRIS_N+1):
        u=i/IRIS_N; c=iris_center(u,bow); a=iris_center(max(0,u-0.02),bow); b=iris_center(min(1,u+0.02),bow)
        dx=b[0]-a[0]; dy=b[1]-a[1]; ln=math.hypot(dx,dy) or 1
        h=(16-3*u)/2; nx=-dy/ln; ny=dx/ln
        front.append((c[0]-nx*h,c[1]-ny*h)); back.append((c[0]+nx*h,c[1]+ny*h))
    return front,back
def _pts(a): return ' L'.join(f'{x:.1f},{y:.1f}' for x,y in a)
def iris_strip(bow, hole=False):
    front,back=iris_sides(bow); m=front[-1]; n=back[-1]; r=math.hypot(n[0]-m[0],n[1]-m[1])/2
    s=f'<path d="M{_pts(front)} A{r:.1f},{r:.1f} 0 0,1 {n[0]:.1f},{n[1]:.1f} L{_pts(back[::-1])} Z" fill="#8b5e3c" stroke="#5c3d26" stroke-width="1.5" stroke-linejoin="round"/>'
    if hole:
        i=round(HOLE_U*IRIS_N); f=front[i]; b=back[i]; ex=(b[0]-f[0])*0.2; ey=(b[1]-f[1])*0.2
        s+=f'<line x1="{f[0]-ex:.1f}" y1="{f[1]-ey:.1f}" x2="{b[0]+ex:.1f}" y2="{b[1]+ey:.1f}" stroke="#fff" stroke-width="13"/>'
    return s
def behind_iris(bow, fill='#a78bfa', opacity=0.55):
    _,back=iris_sides(bow)
    return f'<path d="M{_pts(back)} L300,306 L385,178 L345,166 L316,128 Z" fill="{fill}" opacity="{opacity}"/>'

def eye(lens='clear', iris=True, behind=''):
    """Upper half of the anterior segment. Key points: angle ~ (300,122),
    Schlemm's canal ~ (309,104), pupil margin ~ (272,300), lens equator ~ (385,178).
    iris: True (the usual flat iris), False, or SVG to draw in its place;
    behind: SVG drawn under the lens and ciliary body (fluid behind the iris)."""
    s=''
    # sclera (white wall) from limbus to the right
    s+=f'<path d="M298,92 C420,50 560,40 720,44 L720,70 C560,66 422,76 304,116 Z" fill="#f8fafc" stroke="#6b7280" stroke-width="2"/>'
    # cornea (clear dome)
    s+=f'<path d="M110,400 C110,250 190,128 298,92 L304,116 C204,148 128,262 128,400 Z" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>'
    s+=behind
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
    if isinstance(iris,str):
        s+=iris
    elif iris:
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
b+=f'<path d="M530,32 C440,38 380,58 334,80 C316,90 302,108 294,134 L281,198" fill="none" stroke="#4b5563" stroke-width="8" stroke-linecap="round"/>'
b+=f'<path d="M530,32 C440,38 380,58 334,80 C316,90 302,108 294,134 L281,198" fill="none" stroke="#d1d5db" stroke-width="3" stroke-linecap="round"/>'
b+=f'<path d="M330,72 C360,56 400,46 430,44 L436,56 C404,58 366,68 336,84 Z" fill="#fef3c7" stroke="#a16207" stroke-width="1.5" opacity="0.95"/>'
a=f'stroke="{BLUE}" stroke-width="4" fill="none" stroke-linecap="round"'
b+=f'<path d="M206,292 C214,258 240,228 270,208" {a} marker-end="url(#ah)"/>'
b+=label(470,130,'Plate sits on the eye wall','start',20)+label(470,154,'under the upper eyelid;','start',20,'400')+label(470,178,'fluid is absorbed around it','start',20,'400')+leader(560,112,600,46)
b+=label(20,-44,'Tube lies in the front chamber,','start',20)+label(20,-20,'in front of the iris','start',20,'400')+leader(150,-14,283,190)
b+=label(400,-20,'A patch covers the tube','start',20)+leader(430,-12,400,54)
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

# 9. laser iridotomy: narrow angle before, open angle after
PURPLE='#6d28d9'
b='<clipPath id="il"><rect x="0" y="0" width="396" height="400"/></clipPath><clipPath id="ir"><rect x="404" y="0" width="396" height="400"/></clipPath>'
b+=f'<marker id="ahp" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="{PURPLE}"/></marker>'
b+=f'<marker id="ahb" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="{BLUE}"/></marker>'
T='translate(-10,96) scale(0.72)'; T2='translate(394,96) scale(0.72)'
push=''.join(f'<path d="M338,{y} L312,{y-1}" stroke="{PURPLE}" stroke-width="3.5" fill="none" stroke-linecap="round" marker-end="url(#ahp)"/>' for y in (214,250))
a=f'stroke="{BLUE}" stroke-width="4" fill="none" stroke-linecap="round" marker-end="url(#ahb)"'
flow_lpi=f'<path d="M342,184 C326,180 310,174 284,164" {a}/><path d="M270,156 C268,144 276,134 288,126" {a}/>'
b+=f'<g clip-path="url(#il)"><g transform="{T}">{eye(iris=iris_strip(1), behind=behind_iris(1))}{push}</g></g>'
b+=f'<g clip-path="url(#ir)"><g transform="{T2}">{eye(iris=iris_strip(0,True))}{flow_lpi}</g></g>'
def P(x,y,right=False):  # eye coordinates -> figure coordinates
    return ((394 if right else -10)+x*0.72, 96+y*0.72)
b+=label(200,34,'Narrow angle','middle',24,'700')+label(604,34,'After laser iridotomy','middle',24,'700')
x,y=P(292,120); b+=label(20,84,'Drain crowded','start',20,'600','#b91c1c')+label(20,108,'by the iris','start',20,'400','#b91c1c')+leader(120,114,x,y)
x,y=P(330,232); b+=label(262,300,'Fluid trapped','start',20,'600',PURPLE)+label(262,324,'behind the iris','start',20,'400',PURPLE)+leader(258,292,x,y)
x,y=P(*iris_sides(1)[0][24]); b+=label(60,372,'Iris','end',20)+leader(66,366,x,y)
x,y=P(420,330); b+=label(330,372,'Lens','start',20)+leader(326,366,x-6,y)
x,y=P(294,116,True); b+=label(424,84,'Drain open','start',20,'600','#15803d')+leader(500,92,x,y)
x,y=P(301,170,True); b+=label(650,268,'Opening in','start',20,'600',BLUE)+label(650,292,'the iris: fluid','start',20,'400',BLUE)+label(650,316,'passes','start',20,'400',BLUE)+label(650,340,'through','start',20,'400',BLUE)+leader(646,260,x+8,y+2)
b+=f'<line x1="400" y1="10" x2="400" y2="390" stroke="#e5e7eb" stroke-width="2"/>'
figs['iridotomy']=('A narrow drainage angle before laser iridotomy, and the open angle after it',800,400,b)

# 10. YAG capsulotomy: cloudy capsule behind the implant, then the laser opening
def capsule(th0):  # the cloudy back of the capsule, from angle th0 (degrees above the axis) upward
    x0=385+100*math.cos(math.radians(th0)); y0=400-222*math.sin(math.radians(th0))
    s=f'<path d="M{x0:.1f},{y0:.1f} A100,222 0 0,0 442,218" fill="none" stroke="#94a3b8" stroke-width="9" stroke-linecap="round"/>'
    for th in range(max(th0,4),54,7):
        x=385+100*math.cos(math.radians(th)); y=400-222*math.sin(math.radians(th))
        s+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.2"/>'
    return s
b='<clipPath id="yl"><rect x="0" y="0" width="396" height="400"/></clipPath><clipPath id="yr"><rect x="404" y="0" width="396" height="400"/></clipPath>'
b+=f'<g clip-path="url(#yl)"><g transform="{T}">{eye("iol")}{capsule(0)}</g></g>'
laser=f'<path d="M150,380 L470,380" stroke="#16a34a" stroke-width="5" marker-end="url(#ahg)"/>'
b+=f'<g clip-path="url(#yr)"><g transform="{T2}">{eye("iol")}{capsule(20)}{laser}</g></g>'
b+=label(200,34,'Cloudy capsule','middle',24,'700')+label(604,34,'After YAG laser','middle',24,'700')
x,y=P(385,330); b+=label(14,84,'Lens implant','start',20)+leader(84,92,x,y)
x,y=P(462,262); b+=label(390,70,'Cloudy capsule','end',20,'600','#475569')+label(390,94,'behind the implant','end',20,'400','#475569')+leader(330,102,x,y)
x,y=P(250,290); b+=label(60,372,'Iris','end',20)+leader(66,366,P(274,280)[0],P(274,280)[1])
x,y=P(483,372,True); b+='<g stroke="#fff" stroke-width="6" paint-order="stroke" stroke-linejoin="round">'+label(790,236,'Opening in','end',20,'600',BLUE)+label(790,260,'the capsule','end',20,'400',BLUE)+'</g>'+leader(752,268,x,y)
b+=label(412,356,'Laser','start',22,'700','#15803d')
b+=f'<line x1="400" y1="10" x2="400" y2="390" stroke="#e5e7eb" stroke-width="2"/>'
figs['yag-capsulotomy']=('A cloudy capsule behind the lens implant, and the clear opening the YAG laser makes in it',800,400,b)

# ---------- dry eye ----------
SKIN='#f1c7a8'; SKIN_D='#b07d5b'; OIL='#f59e0b'; WATER='#93c5fd'
def front_eye(cx,cy,w=150,up=92,down=92,iris=58):
    """An open eye seen from the front (the patient's right eye: nose to the viewer's right)."""
    e=f'M{cx-w},{cy} Q{cx},{cy-up*1.9} {cx+w},{cy} Q{cx},{cy+down*1.9} {cx-w},{cy} Z'
    s=f'<clipPath id="fe{cx}"><path d="{e}"/></clipPath><path d="{e}" fill="#ffffff" stroke="{INK}" stroke-width="3"/>'
    s+=f'<g clip-path="url(#fe{cx})"><circle cx="{cx}" cy="{cy}" r="{iris}" fill="#5b8bb5" stroke="#2c4f6e" stroke-width="2"/><circle cx="{cx}" cy="{cy}" r="{iris*0.4:.0f}" fill="#111827"/><circle cx="{cx+14}" cy="{cy-16}" r="7" fill="#ffffff"/></g>'
    s+=f'<path d="M{cx-w},{cy} Q{cx},{cy-up*1.9} {cx+w},{cy}" fill="none" stroke="{INK}" stroke-width="5"/>'
    return s
def wavy(x,y,color='#64748b'):
    return f'<path d="M{x},{y} q-8,-11 0,-22 q8,-11 0,-22" fill="none" stroke="{color}" stroke-width="2.5" stroke-linecap="round" marker-end="url(#ahm)"/>'
MARK=f'<marker id="ahm" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker>'

# 11. where tears come from and where they go
cx,cy=330,250
b=MARK
b+=f'<path d="M150,128 C170,84 250,70 300,96 C282,120 220,150 172,160 Z" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2"/>'  # tear gland, up and out
b+=front_eye(cx,cy)
for i in range(-4,5):   # oil gland openings along both lid margins
    x=cx+i*30; yy=86*(1-(i*30/150)**2)
    b+=f'<circle cx="{x}" cy="{cy-yy+3:.0f}" r="3.2" fill="{OIL}" stroke="#92400e" stroke-width="1"/><circle cx="{x}" cy="{cy+yy-3:.0f}" r="3.2" fill="{OIL}" stroke="#92400e" stroke-width="1"/>'
a_=f'stroke="{BLUE}" stroke-width="4" fill="none" stroke-linecap="round"'
b+=f'<path d="M230,150 C250,176 262,196 268,214" {a_} marker-end="url(#ah)"/><path d="M396,250 C420,250 440,250 458,250" {a_} marker-end="url(#ah)"/>'
b+=f'<circle cx="470" cy="238" r="4.5" fill="{INK}"/><circle cx="470" cy="262" r="4.5" fill="{INK}"/>'  # puncta
b+=f'<path d="M470,238 C500,226 520,236 530,250 M470,262 C500,274 520,264 530,250" fill="none" stroke="#1d4ed8" stroke-width="5" stroke-linecap="round"/>'
b+=f'<path d="M530,236 C548,236 552,262 546,290 C540,330 548,370 560,404" fill="none" stroke="#1d4ed8" stroke-width="9" stroke-linecap="round"/><path d="M530,236 C548,236 552,262 546,290 C540,330 548,370 560,404" fill="none" stroke="#dbeafe" stroke-width="4" stroke-linecap="round"/>'
b+=label(20,40,'Tear gland','start',22)+label(20,66,'makes the watery tears','start',20,'400')+leader(150,48,206,110)
b+=label(20,330,'Oil glands','start',22)+label(20,356,'in both eyelids:','start',20,'400')+label(20,380,'their openings line','start',20,'400')+label(20,404,'the lid edges','start',20,'400')+leader(150,338,238,318)
b+=label(520,150,'Drain openings','start',22)+label(520,176,'at the inner corner','start',20,'400')+leader(540,186,474,234)
b+=label(590,380,'To the nose','start',22)+leader(586,374,558,384)
b+=label(480,40,'Tears sweep across the eye','middle',20,'600',BLUE)+label(480,64,'with each blink','middle',20,'400',BLUE)
figs['tear-system']=('Where tears come from and where they go: the tear gland, the oil glands in the eyelids, and the drains at the inner corner',760,430,b)

# 12. an oil gland in the eyelid: working, and blocked
def lid_panel(ox, blocked):
    s=''
    # the eye's surface below, with its tear film
    s+=f'<rect x="{ox+30}" y="330" width="320" height="56" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>'
    s+=f'<rect x="{ox+30}" y="{318 if blocked else 306}" width="320" height="{12 if blocked else 24}" fill="{WATER}"/>'
    if not blocked: s+=f'<line x1="{ox+30}" y1="306" x2="{ox+350}" y2="306" stroke="{OIL}" stroke-width="6" stroke-linecap="round"/>'
    else: s+=f'<line x1="{ox+30}" y1="318" x2="{ox+350}" y2="318" stroke="{OIL}" stroke-width="4" stroke-dasharray="14 40" stroke-linecap="round"/>'
    # the eyelid, cut through, hanging over the eye
    s+=f'<path d="M{ox+120},40 L{ox+260},40 L{ox+260},250 Q{ox+260},290 {ox+220},290 L{ox+160},290 Q{ox+120},290 {ox+120},250 Z" fill="{SKIN}" stroke="{SKIN_D}" stroke-width="2"/>'
    if blocked: s+=f'<path d="M{ox+160},290 L{ox+220},290 Q{ox+252},290 {ox+258},262 L{ox+122},262 Q{ox+128},290 {ox+160},290 Z" fill="#f87171" opacity="0.55"/>'
    for k in range(3): s+=f'<path d="M{ox+136+k*10},288 q-14,16 -30,{18+k*4}" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>'  # lashes at the front edge
    gw=26 if blocked else 16
    s+=f'<path d="M{ox+210-gw},90 Q{ox+210},60 {ox+210+gw},90 L{ox+210+gw},230 Q{ox+210},262 {ox+210-gw},230 Z" fill="{"#fbbf24" if blocked else "#fde68a"}" stroke="#b45309" stroke-width="2"/>'
    s+=f'<path d="M{ox+210},250 L{ox+210},290" stroke="#b45309" stroke-width="7" stroke-linecap="round"/><path d="M{ox+210},250 L{ox+210},{280 if blocked else 290}" stroke="#fde68a" stroke-width="3.5" stroke-linecap="round"/>'
    if blocked:
        s+=f'<ellipse cx="{ox+210}" cy="289" rx="10" ry="7" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>'
        for k in range(3): s+=wavy(ox+70+k*36,300)
        s+=wavy(ox+300,300)+wavy(ox+336,300)
    else:
        s+=f'<path d="M{ox+210},292 C{ox+210},300 {ox+214},304 {ox+226},305" fill="none" stroke="{OIL}" stroke-width="5" stroke-linecap="round"/>'
    return s
b=MARK+lid_panel(0,False)+lid_panel(400,True)
b+=label(200,28,'Working gland','middle',24,'700')+label(600,28,'Blocked gland','middle',24,'700')
b+=label(20,120,'Eyelid','start',20)+leader(86,114,130,120)
b+=label(300,150,'Oil gland','start',20)+leader(296,144,228,150)
b+=label(20,220,'Lashes','start',20)+leader(60,228,108,300)
b+=label(360,290,'Oil spreads','end',18,'600','#b45309')
b+=label(190,372,'Surface of the eye','middle',18,'600','#1e3a8a')+label(590,372,'Surface of the eye','middle',18,'600','#1e3a8a')
b+=label(700,150,'Thick oil','start',20,'600','#92400e')+label(700,174,'plugs the','start',20,'400')+label(700,198,'opening','start',20,'400')+leader(696,190,622,286)
b+=label(416,200,'Tears','start',20,'600','#475569')+label(416,224,'evaporate','start',20,'400','#475569')
b+=label(790,312,'Red, sore lid edge','end',18,'600','#b91c1c')
b+=f'<line x1="400" y1="10" x2="400" y2="392" stroke="#e5e7eb" stroke-width="2"/>'
figs['eyelid-glands']=('An oil gland in the eyelid: a working gland spreads oil over the tears, and a blocked gland lets them evaporate',800,400,b)

# 13. punctal plug
cx,cy=300,200
b=front_eye(cx,cy,170,88,88,62)
b+=f'<path d="M{cx-170},{cy} Q{cx},{cy+167} {cx+170},{cy} Q{cx},{cy+122} {cx-170},{cy} Z" fill="{WATER}" opacity="0.9"/>'  # tears pooled along the lower lid
b+=f'<path d="M{cx-170},{cy} Q{cx},{cy+167} {cx+170},{cy}" fill="none" stroke="{INK}" stroke-width="3"/>'
b+=f'<circle cx="{cx+150}" cy="{cy-16}" r="5" fill="{INK}"/>'
b+=f'<path d="M{cx+150},{cy-16} C{cx+190},{cy-30} {cx+214},{cy-14} {cx+226},{cy+4} M{cx+152},{cy+22} C{cx+190},{cy+34} {cx+214},{cy+22} {cx+226},{cy+4}" fill="none" stroke="#1d4ed8" stroke-width="5" stroke-linecap="round" opacity="0.5"/>'
b+=f'<path d="M{cx+226},{cy-8} C{cx+244},{cy-8} {cx+248},{cy+20} {cx+242},{cy+50} C{cx+236},{cy+90} {cx+244},{cy+130} {cx+256},{cy+170}" fill="none" stroke="#1d4ed8" stroke-width="9" stroke-linecap="round" opacity="0.4"/>'
b+=f'<g><rect x="{cx+141}" y="{cy+12}" width="22" height="9" rx="4.5" fill="#0f9b8e" stroke="#0b6b62" stroke-width="2"/><rect x="{cx+147}" y="{cy+19}" width="10" height="16" rx="4" fill="#0f9b8e" stroke="#0b6b62" stroke-width="2"/></g>'
b+=label(540,70,'Upper drain','start',20)+label(540,94,'left open','start',20,'400')+leader(536,76,cx+156,cy-16)
b+=label(560,250,'Plug in the','start',22,'600','#0b6b62')+label(560,276,'lower drain','start',22,'600','#0b6b62')+label(560,302,'opening','start',22,'600','#0b6b62')+leader(556,256,cx+166,cy+22)
b+=label(30,360,'Your own tears stay','start',22,'600',BLUE)+label(30,386,'on the eye longer','start',22,'400',BLUE)+leader(232,352,cx-20,cy+73)
b+=label(590,388,'To the nose','start',18,'400',MUTED)
figs['punctal-plug']=('A punctal plug: a tiny plug in the drain opening at the inner corner keeps your own tears on the eye longer',760,410,b)

# 14. the lash line: clean, crusted, and with the sleeves Demodex leaves
def lash_panel(ox, kind):
    s=f'<path d="M{ox+16},70 L{ox+234},70 L{ox+234},150 Q{ox+125},176 {ox+16},150 Z" fill="{SKIN}" stroke="{SKIN_D}" stroke-width="2"/>'
    if kind!='clean': s+=f'<path d="M{ox+16},128 L{ox+234},128 L{ox+234},150 Q{ox+125},176 {ox+16},150 Z" fill="#f87171" opacity="0.45"/>'
    for i in range(5):
        x=ox+45+i*40; y0=156+ (8 if i in (1,2,3) else 3)
        s+=f'<path d="M{x},{y0} C{x-4},{y0+50} {x-18},{y0+92} {x-34},{y0+118}" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
        if kind=='crust':
            for (dx,dy,r) in [(-2,6,6),(4,20,5),(-8,38,4.5),(-4,-4,5)]:
                s+=f'<ellipse cx="{x+dx}" cy="{y0+dy}" rx="{r+2}" ry="{r}" fill="#fef3c7" stroke="#b45309" stroke-width="1.2" transform="rotate({(i*37+dy)%60-30} {x+dx} {y0+dy})"/>'
        if kind=='sleeve':
            s+=f'<path d="M{x-7},{y0-4} L{x+7},{y0-4} L{x+3},{y0+30} L{x-9},{y0+30} Z" fill="#fde68a" stroke="#92400e" stroke-width="1.5" opacity="0.92"/>'
    return s
b=lash_panel(0,'clean')+lash_panel(255,'crust')+lash_panel(510,'sleeve')
b+=label(125,34,'Healthy','middle',22,'700')+label(380,34,'At the lashes','middle',22,'700')+label(635,34,'Demodex','middle',22,'700')
b+=label(125,330,'Clean lash line','middle',19,'400',MUTED)+label(380,330,'Crusts and flakes','middle',19,'400',MUTED)+label(380,354,'on the lashes','middle',19,'400',MUTED)+label(635,330,'Waxy sleeves around','middle',19,'400',MUTED)+label(635,354,'the base of each lash','middle',19,'400',MUTED)
b+=label(24,100,'Lid edge','start',17,'600')
b+=f'<line x1="252" y1="50" x2="252" y2="360" stroke="#e5e7eb" stroke-width="2"/><line x1="508" y1="50" x2="508" y2="360" stroke="#e5e7eb" stroke-width="2"/>'
figs['lash-line']=('The lash line close up: healthy, with crusts and flakes, and with the waxy sleeves that Demodex mites leave',765,370,b)

# 15. stye and chalazion
def lid_eye(cx,cy):
    s=f'<path d="M{cx-190},{cy+6} Q{cx},{cy-250} {cx+190},{cy+6} Q{cx},{cy-178} {cx-190},{cy+6} Z" fill="{SKIN}" stroke="{SKIN_D}" stroke-width="2"/>'  # upper lid skin
    return s+front_eye(cx,cy,150,88,80,54)
b=lid_eye(200,250)+lid_eye(600,250)
b+=f'<circle cx="150" cy="178" r="15" fill="#ef4444" stroke="#991b1b" stroke-width="2"/><circle cx="150" cy="178" r="5" fill="#fef3c7"/>'   # stye at the lash line
b+=f'<ellipse cx="640" cy="140" rx="30" ry="22" fill="#eab08c" stroke="{SKIN_D}" stroke-width="2.5"/><path d="M620,132 Q640,118 660,132" fill="none" stroke="#fff" stroke-width="3" opacity="0.6" stroke-linecap="round"/>'  # chalazion in the lid
b+=label(200,34,'Stye','middle',24,'700')+label(600,34,'Chalazion','middle',24,'700')
b+=label(20,96,'Red, tender bump','start',19,'600','#b91c1c')+label(20,120,'at the lash line','start',19,'400')+leader(96,128,140,168)
b+=label(420,96,'Firm, usually painless','start',19,'600')+label(420,120,'lump in the lid','start',19,'400')+leader(560,116,618,134)
b+=label(200,372,'An infected lash follicle or gland;','middle',18,'400',MUTED)+label(200,394,'comes up over a day or two','middle',18,'400',MUTED)
b+=label(600,372,'A blocked oil gland;','middle',18,'400',MUTED)+label(600,394,'can last for weeks','middle',18,'400',MUTED)
b+=f'<line x1="400" y1="10" x2="400" y2="400" stroke="#e5e7eb" stroke-width="2"/>'
figs['stye-chalazion']=('A stye is a red, tender bump at the lash line; a chalazion is a firm lump in the lid from a blocked oil gland',800,410,b)

# 16. an allergic eye
cx,cy=330,235
b=f'<path d="M{cx-200},{cy+10} Q{cx},{cy-280} {cx+200},{cy+10} Q{cx},{cy-170} {cx-200},{cy+10} Z" fill="#f6b8a6" stroke="{SKIN_D}" stroke-width="2"/>'   # puffy upper lid
b+=f'<path d="M{cx-190},{cy+4} Q{cx},{cy+250} {cx+190},{cy+4} Q{cx},{cy+160} {cx-190},{cy+4} Z" fill="#f6b8a6" stroke="{SKIN_D}" stroke-width="2"/>'  # puffy lower lid
b+=front_eye(cx,cy,150,84,78,52)
v='fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round"'
for (d_) in [f'M{cx-140},{cy} C{cx-116},{cy-10} {cx-96},{cy-2} {cx-64},{cy-8}', f'M{cx-128},{cy+18} C{cx-104},{cy+26} {cx-86},{cy+18} {cx-62},{cy+20}', f'M{cx-116},{cy-22} C{cx-98},{cy-30} {cx-82},{cy-22} {cx-66},{cy-26}',
            f'M{cx+140},{cy} C{cx+116},{cy-10} {cx+96},{cy-2} {cx+64},{cy-8}', f'M{cx+128},{cy+18} C{cx+104},{cy+26} {cx+86},{cy+18} {cx+62},{cy+20}', f'M{cx+116},{cy-22} C{cx+98},{cy-30} {cx+82},{cy-22} {cx+66},{cy-26}']:
    b+=f'<path d="{d_}" {v}/>'
b+=f'<path d="M{cx+110},{cy+46} c10,16 10,28 0,30 c-10,-2 -10,-14 0,-30 Z" fill="#60a5fa" stroke="#1d4ed8" stroke-width="1.5"/>'
for (px,py) in [(120,70),(190,40),(520,60),(590,110),(90,150)]:
    b+=f'<g transform="translate({px},{py})" fill="#facc15" stroke="#a16207" stroke-width="1.5"><circle r="9"/><circle r="3" cx="-10"/><circle r="3" cx="10"/><circle r="3" cy="-10"/><circle r="3" cy="10"/></g>'
b+=label(20,250,'Itching','start',22,'700','#b45309')+label(20,276,'the main symptom','start',19,'400')
b+=label(560,200,'Red,','start',22,'600','#b91c1c')+label(560,226,'both eyes','start',19,'400')+leader(556,206,cx+120,cy-4)
b+=label(560,330,'Watering,','start',22,'600',BLUE)+label(560,356,'stringy mucus','start',19,'400')+leader(556,324,cx+114,cy+66)
b+=label(20,380,'Puffy lids','start',22,'600')+leader(120,372,cx-110,cy+92)
b+=label(250,40,'Pollen, dust, pet dander','start',19,'600','#a16207')
figs['eye-allergy']=('An allergic eye: itching, redness in both eyes, watering and puffy lids, set off by pollen, dust or pet dander',760,420,b)

# ---------- retina ----------
# The whole eye cut in half, front to the left (the same drawing as globe() in
# static/js/procedure-retina.js), and the back of the eye as the doctor sees it.
def gpt(deg,r,cx=330,cy=220):
    a=math.radians(deg); return (cx+r*math.cos(a), cy+r*math.sin(a))
def globe(cx=330,cy=220):
    f=gpt(-140,172,cx,cy); bk=gpt(140,172,cx,cy); n0=gpt(17,150,cx,cy); n1=gpt(17,262,cx,cy)
    s=f'<line x1="{n0[0]:.1f}" y1="{n0[1]:.1f}" x2="{n1[0]:.1f}" y2="{n1[1]:.1f}" stroke="#ca8a04" stroke-width="40"/><line x1="{n0[0]:.1f}" y1="{n0[1]:.1f}" x2="{n1[0]:.1f}" y2="{n1[1]:.1f}" stroke="#fde68a" stroke-width="34"/>'
    s+=f'<path d="M{f[0]:.1f},{f[1]:.1f} Q{cx-238},{cy} {bk[0]:.1f},{bk[1]:.1f} Z" fill="#dbeafe" stroke="#3b82f6" stroke-width="3"/>'
    s+=f'<circle cx="{cx}" cy="{cy}" r="170" fill="#e0f2fe"/>'
    s+=f'<path d="M{f[0]:.1f},{f[1]:.1f} A172,172 0 1,1 {bk[0]:.1f},{bk[1]:.1f}" fill="none" stroke="#6b7280" stroke-width="4"/>'
    r0=gpt(-128,162,cx,cy); r1=gpt(128,162,cx,cy)
    s+=f'<path d="M{r0[0]:.1f},{r0[1]:.1f} A162,162 0 1,1 {r1[0]:.1f},{r1[1]:.1f}" fill="none" stroke="#fb923c" stroke-width="9" stroke-linecap="round"/>'
    s+=f'<circle cx="{cx+160}" cy="{cy}" r="6" fill="#9a3412"/>'
    s+=f'<line x1="{cx-117}" y1="{cy-94}" x2="{cx-104}" y2="{cy-32}" stroke="#8b5e3c" stroke-width="9" stroke-linecap="round"/><line x1="{cx-104}" y1="{cy+32}" x2="{cx-117}" y2="{cy+94}" stroke="#8b5e3c" stroke-width="9" stroke-linecap="round"/>'
    s+=f'<ellipse cx="{cx-78}" cy="{cy}" rx="26" ry="60" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/>'
    return s
def fundus(cx,cy,r=150,extra='',uid='a'):
    k=r/190.0
    def X(x): return cx+(x-280)*k
    def Y(y): return cy+(y-210)*k
    def path(pts): return ' '.join(f'{c}{X(x):.0f},{Y(y):.0f}' for c,x,y in pts)
    s=f'<clipPath id="fu{uid}"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath><circle cx="{cx}" cy="{cy}" r="{r}" fill="#ea580c"/><circle cx="{cx}" cy="{cy}" r="{r}" fill="#fb923c" opacity="0.45"/><g clip-path="url(#fu{uid})">'
    s+=f'<circle cx="{X(250):.0f}" cy="{Y(212):.0f}" r="{40*k:.0f}" fill="#9a3412" opacity="0.45"/><circle cx="{X(250):.0f}" cy="{Y(212):.0f}" r="{12*k:.0f}" fill="#7c2d12" opacity="0.6"/>'
    for pts in [[('M',372,196),('C',340,120),(' ',250,80),(' ',120,110)],[('M',372,224),('C',340,300),(' ',250,340),(' ',120,312)],[('M',380,196),('C',420,140),(' ',450,110),(' ',480,70)],[('M',380,224),('C',420,280),(' ',450,310),(' ',480,350)]]:
        s+=f'<path d="{path(pts)}" fill="none" stroke="#991b1b" stroke-width="{5*k:.1f}" stroke-linecap="round"/>'
    s+=extra+'</g>'
    s+=f'<circle cx="{X(376):.0f}" cy="{Y(210):.0f}" r="{26*k:.0f}" fill="#fde68a" stroke="#f59e0b" stroke-width="2"/><circle cx="{X(376):.0f}" cy="{Y(210):.0f}" r="{9*k:.0f}" fill="#fef9c3"/>'
    s+=f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#7c2d12" stroke-width="3"/>'
    return s,X,Y

# 17. the parts of the eye that matter for the retina
b=globe()
b+=label(20,40,'Cornea','start',22)+leader(96,46,128,150)
b+=label(20,400,'Lens','start',22)+leader(74,392,246,260)
b+=label(250,424,'Gel (vitreous)','middle',22,'600','#0369a1')+leader(250,402,330,300)
b+=label(700,60,'Retina','end',22,'600','#c2410c')+label(700,84,'the light-sensing layer','end',19,'400')+leader(540,96,gpt(-45,162)[0],gpt(-45,162)[1])
b+=label(700,200,'Macula','end',22,'600','#9a3412')+label(700,224,'center of vision','end',19,'400')+leader(612,190,492,218)
b+=label(700,360,'Optic nerve','end',22)+label(700,384,'to the brain','end',19,'400')+leader(590,352,gpt(17,230)[0],gpt(17,230)[1])
figs['retina-anatomy']=('The eye cut in half: cornea and lens at the front, the gel filling the eye, the retina lining the back, the macula at its center, and the optic nerve',720,440,b)

# 18. macular degeneration at the back of the eye: normal, dry, wet
b=''
import random
for i,(kind,title,sub) in enumerate([('n','Healthy',''),('d','Dry','yellow deposits (drusen)'),('w','Wet','leaking vessels, bleeding')]):
    cx=135+i*265; extra=''
    f,X,Y=fundus(cx,200,118,'',uid='m'+kind)
    if kind in ('d','w'):
        rnd=random.Random(4)
        dots=''.join(f'<circle cx="{X(250+rnd.uniform(-58,58)):.0f}" cy="{Y(212+rnd.uniform(-50,50)):.0f}" r="{rnd.uniform(3,7):.1f}" fill="#fde047" opacity="0.95"/>' for _ in range(16 if kind=='d' else 8))
        if kind=='w': dots+=f'<ellipse cx="{X(256):.0f}" cy="{Y(214):.0f}" rx="34" ry="26" fill="#7f1d1d" opacity="0.85"/><ellipse cx="{X(250):.0f}" cy="{Y(212):.0f}" rx="50" ry="40" fill="#bfdbfe" opacity="0.4"/>'
        f,X,Y=fundus(cx,200,118,dots,uid='m'+kind)
    b+=f
    b+=label(cx,44,title,'middle',24,'700')+label(cx,352,sub,'middle',19,'400',MUTED)
b+=label(135,352,'even color at the macula','middle',19,'400',MUTED)
figs['amd-fundus']=('The back of the eye in macular degeneration: healthy, dry with yellow drusen at the macula, and wet with bleeding and fluid',800,370,b)

# 19. the Amsler grid: normal and with a change
def amsler(ox,oy,size,on):
    n=20; s=f'<rect x="{ox}" y="{oy}" width="{size}" height="{size}" fill="#fff"/>'; k=size/400.0
    def warp(x,y):
        if not on: return x,y
        dx=x-250; dy=y-160; g=math.exp(-(dx*dx+dy*dy)/3200)
        return x+dx*0.42*g+9*g*math.sin(y/16), y+dy*0.42*g+9*g*math.sin(x/16)
    for i in range(n+1):
        for vert in (True,False):
            pts=[]
            for t in range(0,401,5):
                x,y=warp(i*20,t) if vert else warp(t,i*20)
                pts.append(f'{ox+x*k:.1f},{oy+y*k:.1f}')
            s+=f'<path d="M{" L".join(pts)}" fill="none" stroke="{INK}" stroke-width="{2.2 if i in (0,n) else 1}"/>'
    if on: s+=f'<ellipse cx="{ox+262*k:.0f}" cy="{oy+150*k:.0f}" rx="{46*k:.0f}" ry="{36*k:.0f}" fill="#9ca3af" opacity="0.6"/>'
    s+=f'<circle cx="{ox+size/2}" cy="{oy+size/2}" r="4.5" fill="{INK}"/>'
    return s
b=amsler(40,60,300,False)+amsler(420,60,300,True)
b+=label(190,36,'Normal','middle',24,'700')+label(570,36,'Call the same day','middle',24,'700','#b91c1c')
b+=label(190,392,'All lines straight, no gaps','middle',19,'400',MUTED)+label(570,392,'Wavy lines, or a blurred or missing patch','middle',19,'400',MUTED)
figs['amsler-grid']=('The Amsler grid: with normal vision every line is straight; wavy lines or a missing patch are a reason to call the same day',760,410,b)

# 20. diabetic retinopathy at the back of the eye: early and advanced
b=''
for i,(kind,title,sub) in enumerate([('e','Early','small spots of bleeding; no symptoms'),('a','Advanced','new vessels and bleeding')]):
    cx=200+i*400; rnd=random.Random(9)
    f,X,Y=fundus(cx,205,150,'',uid='d'+kind)
    ex=''.join(f'<circle cx="{X(130+rnd.uniform(0,300)):.0f}" cy="{Y(80+rnd.uniform(0,260)):.0f}" r="3" fill="#7f1d1d"/>' for _ in range(14))
    ex+=''.join(f'<ellipse cx="{X(120+rnd.uniform(0,300)):.0f}" cy="{Y(70+rnd.uniform(0,280)):.0f}" rx="{rnd.uniform(6,12):.0f}" ry="{rnd.uniform(4,8):.0f}" fill="#7f1d1d" opacity="0.85"/>' for _ in range(5 if kind=='e' else 10))
    if kind=='a':
        ex+=''.join(f'<circle cx="{X(250+44*math.cos(j/12*6.283)):.0f}" cy="{Y(212+36*math.sin(j/12*6.283)):.0f}" r="{3+j%3}" fill="#fef08a"/>' for j in range(12))
        for (x1,y1,x2,y2,x3,y3) in [(392,190,406,170,426,154),(398,196,420,186,444,180),(388,186,390,164,400,140),(400,204,420,206,448,214),(390,232,404,250,426,264),(396,226,416,234,440,240)]:
            ex+=f'<path d="M{X(x1):.0f},{Y(y1):.0f} Q{X(x2):.0f},{Y(y2):.0f} {X(x3):.0f},{Y(y3):.0f}" fill="none" stroke="#b91c1c" stroke-width="2" stroke-linecap="round"/>'
        ex+=f'<path d="M{X(150):.0f},{Y(270):.0f} C{X(210):.0f},{Y(250):.0f} {X(330):.0f},{Y(262):.0f} {X(430):.0f},{Y(290):.0f} C{X(440):.0f},{Y(350):.0f} {X(380):.0f},{Y(400):.0f} {X(280):.0f},{Y(400):.0f} C{X(200):.0f},{Y(400):.0f} {X(140):.0f},{Y(350):.0f} {X(150):.0f},{Y(270):.0f} Z" fill="#7f1d1d" opacity="0.75"/>'
    f,X,Y=fundus(cx,205,150,ex,uid='d'+kind)
    b+=f+label(cx,36,title,'middle',24,'700')+label(cx,392,sub,'middle',19,'400',MUTED)
figs['diabetic-fundus']=('The back of the eye in diabetic retinopathy: early, with small spots of bleeding, and advanced, with new vessels, deposits at the macula and bleeding',800,410,b)

# ---------- cornea ----------
EPI='#e9d5ff'; EPI_S='#7c3aed'; STROMA='#dbeafe'; ENDO='#a7f3d0'; ENDO_S='#047857'
def cornea_slab(x,y,w,eh=40,sh=150,endo=True,lines=True):
    s=f'<rect x="{x}" y="{y+eh}" width="{w}" height="{sh}" fill="{STROMA}" stroke="#3b82f6" stroke-width="2"/>'
    if lines: s+=''.join(f'<line x1="{x+4}" y1="{yy}" x2="{x+w-4}" y2="{yy}" stroke="#93c5fd" stroke-width="1.2"/>' for yy in range(y+eh+14,y+eh+sh-6,14))
    s+=f'<rect x="{x}" y="{y}" width="{w}" height="{eh}" fill="{EPI}" stroke="{EPI_S}" stroke-width="2"/>'
    if endo: s+=''.join(f'<rect x="{x+1+i*26}" y="{y+eh+sh}" width="24" height="16" rx="5" fill="{ENDO}" stroke="{ENDO_S}" stroke-width="1.5"/>' for i in range(int(w//26)))
    return s

# 21. the layers of the cornea, and what goes wrong in each
b=cornea_slab(230,90,312)
b+=f'<line x1="230" y1="84" x2="542" y2="84" stroke="#60a5fa" stroke-width="5" stroke-linecap="round"/>'
b+=label(20,60,'Tear film','start',20,'600','#1d4ed8')+leader(110,66,236,84)
b+=label(20,116,'Surface cells','start',20,'600',EPI_S)+label(20,140,'scratches, erosions','start',18,'400',MUTED)+leader(170,112,238,110)
b+=label(20,206,'Clear middle layer','start',20,'600','#1d4ed8')+label(20,230,'keratoconus, scars,','start',18,'400',MUTED)+label(20,252,'infections','start',18,'400',MUTED)+leader(200,202,238,204)
b+=label(20,300,'Pump cells','start',20,'600',ENDO_S)+label(20,324,'Fuchs dystrophy','start',18,'400',MUTED)+leader(140,296,240,290)
b+=label(386,340,'Inside of the eye','middle',18,'400',MUTED)
b+=label(386,30,'The cornea, about half a millimeter thick','middle',20,'600')
figs['cornea-layers']=('The layers of the cornea, front to back: tear film, surface cells, the clear middle layer and the pump cells, with the conditions that affect each',720,360,b)

# 22. two kinds of corneal transplant
b=cornea_slab(40,110,320)+cornea_slab(440,110,320)
b+=f'<rect x="130" y="104" width="140" height="218" fill="#fde68a" opacity="0.55" stroke="#b45309" stroke-width="3" stroke-dasharray="8 6"/>'
for sx in range(130,271,28): b+=f'<path d="M{sx-6},100 l12,10 m0,-10 l-12,10" stroke="{INK}" stroke-width="1.8"/>'
b+=f'<rect x="440" y="298" width="320" height="22" fill="#fde68a" opacity="0.7" stroke="#b45309" stroke-width="3" stroke-dasharray="8 6"/>'
b+=label(200,40,'Full-thickness transplant','middle',22,'700')+label(200,66,'all layers replaced, held with stitches','middle',18,'400',MUTED)
b+=label(600,40,'Partial-thickness transplant','middle',22,'700')+label(600,66,'only the pump layer replaced; no stitches','middle',18,'400',MUTED)
b+=label(200,360,'For scars and advanced keratoconus','middle',18,'400',MUTED)+label(600,360,'For Fuchs dystrophy and other pump failure','middle',18,'400',MUTED)
b+=f'<line x1="400" y1="20" x2="400" y2="372" stroke="#e5e7eb" stroke-width="2"/>'
figs['corneal-transplant']=('Two kinds of corneal transplant: full thickness, with stitches, and partial thickness, replacing only the inner pump layer',800,380,b)

# 23. a corneal ulcer
cx,cy=300,215
b=front_eye(cx,cy,170,90,84,70)
v='fill="none" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round"'
for sgn in (-1,1):
    for (dy,c1,c2) in [(-6,-12,-4),(16,24,18),(-24,-32,-24),(34,40,34)]:
        b+=f'<path d="M{cx+sgn*160},{cy+dy} C{cx+sgn*132},{cy+c1} {cx+sgn*110},{cy+c2} {cx+sgn*78},{cy+dy*0.6:.0f}" {v}/>'
b+=f'<ellipse cx="{cx+22}" cy="{cy+14}" rx="20" ry="16" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/><ellipse cx="{cx+22}" cy="{cy+14}" rx="34" ry="28" fill="#e2e8f0" opacity="0.45"/>'
b+=label(560,150,'White spot','start',22,'700')+label(560,176,'on the cornea','start',19,'400')+leader(556,156,cx+36,cy+8)
b+=label(20,90,'Red, painful eye,','start',22,'600','#b91c1c')+label(20,116,'sensitive to light','start',19,'400')+leader(150,124,cx-128,cy-10)
b+=label(20,380,'Same-day care, especially with contact lenses','start',20,'600')
figs['corneal-ulcer']=('A corneal ulcer: a white spot on the cornea in a red, painful, light-sensitive eye, which needs same-day care',760,400,b)

# ---------- cataract and glaucoma, round two ----------
GREEN_D='#15803d'; RED_D='#b91c1c'

# 24. lens implant types, seen from the front, with how each tends to focus
def iol(cx,cy,kind):
    hap=(f'<path d="M{cx+30},{cy-38} C{cx+62},{cy-76} {cx+86},{cy-40} {cx+80},{cy+4}" fill="none" stroke="#0284c7" stroke-width="5" stroke-linecap="round"/>'
         f'<path d="M{cx-30},{cy+38} C{cx-62},{cy+76} {cx-86},{cy+40} {cx-80},{cy-4}" fill="none" stroke="#0284c7" stroke-width="5" stroke-linecap="round"/>')
    s=hap+f'<circle cx="{cx}" cy="{cy}" r="50" fill="#e0f2fe" stroke="#0284c7" stroke-width="3"/>'
    if kind=='toric':
        for sx in (-1,1):
            for d in (30,38,46):
                s+=f'<circle cx="{cx+sx*d}" cy="{cy}" r="2.6" fill="#0369a1"/>'
    elif kind=='multi':
        for r in (11,18,24,30,35,40,44,48):
            s+=f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#0284c7" stroke-width="1.3" opacity="0.8"/>'
    elif kind=='edof':
        for r in (20,34):
            s+=f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#0284c7" stroke-width="1.3" stroke-dasharray="3 3" opacity="0.8"/>'
    return s
def dot(x,y,level):  # 2 clear, 1 partly, 0 glasses usually needed
    if level==2: return f'<circle cx="{x}" cy="{y}" r="9" fill="{GREEN_D}"/>'
    if level==1: return f'<circle cx="{x}" cy="{y}" r="8" fill="#fff" stroke="{GREEN_D}" stroke-width="2.5"/><path d="M{x},{y-8} A8,8 0 0,1 {x},{y+8} Z" fill="{GREEN_D}"/>'
    return f'<circle cx="{x}" cy="{y}" r="8" fill="#fff" stroke="#94a3b8" stroke-width="2.5"/>'
b=''
cols=[('Monofocal','mono',(2,1,0),'the standard lens'),('Toric','toric',(2,1,0),'corrects astigmatism'),
      ('Extended depth','edof',(2,2,1),'mild halos at night'),('Multifocal','multi',(2,2,2),'halos and glare at night')]
for i,(name,kind,lv,note) in enumerate(cols):
    cx=100+i*200
    b+=iol(cx,120,kind)
    b+=label(cx,232,name,'middle',22,'700')+label(cx,256,note,'middle',17,'400',MUTED)
    for j,(d,l) in enumerate(zip(('Far','Arm’s length','Near'),lv)):
        y=296+j*30
        b+=label(cx-62,y+6,d,'start',17,'400')+dot(cx+66,y,l)
    if i: b+=f'<line x1="{i*200}" y1="20" x2="{i*200}" y2="380" stroke="#e5e7eb" stroke-width="2"/>'
b+=dot(186,404,2)+label(200,410,'clear without glasses','start',16,'400',MUTED)
b+=dot(396,404,1)+label(410,410,'often usable','start',16,'400',MUTED)
b+=dot(556,404,0)+label(570,410,'glasses usually needed','start',16,'400',MUTED)
figs['iol-types']=('Four kinds of lens implant seen from the front, and how well each usually sees far, at arm’s length and near without glasses',800,430,b)

# 25. measuring for the lens implant: the eye's length and the curve of the cornea
b=globe(360,230)
b+=f'<line x1="{360-238+44}" y1="420" x2="{360+170}" y2="420" stroke="{BLUE}" stroke-width="4" marker-start="url(#ah)" marker-end="url(#ah)"/>'
b+=f'<line x1="{360-238+44}" y1="230" x2="{360-238+44}" y2="430" stroke="{BLUE}" stroke-width="1.5" stroke-dasharray="4 4"/><line x1="{360+170}" y1="230" x2="{360+170}" y2="430" stroke="{BLUE}" stroke-width="1.5" stroke-dasharray="4 4"/>'
b+=label(360,460,'Eye length','middle',22,'700',BLUE)
f0=gpt(-140,172,360,230); f1=gpt(140,172,360,230)
b+=f'<path d="M{f0[0]-22:.1f},{f0[1]-10:.1f} Q{360-238-26},230 {f1[0]-22:.1f},{f1[1]+10:.1f}" fill="none" stroke="#16a34a" stroke-width="4" stroke-dasharray="7 6"/>'
b+=label(20,60,'Curve of the cornea','start',22,'700','#15803d')+leader(120,68,f0[0]-28,f0[1]+8)
b+=label(560,40,'These two numbers','start',20,'600')+label(560,64,'set the power of','start',20,'400')+label(560,88,'the lens implant','start',20,'400')
figs['iol-measure']=('Before cataract surgery the length of the eye and the curve of the cornea are measured, which sets the power of the lens implant',760,480,b)

# 26. glaucoma suspect: pressure and the nerve are separate questions
def small_disc(cx,cy,cup,k=0.5):
    return f'<g transform="translate({cx},{cy}) scale({k}) translate({-200},{-190})">{disc(200,190,cup)}</g>'
b=''
b+=label(330,40,'Normal pressure','middle',22,'700')+label(590,40,'High pressure','middle',22,'700')
b+=label(150,150,'Healthy','end',22,'700')+label(150,174,'nerve','end',22,'400')
b+=label(150,350,'Damaged','end',22,'700')+label(150,374,'nerve','end',22,'400')
cells=[(330,150,30,'Normal','',INK),(590,150,30,'Ocular hypertension','watched, sometimes treated','#b45309'),
       (330,350,74,'Normal-tension glaucoma','treated','#b91c1c'),(590,350,74,'Glaucoma','treated','#b91c1c')]
for (cx,cy,cup,t,sub,c) in cells:
    b+=f'<rect x="{cx-125}" y="{cy-92}" width="250" height="190" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>'
    b+=small_disc(cx,cy-18,cup,0.42)
    b+=label(cx,cy+66,t,'middle',19,'700',c)
    if sub: b+=label(cx,cy+88,sub,'middle',16,'400',MUTED)
figs['glaucoma-suspect']=('Eye pressure and the optic nerve are separate questions: normal, ocular hypertension, normal-tension glaucoma and glaucoma',760,460,b)

# 27. where each kind of glaucoma drop works
GREEN='#16a34a'
side=f'<path d="M330,152 C350,140 372,128 410,104 C450,86 520,74 600,70" stroke="{GREEN}" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="9 6" marker-end="url(#ahg)"/>'
main=f'<path d="M270,150 C280,132 288,122 300,114" stroke="{BLUE}" stroke-width="4" fill="none" stroke-linecap="round" marker-end="url(#ah)"/>'
b=eye()+side+main
b+=label(20,-50,'Main drain (meshwork)','start',20,'700',BLUE)+label(20,-26,'netarsudil, pilocarpine,','start',18,'400')+label(20,-4,'latanoprostene bunod','start',18,'400')+leader(150,4,296,110)
b+=label(470,-50,'Side drain','start',20,'700','#15803d')+label(470,-26,'prostaglandins: latanoprost,','start',18,'400')+label(470,-4,'travoprost, bimatoprost,','start',18,'400')+label(470,18,'tafluprost; also omidenepag','start',18,'400')+leader(560,26,540,72)
b+=label(500,170,'Faucet (ciliary body)','start',20,'700','#b45454')+label(500,194,'makes less fluid:','start',18,'400')+label(500,216,'timolol (beta blockers),','start',18,'400')+label(500,238,'brimonidine, dorzolamide,','start',18,'400')+label(500,260,'brinzolamide, and the','start',18,'400')+label(500,282,'acetazolamide pills','start',18,'400')+leader(496,176,392,118)
figs['glaucoma-drops']=('Where each kind of glaucoma drop works: the faucet that makes fluid, the main drain and the side drain',760,420+DY,shifted(b))

# 28. open, narrow and closed angles, close up
def angle_panel(ox,bow,closed=False):
    s=f'<clipPath id="ap{ox}"><rect x="{ox}" y="40" width="250" height="300"/></clipPath>'
    body=eye(iris=iris_strip(bow), behind=behind_iris(bow) if bow else '')
    if closed:  # the outer iris pressed up against the drain, covering it
        front,_=iris_sides(bow)
        f=front[5]
        body+=(f'<path d="M287,99 C295,96 304,96 311,101 L313,127 L{f[0]+6:.1f},{f[1]:.1f} '
               f'C{f[0]-6:.1f},{f[1]-14:.1f} 284,124 283,108 Z" fill="#8b5e3c" stroke="#5c3d26" stroke-width="1.5" stroke-linejoin="round"/>')
    s+=f'<g clip-path="url(#ap{ox})"><g transform="translate({ox+125},190) scale(1.15) translate(-300,-170)">{body}</g></g>'
    s+=f'<rect x="{ox}" y="40" width="250" height="300" fill="none" stroke="#e5e7eb" stroke-width="2" rx="10"/>'
    return s
b=angle_panel(10,0)+angle_panel(275,1)+angle_panel(540,1,True)
b+=label(135,28,'Open angle','middle',22,'700')+label(400,28,'Narrow angle','middle',22,'700')+label(665,28,'Closed angle','middle',22,'700')
b+=label(135,372,'Fluid reaches','middle',18,'400',GREEN_D)+label(135,394,'the drain','middle',18,'400',GREEN_D)
b+=label(400,372,'The iris bows forward','middle',18,'400','#b45309')+label(400,394,'and crowds the drain','middle',18,'400','#b45309')
b+=label(665,372,'The iris covers the drain:','middle',18,'400',RED_D)+label(665,394,'pressure can rise fast','middle',18,'400',RED_D)
figs['angle-types']=('The drainage angle close up: open, narrow with the iris crowding the drain, and closed with the iris covering it',800,410,b)

# 29. pseudoexfoliation and pigment dispersion, seen from the front
def big_pupil_eye(cx,cy):
    e=f'M{cx-160},{cy} Q{cx},{cy-175} {cx+160},{cy} Q{cx},{cy+175} {cx-160},{cy} Z'
    s=f'<clipPath id="bp{cx}"><path d="{e}"/></clipPath><path d="{e}" fill="#ffffff" stroke="{INK}" stroke-width="3"/>'
    return s,f'url(#bp{cx})'
b=''
cx,cy=200,200
s,clip=big_pupil_eye(cx,cy)
s+=f'<g clip-path="{clip}"><circle cx="{cx}" cy="{cy}" r="80" fill="#8b5e3c" stroke="#5c3d26" stroke-width="2"/><circle cx="{cx}" cy="{cy}" r="52" fill="#1f2937"/>'
s+=f'<circle cx="{cx}" cy="{cy}" r="22" fill="#e5e7eb" opacity="0.85"/>'
import random
rnd=random.Random(7)
for k in range(46):
    a=rnd.uniform(0,2*math.pi); r=rnd.uniform(38,50)
    s+=f'<circle cx="{cx+r*math.cos(a):.1f}" cy="{cy+r*math.sin(a):.1f}" r="{rnd.uniform(1.6,3.2):.1f}" fill="#f1f5f9"/>'
for k in range(14):
    a=rnd.uniform(0,2*math.pi); r=rnd.uniform(52,57)
    s+=f'<circle cx="{cx+r*math.cos(a):.1f}" cy="{cy+r*math.sin(a):.1f}" r="2" fill="#f1f5f9"/>'
s+='</g>'
s+=f'<path d="M{cx-160},{cy} Q{cx},{cy-175} {cx+160},{cy}" fill="none" stroke="{INK}" stroke-width="5"/>'
b+=s
b+=label(cx,40,'Pseudoexfoliation','middle',24,'700')
b+=label(cx,360,'White, flaky material on the lens,','middle',18,'400')+label(cx,382,'seen when the pupil is dilated','middle',18,'400')
cx=600
s,clip=big_pupil_eye(cx,cy)
s+=f'<g clip-path="{clip}"><circle cx="{cx}" cy="{cy}" r="80" fill="#5b8bb5" stroke="#2c4f6e" stroke-width="2"/>'
for k in range(16):
    a=k*2*math.pi/16+0.1; x0=cx+44*math.cos(a); y0=cy+44*math.sin(a); x1=cx+62*math.cos(a); y1=cy+62*math.sin(a)
    s+=f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}" stroke="#dbeafe" stroke-width="4" stroke-linecap="round" opacity="0.9"/>'
s+=f'<circle cx="{cx}" cy="{cy}" r="30" fill="#111827"/>'
s+=f'<ellipse cx="{cx}" cy="{cy+6}" rx="7" ry="44" fill="#92400e" opacity="0.55"/></g>'
s+=f'<path d="M{cx-160},{cy} Q{cx},{cy-175} {cx+160},{cy}" fill="none" stroke="{INK}" stroke-width="5"/>'
b+=s
b+=label(cx,40,'Pigment dispersion','middle',24,'700')
b+=label(792,84,'Thin spots','end',17,'600')+label(792,104,'in the iris','end',17,'400')+leader(744,110,cx+52,cy-28)
b+=label(cx,360,'Pigment rubbed off the iris settles on','middle',18,'400')+label(cx,382,'the cornea and in the drain','middle',18,'400')
b+=label(452,300,'Pigment on','end',17,'600')+label(452,320,'the cornea','end',17,'400')+leader(456,300,cx-4,cy+30)
b+=f'<line x1="400" y1="20" x2="400" y2="390" stroke="#e5e7eb" stroke-width="2"/>'
figs['glaucoma-types']=('Two eyes seen from the front: pseudoexfoliation, with flaky material on the lens, and pigment dispersion, with thin spots in the iris and pigment on the cornea',800,400,b)


# ---------- retina, round two ----------
# 30. a slice through the macula, as an OCT scan shows it: normal, a membrane, a hole
def macula_panel(ox, kind):
    W=240; c=ox+W/2; ty=120; by=200; N=80
    def top(x):
        if kind=='erm':   # pit flattened, surface pulled into folds, retina thickened
            return ty-28*math.exp(-((x-c)/75)**2)+3.4*math.sin((x-ox)/5.5)*math.exp(-((x-c)/90)**2)
        d=36*math.exp(-((x-c)/26)**2)
        if kind=='hole': d=-10*math.exp(-((x-c)/34)**2)  # edges lifted and swollen around the hole
        return ty+d
    xs=[ox+W*i/N for i in range(N+1)]
    s=f'<clipPath id="mp{ox}"><rect x="{ox}" y="40" width="{W}" height="200" rx="10"/></clipPath><g clip-path="url(#mp{ox})">'
    s+=f'<rect x="{ox}" y="40" width="{W}" height="200" fill="#f0f9ff"/>'  # gel above
    s+=f'<rect x="{ox}" y="{by}" width="{W}" height="40" fill="#c2410c"/><rect x="{ox}" y="{by}" width="{W}" height="6" fill="#7c2d12"/>'
    if kind=='hole':
        g=16
        for side in (-1,1):
            pts=[x for x in xs if (x<=c-g if side<0 else x>=c+g)]
            edge=c+side*g
            path='M'+' L'.join(f'{x:.1f},{top(x):.1f}' for x in (pts if side<0 else pts))
            if side<0: path+=f' L{edge:.1f},{top(edge)+8:.1f} C{edge+4:.1f},{(top(edge)+by)/2:.1f} {edge+2:.1f},{by-14:.1f} {edge+6:.1f},{by:.1f} L{ox},{by} Z'
            else: path=f'M{edge-6:.1f},{by} C{edge-2:.1f},{by-14:.1f} {edge-4:.1f},{(top(edge)+by)/2:.1f} {edge:.1f},{top(edge)+8:.1f} '+'L'+' L'.join(f'{x:.1f},{top(x):.1f}' for x in pts)+f' L{ox+W},{by} Z'
            s+=f'<path d="{path}" fill="#fecdd3" stroke="#be123c" stroke-width="1.5" stroke-linejoin="round"/>'
            for (dx,dy,rx) in [(14,10,6),(26,22,5),(12,34,4)]:
                s+=f'<ellipse cx="{edge-side*dx:.1f}" cy="{top(edge-side*dx)+dy:.1f}" rx="{rx}" ry="{rx*0.7:.1f}" fill="#f0f9ff" stroke="#be123c" stroke-width="0.8"/>'
        s+=f'<ellipse cx="{c:.1f}" cy="{ty-34}" rx="9" ry="4" fill="#fecdd3" stroke="#be123c" stroke-width="1"/>'
    else:
        path='M'+' L'.join(f'{x:.1f},{top(x):.1f}' for x in xs)+f' L{ox+W},{by} L{ox},{by} Z'
        s+=f'<path d="{path}" fill="#fecdd3" stroke="#be123c" stroke-width="1.5" stroke-linejoin="round"/>'
        if kind=='erm':
            mem='M'+' L'.join(f'{x:.1f},{top(x)-3:.1f}' for x in xs if abs(x-c)<95)
            s+=f'<path d="{mem}" fill="none" stroke="#f8fafc" stroke-width="5" stroke-linecap="round"/><path d="{mem}" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round"/>'
    s+='</g>'+f'<rect x="{ox}" y="40" width="{W}" height="200" rx="10" fill="none" stroke="#e5e7eb" stroke-width="2"/>'
    return s
b=macula_panel(10,'normal')+macula_panel(280,'erm')+macula_panel(550,'hole')
b+=label(130,28,'Healthy macula','middle',22,'700')+label(400,28,'Membrane (pucker)','middle',22,'700')+label(670,28,'Macular hole','middle',22,'700')
b+=label(130,268,'A small dip at the center','middle',17,'400',MUTED)+label(130,290,'of vision','middle',17,'400',MUTED)
b+=label(400,268,'A film on the surface','middle',17,'400',MUTED)+label(400,290,'wrinkles and thickens it','middle',17,'400',MUTED)
b+=label(670,268,'A gap through the','middle',17,'400',MUTED)+label(670,290,'center of the retina','middle',17,'400',MUTED)
b+=label(22,64,'Gel','start',16,'600','#0369a1')+label(22,186,'Retina','start',16,'600','#be123c')
figs['macula-slice']=('A slice through the macula: healthy with a small central dip, wrinkled and thickened by a membrane on its surface, and with a full-thickness hole at its center',800,300,b)

# 31. retinal vein occlusion: a branch and the central vein
def flames(X,Y,rnd,pts,n,spread):
    s=''
    for _ in range(n):
        x,y,ang=pts[rnd.randrange(len(pts))]
        x+=rnd.uniform(-spread,spread); y+=rnd.uniform(-spread,spread)
        s+=f'<ellipse cx="{X(x):.1f}" cy="{Y(y):.1f}" rx="{rnd.uniform(7,13):.1f}" ry="{rnd.uniform(2.5,4):.1f}" transform="rotate({ang:.0f} {X(x):.1f} {Y(y):.1f})" fill="#7f1d1d" opacity="0.85"/>'
    return s
def along(p0,p1,p2,p3,n):  # points along a cubic, with the direction of the curve
    out=[]
    for i in range(1,n):
        t=i/n; mt=1-t
        x=mt**3*p0[0]+3*mt*mt*t*p1[0]+3*mt*t*t*p2[0]+t**3*p3[0]
        y=mt**3*p0[1]+3*mt*mt*t*p1[1]+3*mt*t*t*p2[1]+t**3*p3[1]
        dx=3*mt*mt*(p1[0]-p0[0])+6*mt*t*(p2[0]-p1[0])+3*t*t*(p3[0]-p2[0]); dy=3*mt*mt*(p1[1]-p0[1])+6*mt*t*(p2[1]-p1[1])+3*t*t*(p3[1]-p2[1])
        out.append((x,y,math.degrees(math.atan2(dy,dx))))
    return out
ARC=[((372,196),(340,120),(250,80),(120,110)),((372,224),(340,300),(250,340),(120,312)),((380,196),(420,140),(450,110),(480,70)),((380,224),(420,280),(450,310),(480,350))]
b=''
for i,(kind,title,sub) in enumerate([('b','Branch vein','bleeding in one part of the retina'),('c','Central vein','bleeding everywhere, swollen nerve')]):
    cx=200+i*400; rnd=random.Random(11+i)
    _,X,Y=fundus(cx,205,150,'',uid='v'+kind)
    arcs=ARC[:1] if kind=='b' else ARC
    ex=''
    for a in arcs:
        ex+=flames(X,Y,rnd,along(*a,14),24 if kind=='b' else 22,16)
    if kind=='c':
        ex+=f'<circle cx="{X(376):.0f}" cy="{Y(210):.0f}" r="{40*150/190:.0f}" fill="#fde68a" opacity="0.55"/>'
        ex+=''.join(f'<circle cx="{X(rnd.uniform(140,460)):.0f}" cy="{Y(rnd.uniform(90,330)):.0f}" r="4" fill="#f8fafc" opacity="0.8"/>' for _ in range(6))
    else:
        ex+=f'<circle cx="{X(250):.0f}" cy="{Y(212):.0f}" r="{30*150/190:.0f}" fill="#fde68a" opacity="0.25"/>'
    f,X,Y=fundus(cx,205,150,ex,uid='v'+kind)
    b+=f+label(cx,36,title,'middle',24,'700')+label(cx,392,sub,'middle',19,'400',MUTED)
figs['vein-occlusion']=('The back of the eye after a retinal vein blockage: a branch vein, with bleeding in one part of the retina, and the central vein, with bleeding everywhere and a swollen optic nerve',800,410,b)

for name,(title,w,h,body) in figs.items():
    open(os.path.join(OUT,name+'.svg'),'w').write(svg(w,h,body,title))
    print(name, os.path.getsize(os.path.join(OUT,name+'.svg')),'bytes')
