$ProgressPreference = 'SilentlyContinue'
Write-Host "Downloading Python..."
Invoke-WebRequest -Uri "https://www.nuget.org/api/v2/package/python/3.11.9" -OutFile "python.zip"
Expand-Archive -Path "python.zip" -DestinationPath "python" -Force
& .\python\tools\python.exe -m pip --version

Write-Host "Downloading Node.js..."
Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.14.0/node-v20.14.0-win-x64.zip" -OutFile "node.zip"
Expand-Archive -Path "node.zip" -DestinationPath "node" -Force
& .\node\node-v20.14.0-win-x64\node.exe --version
