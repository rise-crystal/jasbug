# Test Auto-Expire API - PowerShell Script
# Usage: .\test-auto-expire.ps1

$BASE_URL = "https://jasbug.vercel.app"

Write-Host "`n🔍 Testing Auto-Expire API..." -ForegroundColor Cyan
Write-Host "URL: $BASE_URL/api/payment/auto-expire`n" -ForegroundColor Yellow

# Test 1: GET Request (Preview)
Write-Host "📋 Test 1: GET Request (Preview expired orders)" -ForegroundColor Green
Write-Host "---------------------------------------------------" -ForegroundColor DarkGray
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/payment/auto-expire" -Method Get
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Expired Count: $($response.expiredCount)" -ForegroundColor White
    if ($response.expiredCount -gt 0) {
        Write-Host "`nOrders that will expire:" -ForegroundColor Yellow
        $response.expiredOrders | ForEach-Object {
            Write-Host "  - Custom ID: $($_.custom_id)" -ForegroundColor White
            Write-Host "    Created: $($_.created_at)" -ForegroundColor Gray
            Write-Host "    Minutes Ago: $($_.minutesAgo)`n" -ForegroundColor Gray
        }
    } else {
        Write-Host "No orders need to be expired." -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
    Write-Host "Response: $_.Exception.Response" -ForegroundColor DarkGray
}

# Test 2: POST Request (Execute)
Write-Host "`n⚡ Test 2: POST Request (Execute auto-expire)" -ForegroundColor Green
Write-Host "---------------------------------------------------" -ForegroundColor DarkGray
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/payment/auto-expire" -Method Post -ContentType "application/json"
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Message: $($response.message)" -ForegroundColor White
    Write-Host "Expired Count: $($response.expiredCount)" -ForegroundColor White
    if ($response.expiredCount -gt 0) {
        Write-Host "`nExpired Orders:" -ForegroundColor Yellow
        $response.expiredOrders | ForEach-Object {
            Write-Host "  ✓ $($_.custom_id) - $($_.previousStatus) → $($_.newStatus)" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Test 3: Verify
Write-Host "`n✅ Test 3: Verify no more expired orders" -ForegroundColor Green
Write-Host "---------------------------------------------------" -ForegroundColor DarkGray
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/payment/auto-expire" -Method Get
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Remaining expired orders: $($response.expiredCount)" -ForegroundColor White
    if ($response.expiredCount -eq 0) {
        Write-Host "🎉 All expired orders have been processed!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

Write-Host "`n✨ Testing complete!`n" -ForegroundColor Cyan
