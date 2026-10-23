import xml.etree.ElementTree as ET, json, os, sys, shutil, re
src=sys.argv[1]
out=sys.argv[2]
files=[]
for f in ET.parse(src+'/files.xml').getroot():
    d={c.tag:c.text for c in f}
    if d.get('component')=='mod_hvp' and d.get('filename')!='.': files.append(d)
for a in sorted(os.listdir(src+'/activities')):
    if not a.startswith('hvp_'): continue
    root=ET.parse(f'{src}/activities/{a}/hvp.xml').getroot()
    h=root.find('hvp'); hid=h.get('id')
    mn=h.findtext('machine_name'); maj=h.findtext('major_version'); mi=h.findtext('minor_version')
    jc=h.findtext('json_content')
    params=json.loads(jc)
    d=f'{out}/{a}'; os.makedirs(d+'/content/images',exist_ok=True)
    json.dump(params,open(d+'/content/content.json','w'),ensure_ascii=False)
    # collect used libraries
    libs=set(re.findall(r'"library"\s*:\s*"([A-Za-z0-9.]+ \d+\.\d+)"',jc))
    libs.add(f'{mn} {maj}.{mi}')
    json.dump({'mainLibrary':mn,'major':maj,'minor':mi,'libs':sorted(libs),'name':h.findtext('name'),'hid':hid},open(d+'/meta.json','w'),ensure_ascii=False,indent=1)
    for fl in files:
        if fl['itemid']==hid:
            ch=fl['contenthash']; dst=d+'/content'+fl['filepath']+fl['filename']
            shutil.copy(f'{src}/files/{ch[:2]}/{ch}',dst); print(a,'image',dst)
    print(a,mn,maj,mi,sorted(libs))
