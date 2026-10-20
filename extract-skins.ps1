$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$namesPath = Join-Path $projectRoot 'names.txt'
$skinDirectory = Join-Path $projectRoot 'images-examples'

if (-not (Test-Path -LiteralPath $namesPath -PathType Leaf)) {
    throw "Username list not found: $namesPath"
}

# Read the complete list before changing the skin directory. Ignore blank lines,
# which a bot may leave while updating the text file.
$usernames = @(Get-Content -LiteralPath $namesPath | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($usernames.Count -eq 0) {
    throw "No usernames were found in $namesPath; existing skins were left untouched."
}

if (-not (Test-Path -LiteralPath $skinDirectory -PathType Container)) {
    New-Item -ItemType Directory -Path $skinDirectory | Out-Null
}

# Only clear this project's real images-examples directory. Refuse links so a
# recursive removal cannot follow a junction or symlink outside the project.
$resolvedProjectRoot = [System.IO.Path]::GetFullPath($projectRoot).TrimEnd('\')
$resolvedSkinDirectory = [System.IO.Path]::GetFullPath($skinDirectory).TrimEnd('\')
$skinParent = [System.IO.Path]::GetDirectoryName($resolvedSkinDirectory)
if (-not [string]::Equals($skinParent, $resolvedProjectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clear an unexpected directory: $resolvedSkinDirectory"
}

$skinItem = Get-Item -LiteralPath $resolvedSkinDirectory -Force
if ($skinItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
    throw "Refusing to clear a linked directory: $resolvedSkinDirectory"
}

$allExistingItems = @(Get-ChildItem -LiteralPath $resolvedSkinDirectory -Force -Recurse)
foreach ($item in $allExistingItems) {
    $resolvedItem = [System.IO.Path]::GetFullPath($item.FullName)
    $insideSkinDirectory = $resolvedItem.StartsWith($resolvedSkinDirectory + '\', [System.StringComparison]::OrdinalIgnoreCase)
    if (-not $insideSkinDirectory -or ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
        throw "Refusing to clear an unexpected or linked item: $resolvedItem"
    }
}

$existingEntries = @(Get-ChildItem -LiteralPath $resolvedSkinDirectory -Force)
foreach ($entry in $existingEntries) {
    Remove-Item -LiteralPath $entry.FullName -Recurse -Force
}
Write-Host "Cleared $($existingEntries.Count) item(s) from $resolvedSkinDirectory"

$successCount = 0
$failures = [System.Collections.Generic.List[string]]::new()

foreach ($Username in $usernames) {
    $temporaryFile = $null

try {
    if ($Username -notmatch '^[A-Za-z0-9_]{3,16}$') {
        throw 'Username must contain 3–16 letters, numbers, or underscores.'
    }
    # Resolve the username first. Mojang returns a UUID without hyphens.
    $lookupUrl = 'https://api.mojang.com/users/profiles/minecraft/' + [uri]::EscapeDataString($Username)
    $account = Invoke-RestMethod -Uri $lookupUrl -Method Get -TimeoutSec 20
    if (-not $account -or $account.id -notmatch '^[0-9a-fA-F]{32}$') {
        throw "Minecraft account '$Username' was not found or Mojang returned an invalid UUID."
    }

    $uuid = $account.id.ToLowerInvariant()
    $profileUrl = 'https://sessionserver.mojang.com/session/minecraft/profile/' + $uuid
    $profile = Invoke-RestMethod -Uri $profileUrl -Method Get -TimeoutSec 20
    if (-not $profile -or $profile.id -ne $uuid) {
        throw "Mojang returned an unexpected profile for '$Username'."
    }

    $textureProperty = $profile.properties | Where-Object { $_.name -eq 'textures' } | Select-Object -First 1
    if (-not $textureProperty -or -not $textureProperty.value) {
        throw "No skin texture property was returned for '$Username'."
    }

    # The Base64 value contains JSON with a PNG URL, not the PNG itself.
    $textureJson = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($textureProperty.value))
    $textureData = $textureJson | ConvertFrom-Json
    if ($textureData.profileId -ne $uuid -or -not $textureData.textures.SKIN.url) {
        throw "Mojang returned no valid skin URL for '$Username'."
    }

    $skinUri = [uri]$textureData.textures.SKIN.url
    if ($skinUri.Host -ne 'textures.minecraft.net' -or $skinUri.AbsolutePath -notmatch '^/texture/[0-9a-fA-F]{32,128}$') {
        throw "Mojang returned an unexpected skin URL for '$Username'."
    }
    # The texture payload sometimes contains an http URL; use HTTPS to download it.
    $downloadUrl = 'https://textures.minecraft.net' + $skinUri.AbsolutePath

    $temporaryFile = Join-Path $resolvedSkinDirectory ([guid]::NewGuid().ToString('N') + '.download')
    Invoke-WebRequest -Uri $downloadUrl -Method Get -OutFile $temporaryFile -TimeoutSec 30

    # Check the downloaded bytes before replacing an existing skin.
    $png = [System.IO.File]::ReadAllBytes($temporaryFile)
    $signature = [byte[]](137, 80, 78, 71, 13, 10, 26, 10)
    if ($png.Length -lt 24) {
        throw "The downloaded skin for '$Username' is not a valid PNG."
    }
    for ($index = 0; $index -lt $signature.Length; $index++) {
        if ($png[$index] -ne $signature[$index]) {
            throw "The downloaded skin for '$Username' is not a valid PNG."
        }
    }

    $imageWidth = [BitConverter]::ToInt32([byte[]]($png[19], $png[18], $png[17], $png[16]), 0)
    $imageHeight = [BitConverter]::ToInt32([byte[]]($png[23], $png[22], $png[21], $png[20]), 0)
    if ($imageWidth -ne 64 -or $imageHeight -ne 64) {
        throw "The downloaded skin is ${imageWidth}x${imageHeight}; this overlay expects a 64x64 Minecraft skin."
    }

    $accountName = if ($profile.name) { $profile.name } else { $account.name }
    if ($accountName -notmatch '^[A-Za-z0-9_]{3,16}$') {
        throw 'Mojang returned an invalid account name.'
    }
    $outputPath = Join-Path $resolvedSkinDirectory ($accountName + '.png')
    Move-Item -LiteralPath $temporaryFile -Destination $outputPath -Force
    $temporaryFile = $null

    $successCount++
    Write-Host "Saved $accountName ($uuid) skin to $outputPath"
}
catch {
    $failures.Add("${Username}: $($_.Exception.Message)")
    Write-Warning "Could not extract '${Username}': $($_.Exception.Message)"
}
finally {
    if ($temporaryFile -and (Test-Path -LiteralPath $temporaryFile)) {
        Remove-Item -LiteralPath $temporaryFile -Force
    }
}
}

Write-Host "Finished: $successCount of $($usernames.Count) username(s) saved."
if ($failures.Count -gt 0) {
    Write-Error "$($failures.Count) username(s) failed: $($failures -join '; ')"
    exit 1
}

Write-Host 'Run .\generate-skins.ps1, then refresh the OBS browser source to include these skins.'
