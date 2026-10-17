import json, os
SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'verification', 'scenarios')
def click(t,x,y): return [{'tick':t,'type':'move','x':x,'y':y},{'tick':t+2,'type':'down','x':x,'y':y},{'tick':t+4,'type':'up','x':x,'y':y}]
def tap(t,k,dur=2): return [{'tick':t,'type':'key','key':k,'down':True,'subMs':5},{'tick':t+dur,'type':'key','key':k,'down':False,'subMs':5}]
def write(name,ticks,ev):
    ev=sorted(ev,key=lambda e:e['tick'])
    open(os.path.join(SCRIPTS_DIR, f'{name}.json'),'w').write('{\n"name": "%s",\n"seed": 12345,\n"ticks": %d,\n"events": [\n'%(name,ticks)+',\n'.join('  '+json.dumps(e) for e in ev)+'\n]\n}\n')
if __name__=='__main__':
    ev=[]
    ev+=click(30,300,381)+click(130,300,383)+click(230,124,355)
    ev+=click(290,203,302)          # Raven
    ev+=click(340,302,92)           # Controls (Raven)
    ev+=click(450,301,12)           # Back to menu
    ev+=click(560,300,245)          # PLAY AS VILLAINS
    ev+=click(660,302,92)           # Controls (villain)
    ev+=click(770,301,12)           # Back
    ev+=click(880,302,129)          # Fight
    # fight playable ~1142
    ev+=tap(1200,'KeyP')            # pause popup
    ev+=click(1280,300,49)          # popup Fight: resume
    ev+=tap(1360,'ArrowRight',20)
    ev+=tap(1420,'KeyZ')
    ev+=tap(1480,'KeyP')            # pause again
    ev+=click(1560,300,12)          # popup Back to Menu
    ev+=click(1700,302,129)         # Fight again
    ev+=tap(2100,'Escape')          # Esc in fight -> select screen
    ev+=click(2240,302,92)          # Controls
    ev+=click(2350,300,49)          # Controls screen Fight button
    ev+=tap(2800,'ArrowRight',15)
    write('menus_misc',3000,ev)
