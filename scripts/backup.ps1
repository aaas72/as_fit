# Local backup of the AS_FIT database (custom format). Output: backups/asfit_<stamp>.dump
$ErrorActionPreference = 'Stop'
$stamp = Get-Date -Format "yyyyMMdd_HHmm"
New-Item -ItemType Directory -Force -Path backups | Out-Null
docker exec asfit-db pg_dump -U asfit -d asfit -Fc -f /tmp/asfit.dump
docker cp asfit-db:/tmp/asfit.dump "backups/asfit_$stamp.dump"
Write-Output "Backup written to backups/asfit_$stamp.dump"
