# Builds public/index.html from the claude.ai artifact source (../aura-farm.html) + shim.js
import os,sys
here=os.path.dirname(os.path.abspath(__file__))
src=open(os.path.join(here,'..','..','aura-farm.html')).read()
shim=open(os.path.join(here,'shim.js')).read()
def rep(a,b):
    global src
    assert a in src, a[:70]; src=src.replace(a,b,1)
rep("const r=await sample.json(prompt,{modelTier:'quick',cache:false});","const r=await sample.json(prompt,{modelTier:'quick',cache:false,code});")
rep("const note=!db?'Multiplayer needs the shared page: open it from its claude.ai link while signed in.'","const note=!db?'Can\\u2019t reach the game server. Check your connection and refresh.'")
rep("$('joinNote').textContent='Open this from the claude.ai link while signed in to join.'","$('joinNote').textContent='Can\\u2019t reach the game server. Refresh and try again.'")
src=src.replace("Ask the host for edit access to this page.","Connection lost. Refresh the page; your progress is kept.")
src=src.replace("Ask the host for edit access.","Connection lost. Refresh the page; your progress is kept.")
src=src.replace("'You can edit this page, so you can run the game on the projector.'","'You opened the host link, so you can run the game on the projector.'")
head_end=src.index('<style>')
head=src[:head_end]   # <title>, meta, font links
rest=src[head_end:]
script_at=rest.index('<script>')
html=('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n'
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
      +head+'<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}'
      'html[data-conn="down"] .hud{box-shadow:inset 0 -4px 0 #ff4b4b}</style>\n'
      +rest[:rest.index('</style>')+8]+'\n</head><body>\n'
      +rest[rest.index('</style>')+8:script_at]
      +'<script>\n'+shim+'\n</script>\n'
      +rest[script_at:]+'\n</body></html>\n')
os.makedirs(os.path.join(here,'..','public'),exist_ok=True)
open(os.path.join(here,'..','public','index.html'),'w').write(html)
print('built',len(html))
