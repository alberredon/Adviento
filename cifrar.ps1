# Cifra todo lo que hay en privado/ y lo deja en datos/, que es lo que se publica.
# Pide la clave al ejecutarlo; no se guarda en ningun archivo.
# (Solo ASCII a proposito: PowerShell 5.1 no lee bien las tildes sin BOM.)
$ErrorActionPreference = 'Stop'
$raiz = $PSScriptRoot
$origen = Join-Path $raiz 'privado'
$destino = Join-Path $raiz 'datos'
$iteraciones = 600000

function Read-Clave($texto) {
  $s = Read-Host $texto -AsSecureString
  (New-Object Net.NetworkCredential('', $s)).Password
}
$clave = $env:ADVIENTO_CLAVE
if (-not $clave) {
  $clave = Read-Clave 'Clave'
  if ($clave -cne (Read-Clave 'Repite la clave')) { throw 'Las claves no coinciden.' }
}
$clave = $clave.Trim().Normalize([Text.NormalizationForm]::FormC)
if ($clave.Length -lt 8) { throw 'La clave debe tener al menos 8 caracteres.' }
if (-not (Test-Path $origen)) { throw 'No existe la carpeta privado.' }

function Set-Llaves([byte[]]$s) {
  $script:sal = $s
  $kdf = New-Object Security.Cryptography.Rfc2898DeriveBytes(
    [Text.Encoding]::UTF8.GetBytes($clave), $s, $iteraciones, [Security.Cryptography.HashAlgorithmName]::SHA256)
  $script:kAes = $kdf.GetBytes(32)
  $script:kMac = $kdf.GetBytes(32)
}
function Get-Mac([byte[]]$b) {
  return ,((New-Object Security.Cryptography.HMACSHA256(,$kMac)).ComputeHash($b))
}
# Con la misma clave se conserva la sal, para que los moviles no vuelvan a pedirla
$reutiliza = $false
$fSal = Join-Path $destino 'clave.json'; $fPrueba = Join-Path $destino 'prueba.bin'
if ((Test-Path $fSal) -and (Test-Path $fPrueba)) {
  Set-Llaves ([Convert]::FromBase64String((Get-Content $fSal -Raw | ConvertFrom-Json).sal))
  $b = [IO.File]::ReadAllBytes($fPrueba)
  $m = [Text.Encoding]::UTF8.GetBytes('prueba') + [byte]0 + $b[0..($b.Length - 33)]
  $reutiliza = [Convert]::ToBase64String((Get-Mac $m)) -ceq [Convert]::ToBase64String($b[($b.Length - 32)..($b.Length - 1)])
}
if (-not $reutiliza) {
  $nueva = New-Object byte[] 16
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($nueva)
  Set-Llaves $nueva
}

function Protect-Datos([string]$nombre, [byte[]]$datos) {
  $aes = [Security.Cryptography.Aes]::Create()
  $aes.KeySize = 256; $aes.Mode = 'CBC'; $aes.Padding = 'PKCS7'
  $aes.Key = $kAes
  # IV derivado del contenido: lo que no cambia se cifra igual y no ensucia Git
  $mi = New-Object IO.MemoryStream
  $p = [Text.Encoding]::UTF8.GetBytes("iv:$nombre"); $mi.Write($p, 0, $p.Length); $mi.WriteByte(0); $mi.Write($datos, 0, $datos.Length)
  $aes.IV = [byte[]](Get-Mac $mi.ToArray())[0..15]
  $c = $aes.CreateEncryptor().TransformFinalBlock($datos, 0, $datos.Length)
  $m = New-Object IO.MemoryStream
  $n = [Text.Encoding]::UTF8.GetBytes($nombre)
  $m.Write($n, 0, $n.Length); $m.WriteByte(0)
  $m.Write($aes.IV, 0, 16); $m.Write($c, 0, $c.Length)
  $mac = (New-Object Security.Cryptography.HMACSHA256(,$kMac)).ComputeHash($m.ToArray())
  $o = New-Object IO.MemoryStream
  $o.Write($aes.IV, 0, 16); $o.Write($c, 0, $c.Length); $o.Write($mac, 0, 32)
  $ruta = Join-Path $destino ($nombre + '.bin')
  [IO.Directory]::CreateDirectory((Split-Path $ruta)) | Out-Null
  [IO.File]::WriteAllBytes($ruta, $o.ToArray())
}

if (Test-Path $destino) { Get-ChildItem $destino -Recurse -File -Include *.bin, clave.json | Remove-Item -Force -Confirm:$false }
Protect-Datos 'prueba' ([Text.Encoding]::UTF8.GetBytes('adviento'))
$total = 0
Get-ChildItem $origen -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($origen.Length + 1).Replace('\', '/')
  $nombre = $rel.Substring(0, $rel.Length - $_.Extension.Length)
  Protect-Datos $nombre ([IO.File]::ReadAllBytes($_.FullName))
  $total++
}
$json = '{"iteraciones":' + $iteraciones + ',"sal":"' + [Convert]::ToBase64String($sal) + '"}'
[IO.File]::WriteAllText((Join-Path $destino 'clave.json'), $json)
"Cifrados $total archivos en datos/ (misma clave: $reutiliza)"
