# Windows version of seed-data.sh
# Usage:  .\scripts\seed-data.ps1 [ui-url]     default http://localhost:8080
# Safe to run again: existing doctors are reused and fresh slots are added.
param([string]$Base = "http://localhost:8080")

$login = Invoke-RestMethod -Method Post -Uri "$Base/api/auth/login" -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin123"}'
$h = @{ Authorization = "Bearer $($login.token)" }

function Add-Doctor($body) {
  try {
    (Invoke-RestMethod -Method Post -Uri "$Base/api/doctors" -Headers $h -ContentType "application/json" -Body $body).id
  } catch {
    # already exists - find it by email
    $email = ($body | ConvertFrom-Json).email
    (Invoke-RestMethod -Uri "$Base/api/doctors" | Where-Object { $_.email -eq $email }).id
  }
}

$ids = @(
  (Add-Doctor '{"name":"Dr. Anita Rao","specialization":"Cardiology","email":"anita.rao@medislot.in","phone":"9876543210","consultationFee":800}'),
  (Add-Doctor '{"name":"Dr. Imran Qureshi","specialization":"Dermatology","email":"imran.q@medislot.in","phone":"9988776655","consultationFee":500}'),
  (Add-Doctor '{"name":"Dr. Kavitha Menon","specialization":"Paediatrics","email":"kavitha.m@medislot.in","phone":"9445012345","consultationFee":600}'),
  (Add-Doctor '{"name":"Dr. Sandeep Ghosh","specialization":"Orthopaedics","email":"sandeep.g@medislot.in","phone":"9830098300","consultationFee":750}')
)
Write-Host "doctors: $ids"

$times = @(@("10:00","10:20"), @("10:20","10:40"), @("10:40","11:00"), @("17:00","17:20"))
foreach ($id in $ids) {
  foreach ($offset in 1, 2, 3) {
    $day = (Get-Date).AddDays($offset).ToString("yyyy-MM-dd")
    foreach ($t in $times) {
      $body = @{ date = $day; startTime = $t[0]; endTime = $t[1] } | ConvertTo-Json
      try {
        Invoke-RestMethod -Method Post -Uri "$Base/api/doctors/$id/slots" -Headers $h -ContentType "application/json" -Body $body | Out-Null
      } catch { }   # slot already there
    }
  }
}
Write-Host "done"
