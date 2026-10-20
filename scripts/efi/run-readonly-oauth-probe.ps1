# Safe, local, OAuth-only Efí PRODUCTION mTLS test on Windows.
# No credentials are written to files or command-line arguments.
$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Instale o Node.js 20 ou superior.'
}
Write-Host 'NextGen / Efí: somente OAuth, sem Pix ou movimentação.'
Write-Host 'Use a aplicação ativa e o certificado P12 da mesma conta Efí de produção.'
$id=Read-Host 'Client ID'
$secret=Read-Host 'Client Secret' -AsSecureString
$certPath=Read-Host 'Caminho absoluto do arquivo .p12 já salvo'
$p12Password=Read-Host 'Senha do P12 (Enter se não tiver)' -AsSecureString
$p1=[IntPtr]::Zero
$p2=[IntPtr]::Zero
$status=3
try {
  $p1=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  $p2=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($p12Password)
  $env:NEXTGEN_EFI_PROBE_CONFIRM='OAUTH_ONLY_EFI_PRODUCTION'
  $env:NEXTGEN_EFI_PROBE_CLIENT_ID=$id
  $env:NEXTGEN_EFI_PROBE_CLIENT_SECRET=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p1)
  $env:NEXTGEN_EFI_PROBE_P12_PATH=(Resolve-Path -LiteralPath $certPath).Path
  $env:NEXTGEN_EFI_PROBE_P12_PASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p2)
  & node (Join-Path $PSScriptRoot 'verify-readonly-oauth.mjs')
  $status=$LASTEXITCODE
} finally {
  if($p1 -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p1)}
  if($p2 -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p2)}
  @('NEXTGEN_EFI_PROBE_CONFIRM','NEXTGEN_EFI_PROBE_CLIENT_ID',
    'NEXTGEN_EFI_PROBE_CLIENT_SECRET','NEXTGEN_EFI_PROBE_P12_PATH',
    'NEXTGEN_EFI_PROBE_P12_PASSWORD') |
    ForEach-Object {Remove-Item ('Env:' + $_) -ErrorAction SilentlyContinue}
}
exit $status
