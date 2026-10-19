# Replaces the CURRENT database contents with the given dump. Take a backup first.
param([Parameter(Mandatory)][string]$File)
$ErrorActionPreference = 'Stop'
docker cp $File asfit-db:/tmp/restore.dump
docker exec asfit-db pg_restore -U asfit -d asfit --clean --if-exists /tmp/restore.dump
Write-Output "Restored from $File"
