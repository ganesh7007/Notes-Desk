param(
  [string]$Source = "resources\icon.png",
  [string]$Output = "resources\icon.ico"
)

Add-Type -AssemblyName System.Drawing

# ---------------------------------------------------------------------------
# 1. Source PNG - if it does not exist, draw a default NotesApp icon.
# ---------------------------------------------------------------------------
if (-not (Test-Path $Source)) {
  Write-Host "[make-icon] Source '$Source' not found - drawing a default NotesApp icon (256x256)."

  $size = 256
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  # Rounded-square background (accent violet #8b5cf6 to deep violet #5b21b6)
  $rect = New-Object System.Drawing.Rectangle(6, 6, 244, 244)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $r = 52
  $path.AddArc($rect.X, $rect.Y, $r, $r, 180, 90)
  $path.AddArc($rect.Right - $r, $rect.Y, $r, $r, 270, 90)
  $path.AddArc($rect.Right - $r, $rect.Bottom - $r, $r, $r, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $r, $r, $r, 90, 90)
  $path.CloseFigure()

  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 139, 92, 246),
    [System.Drawing.Color]::FromArgb(255, 91, 33, 182),
    45
  )
  $g.FillPath($grad, $path)

  # White note page (hexagon with a folded top-right corner)
  $page = [System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point(74, 42)),
    (New-Object System.Drawing.Point(146, 42)),
    (New-Object System.Drawing.Point(184, 80)),
    (New-Object System.Drawing.Point(184, 214)),
    (New-Object System.Drawing.Point(74, 214))
  )
  $g.FillPolygon([System.Drawing.Brushes]::White, $page)

  # Fold triangle
  $fold = [System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point(146, 42)),
    (New-Object System.Drawing.Point(184, 80)),
    (New-Object System.Drawing.Point(146, 80))
  )
  $foldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 214, 210, 235))
  $g.FillPolygon($foldBrush, $fold)
  $foldBrush.Dispose()

  # Text lines
  $lineBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 165, 158, 200))
  $lineBrushDark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 139, 92, 246))
  $lw = 9
  $g.FillRectangle($lineBrushDark, 88, 108, 40, $lw)
  $g.FillRectangle($lineBrush, 88, 132, 80, $lw)
  $g.FillRectangle($lineBrush, 88, 156, 70, $lw)
  $g.FillRectangle($lineBrush, 88, 180, 82, $lw)
  $lineBrush.Dispose()
  $lineBrushDark.Dispose()
  $grad.Dispose()
  $path.Dispose()

  $g.Dispose()
  $bmp.Save($Source, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "[make-icon] Created $Source"
} else {
  Write-Host "[make-icon] Using existing $Source"
}

# ---------------------------------------------------------------------------
# 2. Generate a multi-size .ico (PNG-compressed entries - Vista+ / Win7+ safe).
# ---------------------------------------------------------------------------
$base = [System.Drawing.Image]::FromFile($Source)
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$blobs = @()

foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($base, 0, 0, $s, $s)
  $g.Dispose()

  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $blobs += , $ms.ToArray()
  $ms.Dispose()
  $bmp.Dispose()
}
$base.Dispose()

$fs = [System.IO.File]::Create($Output)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([uint16]0)          # reserved
$bw.Write([uint16]1)          # type: icon
$bw.Write([uint16]$sizes.Count)

$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]
  $dim = $s
  if ($s -ge 256) { $dim = 0 }
  $bw.Write([byte]$dim)       # width (0 = 256)
  $bw.Write([byte]$dim)       # height (0 = 256)
  $bw.Write([byte]0)          # palette
  $bw.Write([byte]0)          # reserved
  $bw.Write([uint16]1)        # color planes
  $bw.Write([uint16]32)       # bits per pixel
  $bw.Write([uint32]$blobs[$i].Length)
  $bw.Write([uint32]$offset)
  $offset += $blobs[$i].Length
}
foreach ($b in $blobs) { $bw.Write($b) }
$bw.Close()
$fs.Close()

Write-Host "[make-icon] Created $Output with sizes: $($sizes -join ', ')"
