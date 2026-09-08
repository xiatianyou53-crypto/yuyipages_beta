# Generates minimal valid placeholder PDF files with correct xref offsets.
$ErrorActionPreference = 'Stop'
$ascii = [System.Text.Encoding]::ASCII

function New-SamplePdf([string]$Path, [string]$Line1, [string]$Line2) {
    $objs = New-Object System.Collections.Generic.List[string]
    $objs.Add('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj')
    $objs.Add('2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj')
    $objs.Add('3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj')
    $stream = "BT /F1 20 Tf 70 700 Td ($Line1) Tj 0 -36 Td ($Line2) Tj 0 -36 Td (Placeholder file - replace with your real issue PDF.) Tj ET"
    $objs.Add("4 0 obj<</Length $($ascii.GetByteCount($stream))>>stream`r`n$stream`r`nendstream`r`nendobj")
    $objs.Add('5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj')

    $header = '%PDF-1.4'
    $body = New-Object System.Collections.Generic.List[byte]
    # header line + eol
    $hd = $ascii.GetBytes($header + "`r`n")
    $body.AddRange($hd)

    $offsets = New-Object System.Collections.Generic.List[int]
    foreach ($o in $objs) {
        $offsets.Add($body.Count)
        $bytes = $ascii.GetBytes($o + "`r`n")
        $body.AddRange($bytes)
    }
    # xref
    $xrefStart = $body.Count
    $n = $objs.Count + 1
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine('xref')
    [void]$sb.Append("0 $n`r`n")
    [void]$sb.AppendLine('0000000000 65535 f ')
    foreach ($off in $offsets) {
        [void]$sb.Append(('{0:D10}' -f $off))
        [void]$sb.AppendLine(' 00000 n ')
    }
    $trailer = "trailer<</Size $n/Root 1 0 R>>startxref`r`n$xrefStart`r`n%%EOF"
    [void]$sb.AppendLine($trailer)
    $tail = $ascii.GetBytes($sb.ToString())
    $tailBytes = New-Object System.Collections.Generic.List[byte]
    $tailBytes.AddRange($tail)

    $final = New-Object System.Collections.Generic.List[byte]
    $final.AddRange($body)
    $final.AddRange($tailBytes)
    [System.IO.File]::WriteAllBytes($Path, $final.ToArray())
    Write-Output "Wrote $Path ($($final.Count) bytes)"
}

$base = 'd:\yuyipages\static\uploads'
New-SamplePdf (Join-Path $base '2024-issue-58.pdf') 'LNSY Yuyi Newspaper - No.58' 'Golden Autumn Sports Special 2024'
New-SamplePdf (Join-Path $base '2024-issue-57.pdf') 'LNSY Yuyi Newspaper - No.57' 'Graduation Season Special 2024'
New-SamplePdf (Join-Path $base '2023-issue-50.pdf') 'LNSY Yuyi Newspaper - No.50' 'New Year Special 2023'
