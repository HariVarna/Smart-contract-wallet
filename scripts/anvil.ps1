# Launch local Anvil blockchain node
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting Anvil Local Blockchain for Smart Contract Wallet" -ForegroundColor Cyan
Write-Host "  Chain ID   : 31337" -ForegroundColor Green
Write-Host "  RPC URL    : http://127.0.0.1:8545" -ForegroundColor Green
Write-Host "  Block Time : 1 second" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$anvilCmd = "anvil"
if (Test-Path "$HOME\.foundry\bin\anvil.exe") {
    $anvilCmd = "$HOME\.foundry\bin\anvil.exe"
}

& $anvilCmd --port 8545 --chain-id 31337 --block-time 1 --mnemonic "test test test test test test test test test test test junk"
