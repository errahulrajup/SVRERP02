$src = "D:\SVRERP\SVRERP02_Implementation_Plan_v2.docx"
$dest = "D:\SVRERP\scratch\docx_extract"

# Clean and re-extract
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }

# Docx is just a zip
Copy-Item $src "D:\SVRERP\scratch\plan_v2.zip" -Force
Expand-Archive -Path "D:\SVRERP\scratch\plan_v2.zip" -DestinationPath $dest -Force

# Read the XML
$xml = Get-Content "$dest\word\document.xml" -Raw -Encoding UTF8

# Strip XML tags to get plain text
$text = [System.Text.RegularExpressions.Regex]::Replace($xml, '<[^>]+>', ' ')
$text = [System.Text.RegularExpressions.Regex]::Replace($text, '\s+', ' ')
$text = $text.Trim()

# Output
$text | Out-File "D:\SVRERP\scratch\plan_v2_text.txt" -Encoding UTF8
Write-Host "Done. Character count: $($text.Length)"
Write-Host "---BEGIN---"
Write-Host $text.Substring(0, [Math]::Min(8000, $text.Length))
