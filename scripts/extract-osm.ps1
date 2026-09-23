$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
[xml]$osm=Get-Content -Raw -Encoding UTF8 (Join-Path $root 'public/gis/source.osm')
$nodes=@{}
foreach($n in $osm.osm.node){$nodes[[string]$n.id]=@([double]$n.lon,[double]$n.lat)}
$ways=@(foreach($w in $osm.osm.way){
  $tags=@{}; foreach($t in $w.tag){$tags[$t.k]=[string]$t.v}
  @{id=[string]$w.id;tags=$tags;coordinates=@(foreach($nd in $w.nd){,$nodes[[string]$nd.ref]})}
})
$relations=@(foreach($r in $osm.osm.relation){
  $tags=@{}; foreach($t in $r.tag){$tags[$t.k]=[string]$t.v}
  @{id=[string]$r.id;tags=$tags;members=@(foreach($m in $r.member){@{type=[string]$m.type;ref=[string]$m.ref;role=[string]$m.role}})}
})
@{copyright='OpenStreetMap contributors';license='ODbL 1.0';downloadedAt='2026-09-20';source='https://www.openstreetmap.org/api/0.6/map?bbox=119.3880,32.3395,119.4015,32.3507';ways=$ways;relations=$relations} | ConvertTo-Json -Depth 18 -Compress | Set-Content -Encoding utf8 (Join-Path $root 'public/gis/osm-ways.json')
