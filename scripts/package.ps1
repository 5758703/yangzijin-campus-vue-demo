$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$project=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$workspace=Split-Path $project -Parent
$archive=Join-Path $workspace 'output/yangzijin-campus-vue-demo.zip'
New-Item -ItemType Directory -Force (Split-Path $archive -Parent) | Out-Null
$stream=[System.IO.File]::Open($archive,[System.IO.FileMode]::Create)
$zip=[System.IO.Compression.ZipArchive]::new($stream,[System.IO.Compression.ZipArchiveMode]::Create)
try {
  $files=@(foreach($folder in @('src','public','scripts','tests','docs','dist')){Get-ChildItem -LiteralPath (Join-Path $project $folder) -Recurse -File | Where-Object {$_.FullName -notmatch '__pycache__'}})
  $files+=@(foreach($file in @('.gitignore','index.html','package.json','package-lock.json','README.md','start-demo.cmd','vite.config.js')){Get-Item -LiteralPath (Join-Path $project $file)})
  foreach($file in $files){$entry='yangzijin-twin/'+$file.FullName.Substring($project.Length+1).Replace('\','/');[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file.FullName,$entry,[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null}
} finally { $zip.Dispose();$stream.Dispose() }
Get-Item -LiteralPath $archive | Select-Object FullName,Length
