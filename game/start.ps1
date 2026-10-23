$ErrorActionPreference = 'Stop'
$gameRoot = $PSScriptRoot
$localFolder = Join-Path $gameRoot '.local'
New-Item -ItemType Directory -Path $localFolder -Force | Out-Null
$pythonExe = (Get-Command python -ErrorAction Stop).Source
foreach ($practicePort in 8765..8775) {
    $practiceUrl = "http://127.0.0.1:$practicePort/game/"
    try {
        $health = Invoke-RestMethod -Uri ($practiceUrl + 'health') -TimeoutSec 1
        if ($health.app -eq 'nptel-ai-practice') { Write-Output $practiceUrl; exit 0 }
        continue
    } catch {}
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $practicePort)
    try { $listener.Start(); $listener.Stop() } catch { continue }
    $serverScript = Join-Path $gameRoot 'server.py'
    $process = Start-Process -FilePath $pythonExe -ArgumentList @("`"$serverScript`"", '--port', "$practicePort") -WorkingDirectory $gameRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localFolder 'server-output.log') -RedirectStandardError (Join-Path $localFolder 'server-errors.log') -PassThru
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 200
        try {
            $health = Invoke-RestMethod -Uri ($practiceUrl + 'health') -TimeoutSec 1
            if ($health.app -eq 'nptel-ai-practice') {
                @{pid=$process.Id; port=$practicePort; url=$practiceUrl} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $localFolder 'server.json')
                Write-Output $practiceUrl
                exit 0
            }
        } catch {}
    }
    throw 'The practice server did not start. Check game/.local/server-errors.log.'
}
throw 'Ports 8765 through 8775 are busy. Start server.py with another --port.'
