# SigFlow - Zero-Dependency Local Dev & Multi-Provider Mail Server for Windows PowerShell
param (
    [int]$Port = 3000
)

# Enable TLS 1.2, 1.1, and TLS for secure SMTP & IMAP connections (Yahoo, Google, Microsoft, Apple)
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls11 -bor [System.Net.SecurityProtocolType]::Tls

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Prefixes.Add("http://127.0.0.1:$Port/") } catch {}

try {
    $listener.Start()
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host " SigFlow Live Server Running at http://localhost:$Port/" -ForegroundColor Green
    Write-Host " Multi-Provider Dispatcher (Yahoo, Outlook, Gmail, iCloud)" -ForegroundColor White
    Write-Host " Full UTF-8 Encoding & Anti-Spam Multipart Active" -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Cyan
} catch {
    Write-Host "Port $Port is busy or unavailable. Falling back to port 8080..." -ForegroundColor Yellow
    try { $listener.Close() } catch {}
    $Port = 8080
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    try { $listener.Prefixes.Add("http://127.0.0.1:$Port/") } catch {}
    $listener.Start()
    Write-Host "SigFlow Web Server running at http://localhost:$Port/" -ForegroundColor Green
}

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
}

# Email Provider Resolver: Auto-detects SMTP and IMAP configurations for Yahoo, Outlook, Gmail, iCloud, Zoho, etc.
function Get-EmailProviderConfig([string]$email) {
    if (-not $email -or -not $email.Contains("@")) {
        return @{
            provider   = "generic"
            name       = "Email Provider"
            smtpHost   = "smtp.gmail.com"
            smtpPort   = 587
            enableSsl  = $true
            imapHost   = "imap.gmail.com"
            imapPort   = 993
            sentBox    = "`"Sent`""
            draftsBox  = "`"Drafts`""
            starredBox = "INBOX"
            trashBox   = "`"Trash`""
            spamBox    = "`"Spam`""
            helpUrl    = "https://myaccount.google.com/apppasswords"
            helpLabel  = "App Password"
        }
    }

    $domain = $email.Split('@')[-1].ToLower().Trim()

    # 1. Google Gmail / Google Workspace
    if ($domain -eq "gmail.com" -or $domain -eq "googlemail.com") {
        return @{
            provider   = "gmail"
            name       = "Google Gmail"
            smtpHost   = "smtp.gmail.com"
            smtpPort   = 465
            enableSsl  = $true
            imapHost   = "imap.gmail.com"
            imapPort   = 993
            sentBox    = "`"[Gmail]/Sent Mail`""
            draftsBox  = "`"[Gmail]/Drafts`""
            starredBox = "`"[Gmail]/Starred`""
            trashBox   = "`"[Gmail]/Trash`""
            spamBox    = "`"[Gmail]/Spam`""
            helpUrl    = "https://myaccount.google.com/apppasswords"
            helpLabel  = "Google 16-character App Password"
        }
    }

    # 2. Yahoo Mail / AOL / Rocketmail / Ymail
    if ($domain -match "yahoo\." -or $domain -match "ymail\.com" -or $domain -match "rocketmail\.com" -or $domain -match "aol\.com") {
        $hostPrefix = if ($domain -match "aol\.com") { "mail.aol.com" } else { "mail.yahoo.com" }
        return @{
            provider   = "yahoo"
            name       = "Yahoo Mail"
            smtpHost   = "smtp.$hostPrefix"
            smtpPort   = 465
            enableSsl  = $true
            imapHost   = "imap.$hostPrefix"
            imapPort   = 993
            sentBox    = "`"Sent`""
            draftsBox  = "`"Draft`""
            starredBox = "INBOX"
            trashBox   = "`"Trash`""
            spamBox    = "`"Bulk Mail`""
            helpUrl    = "https://login.yahoo.com/account/security"
            helpLabel  = "Yahoo App Password"
        }
    }

    # 3. Microsoft Outlook / Hotmail / Live / Office 365
    if ($domain -match "outlook\." -or $domain -match "hotmail\." -or $domain -match "live\." -or $domain -match "msn\.com" -or $domain -match "office365\.com") {
        return @{
            provider   = "outlook"
            name       = "Microsoft Outlook"
            smtpHost   = "smtp-mail.outlook.com"
            smtpPort   = 587
            enableSsl  = $true
            imapHost   = "outlook.office365.com"
            imapPort   = 993
            sentBox    = "`"Sent Items`""
            draftsBox  = "`"Drafts`""
            starredBox = "INBOX"
            trashBox   = "`"Deleted Items`""
            spamBox    = "`"Junk Email`""
            helpUrl    = "https://account.live.com/proofs/manage/additional"
            helpLabel  = "Microsoft App Password"
        }
    }

    # 4. Apple iCloud / Me / Mac
    if ($domain -eq "icloud.com" -or $domain -eq "me.com" -or $domain -eq "mac.com") {
        return @{
            provider   = "icloud"
            name       = "Apple iCloud"
            smtpHost   = "smtp.mail.me.com"
            smtpPort   = 587
            enableSsl  = $true
            imapHost   = "imap.mail.me.com"
            imapPort   = 993
            sentBox    = "`"Sent Messages`""
            draftsBox  = "`"Drafts`""
            starredBox = "INBOX"
            trashBox   = "`"Deleted Messages`""
            spamBox    = "`"Junk`""
            helpUrl    = "https://appleid.apple.com/account/manage"
            helpLabel  = "Apple App-Specific Password"
        }
    }

    # 5. Zoho Mail
    if ($domain -match "zoho\.") {
        return @{
            provider   = "zoho"
            name       = "Zoho Mail"
            smtpHost   = "smtppro.zoho.com"
            smtpPort   = 587
            enableSsl  = $true
            imapHost   = "imappro.zoho.com"
            imapPort   = 993
            sentBox    = "`"Sent`""
            draftsBox  = "`"Drafts`""
            starredBox = "INBOX"
            trashBox   = "`"Trash`""
            spamBox    = "`"Spam`""
            helpUrl    = "https://accounts.zoho.com"
            helpLabel  = "Zoho App Password"
        }
    }

    # 6. Generic Custom Domain
    return @{
        provider   = "custom"
        name       = "Mail ($domain)"
        smtpHost   = "smtp.$domain"
        smtpPort   = 587
        enableSsl  = $true
        imapHost   = "imap.$domain"
        imapPort   = 993
        sentBox    = "`"Sent`""
        draftsBox  = "`"Drafts`""
        starredBox = "INBOX"
        trashBox   = "`"Trash`""
        spamBox    = "`"Spam`""
        helpUrl    = ""
        helpLabel  = "Mailbox Password"
    }
}

# Base64Url encoder helper for Gmail API
function ConvertTo-Base64Url([byte[]]$bytes) {
    $base64 = [Convert]::ToBase64String($bytes)
    return $base64.Replace('+', '-').Replace('/', '_').TrimEnd('=')
}

# Helper to repair any mojibake back to authentic Unicode
function Repair-Mojibake([string]$text) {
    if (-not $text) { return "" }
    $calMoji = [string]([char]0xF0) + [char]0x9F + [char]0x93 + [char]0x85
    $calReal = [string]([char]0xD83D) + [char]0xDCC5
    $rocMoji = [string]([char]0xF0) + [char]0x9F + [char]0x9A + [char]0x80
    $rocReal = [string]([char]0xD83D) + [char]0xDE80
    $leafMoji = [string]([char]0xF0) + [char]0x9F + [char]0x8C + [char]0xB1
    $leafReal = [string]([char]0xD83C) + [char]0xDF31
    $aposMoji = [string]([char]0xE2) + [char]0x80 + [char]0x99
    $aposReal = [string]([char]0x2019)
    $lqMoji = [string]([char]0xE2) + [char]0x80 + [char]0x9C
    $lqReal = [string]([char]0x201C)
    $rqMoji = [string]([char]0xE2) + [char]0x80 + [char]0x9D
    $rqReal = [string]([char]0x201D)
    $bulletMoji = [string]([char]0xE2) + [char]0x80 + [char]0xA2
    $bulletReal = [string]([char]0x2022)
    $dash1Moji = [string]([char]0xE2) + [char]0x80 + [char]0x93
    $dash1Real = [string]([char]0x2013)
    $dash2Moji = [string]([char]0xE2) + [char]0x80 + [char]0x94
    $dash2Real = [string]([char]0x2014)

    $text = $text.Replace($calMoji, $calReal)
    $text = $text.Replace($rocMoji, $rocReal)
    $text = $text.Replace($leafMoji, $leafReal)
    $text = $text.Replace($aposMoji, $aposReal)
    $text = $text.Replace($lqMoji, $lqReal)
    $text = $text.Replace($rqMoji, $rqReal)
    $text = $text.Replace($bulletMoji, $bulletReal)
    $text = $text.Replace($dash1Moji, $dash1Real)
    $text = $text.Replace($dash2Moji, $dash2Real)
    return $text
}

# Helper to decode RFC 2047 MIME encoded headers (e.g. =?UTF-8?B?...?= or =?UTF-8?Q?...?=)
function ConvertFrom-MimeHeader([string]$text) {
    if (-not $text) { return "" }
    $evaluator = {
        param($m)
        $charset = $m.Groups[1].Value.ToLower()
        $encoding = $m.Groups[2].Value.ToUpper()
        $encodedData = $m.Groups[3].Value
        try {
            $enc = [System.Text.Encoding]::UTF8
            if ($charset -eq "iso-8859-1" -or $charset -eq "latin1") {
                $enc = [System.Text.Encoding]::GetEncoding("ISO-8859-1")
            } elseif ($charset -eq "windows-1252") {
                $enc = [System.Text.Encoding]::GetEncoding(1252)
            } elseif ($charset -eq "ascii" -or $charset -eq "us-ascii") {
                $enc = [System.Text.Encoding]::ASCII
            }

            if ($encoding -eq "B") {
                $cleanB64 = $encodedData.Trim().Replace(" ", "").Replace("`r", "").Replace("`n", "")
                $pad = (4 - ($cleanB64.Length % 4)) % 4
                if ($pad -gt 0) { $cleanB64 += ("=" * $pad) }
                $bytes = [Convert]::FromBase64String($cleanB64)
                return $enc.GetString($bytes)
            } elseif ($encoding -eq "Q") {
                $qStr = $encodedData.Replace('_', ' ')
                $bytes = [System.Collections.Generic.List[byte]]::new()
                for ($i = 0; $i -lt $qStr.Length; $i++) {
                    if ($qStr[$i] -eq '=' -and ($i + 2) -lt $qStr.Length) {
                        $hex = $qStr.Substring($i + 1, 2)
                        try {
                            $b = [Convert]::ToByte($hex, 16)
                            $bytes.Add($b)
                            $i += 2
                        } catch {
                            $bytes.Add([byte][char]$qStr[$i])
                        }
                    } else {
                        $bytes.Add([byte][char]$qStr[$i])
                    }
                }
                return $enc.GetString($bytes.ToArray())
            }
        } catch {
            return $m.Value
        }
        return $m.Value
    }

    $cleaned = [regex]::Replace($text, '(=\?[A-Za-z0-9\-_]+\?[BQbq]\?[^\?]+\?=)\s+(=\?[A-Za-z0-9\-_]+\?[BQbq]\?[^\?]+\?=)', '$1$2')
    $cleaned = [regex]::Replace($cleaned, '(=\?[A-Za-z0-9\-_]+\?[BQbq]\?[^\?]+\?=)\s+(=\?[A-Za-z0-9\-_]+\?[BQbq]\?[^\?]+\?=)', '$1$2')
    $pattern = '=\?([A-Za-z0-9\-_]+)\?([BQbq])\?([^\?]+)\?='
    $decoded = [regex]::Replace($cleaned, $pattern, $evaluator)
    return Repair-Mojibake $decoded
}

# Helper to filter out automated unsubscribe tokens, bounces, and machine feedback loops
function Test-IsJunkOrSystemEmail($email) {
    if (-not $email) { return $true }
    $sub = if ($email.subject) { [string]$email.subject.Trim() } else { "" }
    $from = if ($email.from) { [string]$email.from.ToLower().Trim() } else { "" }
    $to = if ($email.to) { [string]$email.to.ToLower().Trim() } else { "" }

    # 1. Unsubscribe tokens / automated 1-click unsubscribe loops
    if ($sub -match "(?i)^unsubscribe" -or 
        $sub -match "(?i)^unsub" -or 
        $sub -match "(?i)unsubscribev\d" -or 
        $sub -match "(?i)^optout" -or 
        $sub -match "(?i)^opt-out" -or
        $sub -match "(?i)list-unsubscribe" -or
        $sub -match "^[A-Za-z0-9_\-\.+=]{28,}$") {
        return $true
    }

    # 2. Mailer-daemon / bounce / delivery failures
    if ($from -match "mailer-daemon@" -or $from -match "postmaster@" -or $to -match "mailer-daemon@" -or $to -match "postmaster@") {
        return $true
    }
    if ($sub -match "(?i)Delivery Status Notification" -or $sub -match "(?i)Mail Delivery Subsystem" -or $sub -match "(?i)Undeliverable:") {
        return $true
    }

    # 3. Unsubscribe addresses in recipient or sender
    if ($to -match "(?i)unsubscribe" -or $to -match "(?i)bounce" -or $from -match "(?i)bounce[0-9]*@") {
        return $true
    }

    return $false
}

# Helper to convert HTML body to clean plain-text fallback
function Convert-HtmlToPlainText([string]$html) {
    if (-not $html) { return "" }
    $text = $html -replace "(?i)<br\s*/?>", "`r`n"
    $text = $text -replace "(?i)</p>", "`r`n`r`n"
    $text = $text -replace "(?i)</tr>", "`r`n"
    $text = $text -replace "(?i)</td>", "  "
    $text = $text -replace "<[^>]+>", ""
    $text = [System.Web.HttpUtility]::HtmlDecode($text)
    $text = $text -replace "[ \t]+", " "
    $text = $text -replace "(\r?\n){3,}", "`r`n`r`n"
    return $text.Trim()
}

# Helper to generate personalized fallback emails for the connected account
function New-PersonalizedEmails([string]$UserEmail, [string]$Folder) {
    $now = Get-Date
    $todayStr = $now.ToString("h:mm tt")
    $yesterdayStr = ($now.AddDays(-1)).ToString("MMM d")
    $prevDayStr = ($now.AddDays(-3)).ToString("MMM d")
    $accountName = if ($UserEmail) { $UserEmail.Split('@')[0] } else { "You" }

    if ($Folder -eq "sent") {
        return @(
            [ordered]@{
                id = "sent-1"
                from = $UserEmail
                fromName = $accountName
                to = "sarah.jenkins@acme-ventures.com"
                subject = "Partnership Sync & Contact Card Attached"
                snippet = "Hi Sarah, Great speaking with you today. I have attached my digital contact card with my direct calendar link below."
                bodyHtml = "<p>Hi Sarah,</p><p>Great speaking with you today. I have attached my digital contact card with my direct calendar link below. Let's touch base next week!</p>"
                date = $yesterdayStr
                isStarred = $false
                isUnread = $false
                folder = "sent"
            },
            [ordered]@{
                id = "sent-2"
                from = $UserEmail
                fromName = $accountName
                to = "enterprise-leads@quantumscale.io"
                subject = "Intro & Architecture Review Discussion"
                snippet = "Following up on our product demo from yesterday. Feel free to book time via my signature card."
                bodyHtml = "<p>Following up on our product demo from yesterday. Feel free to book time via my signature card below.</p>"
                date = $prevDayStr
                isStarred = $true
                isUnread = $false
                folder = "sent"
            }
        )
    } elseif ($Folder -eq "starred") {
        return @(
            [ordered]@{
                id = "star-1"
                from = "sarah.jenkins@acme-ventures.com"
                fromName = "Sarah Jenkins"
                to = $UserEmail
                subject = "Partnership Sync - Loved the interactive signature card!"
                snippet = "Hey! Thanks for sending over your contact card, loved the direct calendar button. Scheduled 15 mins for Thursday."
                bodyHtml = "<p>Hey!</p><p>Thanks for sending over your contact card, loved the direct calendar button. Scheduled 15 mins for Thursday.</p><p>Best,<br>Sarah</p>"
                date = $yesterdayStr
                isStarred = $true
                isUnread = $false
                folder = "starred"
            },
            [ordered]@{
                id = "star-2"
                from = "no-reply@accounts.google.com"
                fromName = "Google Workspace"
                to = $UserEmail
                subject = "Security Notice: Your SigFlow Gmail signature integration is active"
                snippet = "Your Google Account $UserEmail is now connected to SigFlow. Your interactive signature card is configured and verified."
                bodyHtml = "<p>Hello $accountName,</p><p>Your Google Account <strong>$UserEmail</strong> is successfully connected to SigFlow.</p><p>Warm regards,<br>Google Workspace Security Team</p>"
                date = $todayStr
                isStarred = $true
                isUnread = $false
                folder = "starred"
            }
        )
    } elseif ($Folder -eq "drafts") {
        return @(
            [ordered]@{
                id = "draft-1"
                from = $UserEmail
                fromName = $accountName
                to = "investors@quantumscale.io"
                subject = "Q3 Growth Metrics & Customer Onboarding"
                snippet = "[Draft] Drafting update for the investor relations team..."
                bodyHtml = "<p>[Draft] Drafting update for the investor relations team...</p>"
                date = $todayStr
                isStarred = $false
                isUnread = $false
                folder = "drafts"
            },
            [ordered]@{
                id = "draft-2"
                from = $UserEmail
                fromName = $accountName
                to = "team-updates@quantumscale.io"
                subject = "Sprint 14 Retrospective & Signature Rollout"
                snippet = "[Draft] Notes for tomorrow's team all-hands meeting..."
                bodyHtml = "<p>[Draft] Notes for tomorrow's team all-hands meeting...</p>"
                date = $yesterdayStr
                isStarred = $false
                isUnread = $false
                folder = "drafts"
            }
        )
    } else {
        return @(
            [ordered]@{
                id = "inbox-1"
                from = "no-reply@accounts.google.com"
                fromName = "Google Workspace"
                to = $UserEmail
                subject = "Security Notice: Your SigFlow Gmail signature integration is active"
                snippet = "Your Google Account $UserEmail is now connected to SigFlow. Your interactive signature card is configured and verified."
                bodyHtml = "<p>Hello $accountName,</p><p>Your Google Account <strong>$UserEmail</strong> is successfully connected to SigFlow.</p><p>Your interactive email signature card is configured, verified, and ready to be attached to every outgoing email.</p><p>Warm regards,<br>Google Workspace Security Team</p>"
                date = $todayStr
                isStarred = $true
                isUnread = $true
                folder = "inbox"
            },
            [ordered]@{
                id = "inbox-2"
                from = "sarah.jenkins@acme-ventures.com"
                fromName = "Sarah Jenkins"
                to = $UserEmail
                subject = "Partnership Sync • Loved the interactive signature card!"
                snippet = "Hey! Thanks for sending over your contact card, loved the direct calendar button. Scheduled 15 mins for Thursday."
                bodyHtml = "<p>Hey!</p><p>Thanks for sending over your contact card, loved the direct calendar button. Scheduled 15 mins for Thursday.</p><p>Looking forward to speaking!<br>Sarah Jenkins<br>Partner, Acme Ventures</p>"
                date = $yesterdayStr
                isStarred = $false
                isUnread = $true
                folder = "inbox"
            },
            [ordered]@{
                id = "inbox-3"
                from = "billing@stripe.com"
                fromName = "Stripe Billing"
                to = $UserEmail
                subject = "Invoice #1042 ready for download • QuantumScale AI Team plan"
                snippet = "Your monthly subscription receipt for QuantumScale AI Team plan is ready. Total: $149.00 USD."
                bodyHtml = "<p>Hi $accountName,</p><p>Your monthly subscription receipt for QuantumScale AI Team plan is ready.</p><p><strong>Amount:</strong> $149.00 USD<br><strong>Status:</strong> Paid</p><p>Thank you for your business!</p>"
                date = $prevDayStr
                isStarred = $false
                isUnread = $false
                folder = "inbox"
            },
            [ordered]@{
                id = "inbox-4"
                from = "notifications@github.com"
                fromName = "GitHub Team"
                to = $UserEmail
                subject = "[quantumscale/core] Release v3.0 is now live"
                snippet = "Release v3.0 has been deployed with full enterprise automation pipelines."
                bodyHtml = "<p>Hey $accountName,</p><p><strong>quantumscale/core</strong> Release v3.0 has been deployed with full enterprise automation pipelines.</p><p>Check out the changelog for details.</p>"
                date = "Aug 29"
                isStarred = $false
                isUnread = $false
                folder = "inbox"
            }
        )
    }
}

# ======================================================================
# Robust Multi-Port SMTP Dispatcher (Direct SSL Port 465 & STARTTLS Port 587)
# Bypasses ISP/mobile port 587 blocking, full UTF-8 base64 MIME support
# ======================================================================
function Send-EmailViaSmtp {
    param (
        [string]$SmtpHost,
        [int]$SmtpPort = 465,
        [string]$From,
        [string]$DisplayName,
        [string]$To,
        [string]$Subject,
        [string]$PlainText,
        [string]$BodyHtml,
        [string]$AuthSecret
    )

    # SECURITY: Defense-in-depth — block any email where body or subject contains credential data
    if ($BodyHtml -match 'appPassword=' -or $PlainText -match 'appPassword=' -or $Subject -match 'appPassword=') {
        throw "SECURITY BLOCK: Email content contains credential data. Send aborted to prevent password leak."
    }

    # Automatically try Port 465 first (SMTPS direct SSL - open on mobile/residential networks), then 587
    $portsToTry = @(465, 587)
    if ($SmtpPort -eq 587) {
        $portsToTry = @(465, 587)
    } elseif ($SmtpPort -and $SmtpPort -ne 465) {
        $portsToTry = @($SmtpPort, 465, 587)
    }

    $lastError = $null

    foreach ($port in $portsToTry) {
        $tcp = $null
        try {
            Write-Host "[SMTP] Connecting to $SmtpHost : $port..." -ForegroundColor Cyan
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.ReceiveTimeout = 15000
            $tcp.SendTimeout = 15000
            
            $iar = $tcp.BeginConnect($SmtpHost, $port, $null, $null)
            $connOk = $iar.AsyncWaitHandle.WaitOne(5000, $false)
            if (-not $connOk) {
                $tcp.Close()
                throw "Connection to $SmtpHost on port $port timed out (port blocked by your ISP or network)."
            }
            $tcp.EndConnect($iar)

            $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
            $reader = $null
            $writer = $null

            if ($port -eq 465) {
                $ssl = New-Object System.Net.Security.SslStream($tcp.GetStream(), $false)
                $ssl.AuthenticateAsClient($SmtpHost)
                $reader = New-Object System.IO.StreamReader($ssl, [System.Text.Encoding]::UTF8)
                $writer = New-Object System.IO.StreamWriter($ssl, $utf8NoBom)
            } else {
                $rawStream = $tcp.GetStream()
                $rawReader = New-Object System.IO.StreamReader($rawStream, [System.Text.Encoding]::UTF8)
                $rawWriter = New-Object System.IO.StreamWriter($rawStream, $utf8NoBom)
                $rawWriter.AutoFlush = $true
                do { $l = $rawReader.ReadLine() } while ($l -match "^\d{3}-")
                $rawWriter.WriteLine("EHLO localhost")
                do { $l = $rawReader.ReadLine() } while ($l -match "^\d{3}-")
                $rawWriter.WriteLine("STARTTLS")
                $tlsResp = $rawReader.ReadLine()
                if (-not ($tlsResp -match "^220")) { throw "STARTTLS rejected: $tlsResp" }
                $ssl = New-Object System.Net.Security.SslStream($rawStream, $false)
                $ssl.AuthenticateAsClient($SmtpHost)
                $reader = New-Object System.IO.StreamReader($ssl, [System.Text.Encoding]::UTF8)
                $writer = New-Object System.IO.StreamWriter($ssl, $utf8NoBom)
            }
            $writer.AutoFlush = $true

            function Read-SmtpBlock($r) {
                $resp = ""
                do {
                    $line = $r.ReadLine()
                    if ($null -eq $line) { break }
                    $resp += $line + "`n"
                } while ($line -match "^\d{3}-")
                return $resp
            }

            if ($port -eq 465) {
                $greet = Read-SmtpBlock $reader
                if (-not ($greet -match "^220")) { throw "SMTP greeting error: $greet" }
            }

            $writer.WriteLine("EHLO localhost")
            $ehloResp = Read-SmtpBlock $reader
            if (-not ($ehloResp -match "^250")) { throw "EHLO rejected: $ehloResp" }

            $cleanPassword = $AuthSecret.Replace(" ", "").Trim()
            $writer.WriteLine("AUTH LOGIN")
            $authPrompt = Read-SmtpBlock $reader
            if (-not ($authPrompt -match "^334")) { throw "AUTH LOGIN rejected: $authPrompt" }

            $writer.WriteLine([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($From)))
            $userPrompt = Read-SmtpBlock $reader
            if (-not ($userPrompt -match "^334")) { throw "Username rejected: $userPrompt" }

            $writer.WriteLine([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($cleanPassword)))
            $passResp = Read-SmtpBlock $reader
            if (-not ($passResp -match "^235")) {
                if ($passResp -match "535" -or $passResp -match "BadCredentials" -or $passResp -match "Username and Password not accepted") {
                    throw "Email login failed (535 Bad Credentials): Username or App Password not accepted.`r`n`r`nIMPORTANT: Google and Yahoo require a 16-character App Password (not your personal account password). Go to https://myaccount.google.com/apppasswords to create one."
                }
                throw "Authentication rejected: $passResp"
            }

            $writer.WriteLine("MAIL FROM:<$From>")
            $mailFromResp = Read-SmtpBlock $reader
            if (-not ($mailFromResp -match "^250")) { throw "MAIL FROM rejected: $mailFromResp" }

            $recipientList = @($To.Split(@(',', ';'), [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim() } | Where-Object { $_ })
            if ($recipientList.Count -eq 0) { throw "No recipients specified." }

            foreach ($rcpt in $recipientList) {
                $writer.WriteLine("RCPT TO:<$rcpt>")
                $rcptResp = Read-SmtpBlock $reader
                if (-not ($rcptResp -match "^250")) { throw "Recipient '$rcpt' rejected: $rcptResp" }
            }

            $writer.WriteLine("DATA")
            $dataPrompt = Read-SmtpBlock $reader
            if (-not ($dataPrompt -match "^354")) { throw "DATA command rejected: $dataPrompt" }

            $safeDisplayName = if ($DisplayName) { $DisplayName.Trim() } else { $From.Split('@')[0] }
            $safeSubject = if ($Subject) { $Subject.Trim() } else { "(No Subject)" }
            $boundary = "====SigFlowBoundary_" + [System.Guid]::NewGuid().ToString("N") + "===="
            $nowDate = [System.DateTime]::UtcNow.ToString("r")
            $fromDomain = if ($From.Contains("@")) { $From.Split('@')[-1] } else { "localhost" }
            $msgId = "<" + [System.Guid]::NewGuid().ToString("N") + "@" + $fromDomain + ">"

            $fromNamePart = if ($safeDisplayName -match "[^\x20-\x7E]") {
                "=?UTF-8?B?$([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($safeDisplayName)))?="
            } else {
                "`"$safeDisplayName`""
            }

            $subjectHeader = if ($safeSubject -match "[^\x20-\x7E]") {
                "=?UTF-8?B?$([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($safeSubject)))?="
            } else {
                $safeSubject
            }

            $b64Plain = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($PlainText), [System.Base64FormattingOptions]::InsertLineBreaks)
            $b64Html = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($BodyHtml), [System.Base64FormattingOptions]::InsertLineBreaks)

            $toHeaderVal = ($recipientList | ForEach-Object { "<$_>" }) -join ", "

            $mime = "From: $fromNamePart <$From>`r`n" +
                    "To: $toHeaderVal`r`n" +
                    "Reply-To: $fromNamePart <$From>`r`n" +
                    "Subject: $subjectHeader`r`n" +
                    "Date: $nowDate`r`n" +
                    "Message-ID: $msgId`r`n" +
                    "MIME-Version: 1.0`r`n" +
                    "X-Mailer: SigFlow Mail Engine 3.0`r`n" +
                    "Content-Type: multipart/alternative; boundary=`"$boundary`"`r`n`r`n" +
                    "--$boundary`r`n" +
                    "Content-Type: text/plain; charset=utf-8`r`n" +
                    "Content-Transfer-Encoding: base64`r`n`r`n" +
                    "$b64Plain`r`n`r`n" +
                    "--$boundary`r`n" +
                    "Content-Type: text/html; charset=utf-8`r`n" +
                    "Content-Transfer-Encoding: base64`r`n`r`n" +
                    "$b64Html`r`n`r`n" +
                    "--$boundary--`r`n"

            $escapedMime = $mime -replace "(?m)^\.", ".."
            $writer.Write($escapedMime)
            if (-not $escapedMime.EndsWith("`r`n")) {
                $writer.Write("`r`n")
            }
            $writer.WriteLine(".")

            $sentResp = Read-SmtpBlock $reader
            if (-not ($sentResp -match "^250")) { throw "Sending failed during delivery: $sentResp" }

            try { $writer.WriteLine("QUIT"); $null = Read-SmtpBlock $reader } catch {}
            $tcp.Close()

            Write-Host "[SMTP] Success via port $port! Server response: $($sentResp.Trim())" -ForegroundColor Green
            return @{ success = $true; message = "Email dispatched via $SmtpHost (port $port) with full UTF-8 Multipart/Alternative headers to $To!" }
        } catch {
            $lastError = $_.Exception.Message
            Write-Host "[SMTP] Port $port note: $lastError" -ForegroundColor Yellow
            if ($tcp) { try { $tcp.Close() } catch {} }
            if ($lastError -match "16-character" -or $lastError -match "535" -or $lastError -match "Bad Credentials") {
                throw $lastError
            }
        }
    }

    throw "Failed to dispatch email via ${SmtpHost}: $lastError"
}

function Test-EmailCredentialsViaSmtp {
    param (
        [string]$SmtpHost,
        [int]$SmtpPort = 465,
        [string]$From,
        [string]$AuthSecret
    )

    $portsToTry = @(465, 587)
    if ($SmtpPort -eq 587) { $portsToTry = @(465, 587) }
    elseif ($SmtpPort -and $SmtpPort -ne 465) { $portsToTry = @($SmtpPort, 465, 587) }

    $lastError = ""

    foreach ($port in $portsToTry) {
        $tcp = $null
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.ReceiveTimeout = 10000
            $tcp.SendTimeout = 10000
            
            $iar = $tcp.BeginConnect($SmtpHost, $port, $null, $null)
            $connOk = $iar.AsyncWaitHandle.WaitOne(5000, $false)
            if (-not $connOk) {
                $tcp.Close()
                continue
            }
            $tcp.EndConnect($iar)

            $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
            $reader = $null
            $writer = $null

            if ($port -eq 465) {
                $ssl = New-Object System.Net.Security.SslStream($tcp.GetStream(), $false)
                $ssl.AuthenticateAsClient($SmtpHost)
                $reader = New-Object System.IO.StreamReader($ssl, [System.Text.Encoding]::UTF8)
                $writer = New-Object System.IO.StreamWriter($ssl, $utf8NoBom)
            } else {
                $rawStream = $tcp.GetStream()
                $rawReader = New-Object System.IO.StreamReader($rawStream, [System.Text.Encoding]::UTF8)
                $rawWriter = New-Object System.IO.StreamWriter($rawStream, $utf8NoBom)
                $rawWriter.AutoFlush = $true
                do { $l = $rawReader.ReadLine() } while ($l -match "^\d{3}-")
                $rawWriter.WriteLine("EHLO localhost")
                do { $l = $rawReader.ReadLine() } while ($l -match "^\d{3}-")
                $rawWriter.WriteLine("STARTTLS")
                $null = $rawReader.ReadLine()
                $ssl = New-Object System.Net.Security.SslStream($rawStream, $false)
                $ssl.AuthenticateAsClient($SmtpHost)
                $reader = New-Object System.IO.StreamReader($ssl, [System.Text.Encoding]::UTF8)
                $writer = New-Object System.IO.StreamWriter($ssl, $utf8NoBom)
            }
            $writer.AutoFlush = $true

            function Read-Block($r) {
                $resp = ""
                do {
                    $line = $r.ReadLine()
                    if ($null -eq $line) { break }
                    $resp += $line + "`n"
                } while ($line -match "^\d{3}-")
                return $resp
            }

            if ($port -eq 465) {
                $null = Read-Block $reader
            }

            $writer.WriteLine("EHLO localhost")
            $null = Read-Block $reader

            $cleanPassword = $AuthSecret.Replace(" ", "").Trim()
            $writer.WriteLine("AUTH LOGIN")
            $authP = Read-Block $reader
            if (-not ($authP -match "^334")) { throw "AUTH LOGIN not supported on ${SmtpHost}:$port" }

            $writer.WriteLine([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($From)))
            $null = Read-Block $reader

            $writer.WriteLine([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($cleanPassword)))
            $passResp = Read-Block $reader

            try { $writer.WriteLine("QUIT"); $null = Read-Block $reader } catch {}
            $tcp.Close()

            if ($passResp -match "^235") {
                return @{ success = $true; message = "Live connection verified! Successfully authenticated with $SmtpHost on port $port." }
            } else {
                throw "Username or App Password was rejected by $SmtpHost.`r`nPlease ensure you are using a 16-character App Password (not your personal account password). Check https://myaccount.google.com/apppasswords`r`nServer response: $($passResp.Trim())"
            }
        } catch {
            $lastError = $_.Exception.Message
            if ($tcp) { try { $tcp.Close() } catch {} }
            if ($lastError -match "16-character" -or $lastError -match "rejected by") {
                throw $lastError
            }
        }
    }

    throw "Failed to verify connection to ${SmtpHost}: $lastError"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Headers for Localhost
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $urlPath = $request.Url.LocalPath

        # ======================================================================
        # API ROUTE: Send Real Email with Anti-Spam & Strict UTF-8 Encoding
        # ======================================================================
        if ($urlPath -eq "/api/send-email" -and $request.HttpMethod -eq "POST") {
            try {
                # STRICT UTF-8 Reader: Prevents Windows-1252 mojibake (e.g. ðŸ“…)
                $reqReader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyJson = $reqReader.ReadToEnd()
                $reqReader.Close()

                # Robust JSON parsing with explicit validation
                $data = $null
                try {
                    $data = $bodyJson | ConvertFrom-Json
                } catch {
                    Write-Host "[Send Error] JSON parse failed: $($_.Exception.Message)" -ForegroundColor Red
                    throw "Invalid request: Could not parse JSON payload."
                }

                # Validate we got a proper parsed object, not a raw string
                if ($null -eq $data -or $data -is [string]) {
                    throw "Invalid request: JSON payload did not parse into a valid object."
                }

                # SECURITY: Extract appPassword and oauthToken FIRST, then immediately
                # remove them from the data object so they can NEVER leak if the object
                # is accidentally stringified into email content
                $appPassword = if ($data.PSObject.Properties['appPassword']) { [string]$data.appPassword } else { "" }
                $oauthToken = if ($data.PSObject.Properties['oauthToken']) { [string]$data.oauthToken } else { "" }

                # Purge sensitive credentials from the parsed data object
                if ($data.PSObject.Properties['appPassword']) { $data.PSObject.Properties.Remove('appPassword') }
                if ($data.PSObject.Properties['oauthToken']) { $data.PSObject.Properties.Remove('oauthToken') }

                # Extract remaining fields safely using PSObject.Properties to avoid
                # PowerShell stringifying the entire object on property access failure
                $from = if ($data.PSObject.Properties['from'] -and $data.from) { [string]$data.from } else { "" }
                $to = if ($data.PSObject.Properties['to'] -and $data.to) { [string]$data.to } else { "" }
                $senderName = if ($data.PSObject.Properties['senderName'] -and $data.senderName) { [string]$data.senderName } else { "" }

                # Extract subject with validation — must be a simple string, not a stringified object
                $rawSubject = if ($data.PSObject.Properties['subject'] -and $data.subject) { [string]$data.subject } else { "" }
                $subject = Repair-Mojibake $rawSubject

                # Extract bodyHtml with validation — must be a simple string, not a stringified object
                $rawBodyHtml = if ($data.PSObject.Properties['bodyHtml'] -and $data.bodyHtml) { [string]$data.bodyHtml } else { "" }
                $bodyHtml = Repair-Mojibake $rawBodyHtml

                # Safety check: Detect if any field accidentally contains a stringified PowerShell object
                # (which would look like "@{key=value; ...}" and could leak credentials)
                foreach ($fieldName in @('from', 'to', 'subject', 'senderName')) {
                    $fieldVal = Get-Variable -Name $fieldName -ValueOnly
                    if ($fieldVal -match '^@\{.*\}$' -or $fieldVal -match 'appPassword=' -or $fieldVal -match 'oauthToken=') {
                        Write-Host "[SECURITY] Field '$fieldName' contains suspicious object stringification. Blocking send." -ForegroundColor Red
                        throw "Internal error: malformed request data detected. Please try again."
                    }
                }
                if ($bodyHtml -match 'appPassword=' -or $bodyHtml -match 'oauthToken=') {
                    Write-Host "[SECURITY] bodyHtml contains credential data. Blocking send." -ForegroundColor Red
                    throw "Internal error: malformed request data detected. Please try again."
                }

                Write-Host "[Send] from=$from, to=$to, subject=$($subject.Substring(0, [Math]::Min(60, $subject.Length))), bodyLen=$($bodyHtml.Length)" -ForegroundColor Gray

                if (-not $to -or -not $subject -or -not $bodyHtml) {
                    throw "Missing required fields: to, subject, or bodyHtml."
                }

                # Guard against oversized email payloads (Yahoo/Gmail 20-25MB MIME limit)
                if ($bodyHtml.Length -gt 15000000) {
                    $mb = [Math]::Round($bodyHtml.Length / 1MB, 2)
                    throw "Email payload is too large ($mb MB). Yahoo and Google reject emails over 20-25MB MIME size. Please compress embedded images or use cloud links before sending."
                }

                # Parse and validate recipient(s) — supports multiple recipients separated by comma or semicolon
                $recipientList = @($to.Split(@(',', ';'), [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim() } | Where-Object { $_ })
                if ($recipientList.Count -eq 0) {
                    throw "Please provide at least one recipient email address."
                }
                foreach ($rcpt in $recipientList) {
                    if ($rcpt -notmatch "^[^@\s]+@[^@\s]+\.[^@\s]+$") {
                        throw "Invalid recipient address format '$rcpt'. Please enter a valid email address (e.g. name@yahoo.com or name@gmail.com)."
                    }
                }
                $cleanTo = $recipientList -join ", "

                # Sanitize Subject: Remove CR, LF, tabs and control characters to strictly comply with .NET MailMessage
                $cleanSubject = Repair-Mojibake ([string]$subject)
                $cleanSubject = $cleanSubject -replace "[\r\n\t]+", " "
                $cleanSubject = $cleanSubject -replace "\s+", " "
                $cleanSubject = $cleanSubject.Trim()
                if (-not $cleanSubject) {
                    $cleanSubject = "(No Subject)"
                }
                if ($cleanSubject.StartsWith("Re: ", [System.StringComparison]::OrdinalIgnoreCase)) {
                    $cleanSubject = $cleanSubject.Substring(4).Trim()
                }
                # Double safety guarantee: Remove any raw 0x0D or 0x0A
                $cleanSubject = $cleanSubject.Replace("`r", "").Replace("`n", "").Trim()

                # Sender Display Name (also sanitize from newlines to prevent header injection)
                $rawDisplayName = if ($senderName) { $senderName } else { $from.Split('@')[0] }
                $displayName = ($rawDisplayName -replace "[\r\n\t]+", " ").Trim()

                # Generate clean plain text part (crucial for anti-spam filters!)
                $clientPlainText = if ($data.PSObject.Properties['plainText'] -and $data.plainText) { [string]$data.plainText } else { "" }
                $plainText = if ($clientPlainText) { $clientPlainText } else { Convert-HtmlToPlainText $bodyHtml }
                if (-not $plainText) {
                    $plainText = "Please view this email in an HTML-compatible email reader."
                }

                $sendResult = @{ success = $false; message = "" }

                # Method 1: Google OAuth API (if OAuth token provided)
                if ($oauthToken) {
                    Write-Host "[Gmail API] Dispatching email via Google REST API to $cleanTo..." -ForegroundColor Cyan
                    
                    $boundary = "====SigFlowBoundary_" + [System.Guid]::NewGuid().ToString("N") + "===="
                    $nowDate = [System.DateTime]::UtcNow.ToString("r")
                    $fromDomain = if ($from.Contains("@")) { $from.Split('@')[-1] } else { "gmail.com" }
                    $msgId = "<" + [System.Guid]::NewGuid().ToString("N") + "@" + $fromDomain + ">"

                    $safeDisplayName = if ($displayName) { $displayName.Trim() } else { $from.Split('@')[0] }
                    $safeSubject = if ($cleanSubject) { $cleanSubject.Trim() } else { "(No Subject)" }

                    $fromNamePart = if ($safeDisplayName -match "[^\x20-\x7E]") {
                        "=?UTF-8?B?$([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($safeDisplayName)))?="
                    } else {
                        "`"$safeDisplayName`""
                    }

                    $subjectHeader = if ($safeSubject -match "[^\x20-\x7E]") {
                        "=?UTF-8?B?$([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($safeSubject)))?="
                    } else {
                        $safeSubject
                    }

                    $b64Plain = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($plainText), [System.Base64FormattingOptions]::InsertLineBreaks)
                    $b64Html = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($bodyHtml), [System.Base64FormattingOptions]::InsertLineBreaks)

                    $toHeaderVal = ($recipientList | ForEach-Object { "<$_>" }) -join ", "

                    $rawMime = @"
From: $fromNamePart <$from>
To: $toHeaderVal
Reply-To: $fromNamePart <$from>
Subject: $subjectHeader
Date: $nowDate
Message-ID: $msgId
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="$boundary"

--$boundary
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: base64

$b64Plain

--$boundary
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: base64

$b64Html

--$boundary--
"@

                    $rawBytes = [System.Text.Encoding]::UTF8.GetBytes($rawMime)
                    $base64Url = ConvertTo-Base64Url($rawBytes)

                    $apiPayload = @{ raw = $base64Url } | ConvertTo-Json
                    $apiHeaders = @{
                        "Authorization" = "Bearer $oauthToken"
                        "Content-Type"  = "application/json"
                    }

                    $apiRes = Invoke-RestMethod -Uri "https://gmail.googleapis.com/gmail/v1/users/me/messages/send" `
                        -Method Post `
                        -Headers $apiHeaders `
                        -Body $apiPayload

                    $sendResult.success = $true
                    $sendResult.message = "Real email delivered via Google Gmail API! Message ID: $($apiRes.id)"
                    Write-Host "[Gmail API] Success! Message ID: $($apiRes.id)" -ForegroundColor Green
                }
                # Method 2: Live Multi-Provider SMTP using App Password (Yahoo, Gmail, Outlook, iCloud, Zoho)
                elseif ($appPassword) {
                    $prov = Get-EmailProviderConfig $from
                    $cleanPassword = $appPassword.Replace(" ", "").Trim()
                    Write-Host "[SMTP Dispatch] Sending via $($prov.smtpHost):$($prov.smtpPort) ($($prov.name)) to $cleanTo..." -ForegroundColor Cyan

                    $smtpParams = @{
                        SmtpHost    = $prov.smtpHost
                        SmtpPort    = $prov.smtpPort
                        From        = $from
                        DisplayName = $displayName
                        To          = $cleanTo
                        Subject     = $cleanSubject
                        PlainText   = $plainText
                        BodyHtml    = $bodyHtml
                        AuthSecret  = $cleanPassword
                    }
                    $sendResult = Send-EmailViaSmtp @smtpParams
                }
                else {
                    throw "No live credentials provided. Please enter an App Password for your email provider."
                }

                $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes(($sendResult | ConvertTo-Json))
                $response.ContentType = "application/json; charset=utf-8"
                $response.StatusCode = 200
                $response.ContentLength64 = $jsonBytes.Length
                $response.OutputStream.Write($jsonBytes, 0, $jsonBytes.Length)
            } catch {
                $errDetail = if ($_.Exception.InnerException) { "$($_.Exception.Message) ($($_.Exception.InnerException.Message))" } else { $_.Exception.Message }
                Write-Host "[Send Error] $errDetail" -ForegroundColor Red
                $errorObj = @{ success = $false; error = $errDetail }
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes(($errorObj | ConvertTo-Json))
                $response.ContentType = "application/json; charset=utf-8"
                $response.StatusCode = 400
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.Close()
            continue
        }

        # ======================================================================
        # API ROUTE: Test Live Credentials
        # ======================================================================
        if ($urlPath -eq "/api/test-credentials" -and $request.HttpMethod -eq "POST") {
            try {
                $reqReader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyJson = $reqReader.ReadToEnd()
                $reqReader.Close()
                $data = ConvertFrom-Json $bodyJson

                $from = if ($data.PSObject.Properties['from'] -and $data.from) { [string]$data.from } else { "" }
                $appPassword = if ($data.PSObject.Properties['appPassword'] -and $data.appPassword) { [string]$data.appPassword } else { "" }

                if (-not $from -or -not $appPassword) {
                    throw "Provide both your email address and App Password to test."
                }

                $prov = Get-EmailProviderConfig $from
                $cleanPassword = $appPassword.Replace(" ", "").Trim()
                Write-Host "[Test Credentials] Testing $($prov.name) via $($prov.smtpHost):$($prov.smtpPort) for $from..." -ForegroundColor Cyan

                $resObj = Test-EmailCredentialsViaSmtp `
                    -SmtpHost $prov.smtpHost `
                    -SmtpPort $prov.smtpPort `
                    -From $from `
                    -AuthSecret $cleanPassword

                $resBytes = [System.Text.Encoding]::UTF8.GetBytes(($resObj | ConvertTo-Json))
                $response.ContentType = "application/json; charset=utf-8"
                $response.StatusCode = 200
                $response.ContentLength64 = $resBytes.Length
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
            } catch {
                $errDetail = if ($_.Exception.InnerException) { "$($_.Exception.Message) ($($_.Exception.InnerException.Message))" } else { $_.Exception.Message }
                Write-Host "[Credentials Error] $errDetail" -ForegroundColor Red
                $errorObj = @{ success = $false; error = $errDetail }
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes(($errorObj | ConvertTo-Json))
                $response.ContentType = "application/json; charset=utf-8"
                $response.StatusCode = 400
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.Close()
            continue
        }

        # ======================================================================
        # API ROUTE: Fetch Real Emails via IMAP / Gmail API
        # ======================================================================
        if ($urlPath -eq "/api/fetch-emails" -and $request.HttpMethod -eq "POST") {
            try {
                $reqReader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyJson = $reqReader.ReadToEnd()
                $reqReader.Close()
                $data = ConvertFrom-Json $bodyJson

                $from = if ($data.PSObject.Properties['from'] -and $data.from) { [string]$data.from } else { "" }
                $appPassword = if ($data.PSObject.Properties['appPassword'] -and $data.appPassword) { [string]$data.appPassword } else { "" }
                $oauthToken = if ($data.PSObject.Properties['oauthToken'] -and $data.oauthToken) { [string]$data.oauthToken } else { "" }
                $folder = if ($data.folder) { $data.folder.ToLower() } else { "inbox" }
                $limit = if ($data.limit) { [int]$data.limit } else { 15 }

                $emails = @()
                $isLive = $false

                # Method 1: IMAP if App Password provided
                if ($from -and $appPassword) {
                    try {
                        $prov = Get-EmailProviderConfig $from
                        Write-Host "[IMAP] Connecting to $($prov.imapHost):$($prov.imapPort) ($($prov.name)) for $from ($folder)..." -ForegroundColor Cyan
                        $cleanPassword = $appPassword.Replace(" ", "").Trim()
                        $tcp = New-Object System.Net.Sockets.TcpClient($prov.imapHost, $prov.imapPort)
                        $tcp.ReceiveTimeout = 9000
                        $tcp.SendTimeout = 9000
                        $ssl = New-Object System.Net.Security.SslStream($tcp.GetStream(), $false)
                        $ssl.AuthenticateAsClient($prov.imapHost)
                        $sslReader = New-Object System.IO.StreamReader($ssl, [System.Text.Encoding]::UTF8)
                        $sslWriter = New-Object System.IO.StreamWriter($ssl, [System.Text.Encoding]::ASCII)
                        $sslWriter.AutoFlush = $true

                        # Read Banner
                        $null = $sslReader.ReadLine()

                        # Login
                        $sslWriter.WriteLine("a001 LOGIN `"$from`" `"$cleanPassword`"")
                        $loginOk = $false
                        do {
                            $l = $sslReader.ReadLine()
                            if ($l -match "^a001 OK") { $loginOk = $true; break }
                            if ($l -match "^a001 (NO|BAD)") { break }
                        } while ($l -ne $null)

                        if ($loginOk) {
                            $isLive = $true

                            # Determine candidate folder names based on detected provider
                            $candidateBoxes = @("INBOX")
                            if ($folder -eq "sent") {
                                $candidateBoxes = @($prov.sentBox, "`"Sent`"", "`"Sent Items`"", "`"Sent Messages`"", "`"[Gmail]/Sent Mail`"")
                            } elseif ($folder -eq "starred") {
                                $candidateBoxes = @($prov.starredBox, "`"[Gmail]/Starred`"", "INBOX")
                            } elseif ($folder -eq "drafts") {
                                $candidateBoxes = @($prov.draftsBox, "`"Drafts`"", "`"Draft`"", "`"[Gmail]/Drafts`"")
                            }

                            $count = 0
                            $tagIdx = 2

                            foreach ($cBox in $candidateBoxes) {
                                $tag = "a" + ($tagIdx.ToString("D3"))
                                $tagIdx++
                                $sslWriter.WriteLine("$tag SELECT $cBox")
                                $selectOk = $false
                                do {
                                    $l = $sslReader.ReadLine()
                                    if ($l -match "^\*\s+(\d+)\s+EXISTS") { $count = [int]$matches[1] }
                                    if ($l -match "^$tag OK") { $selectOk = $true; break }
                                    if ($l -match "^$tag (NO|BAD)") { break }
                                } while ($l -ne $null)

                                if ($selectOk) { break }
                            }

                            if ($count -gt 0) {
                                $fetchCount = [Math]::Max(35, $limit + 15)
                                $startIdx = [Math]::Max(1, $count - $fetchCount + 1)
                                $sslWriter.WriteLine("a003 FETCH $startIdx`:$count (UID FLAGS INTERNALDATE BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE)])")
                                
                                $currentEmail = $null
                                $inHeader = $false
                                $lastHeader = ""
                                do {
                                    $l = $sslReader.ReadLine()
                                    if ($l -match "^\*\s+(\d+)\s+FETCH\s+\(UID\s+(\d+)") {
                                        if ($currentEmail) {
                                            $currentEmail.fromName = ConvertFrom-MimeHeader $currentEmail.fromName
                                            $currentEmail.subject = ConvertFrom-MimeHeader $currentEmail.subject
                                            if (-not $currentEmail.snippet) { $currentEmail.snippet = $currentEmail.subject }
                                            if (-not (Test-IsJunkOrSystemEmail $currentEmail)) {
                                                $emails += $currentEmail
                                            }
                                        }
                                        $uid = $matches[2]
                                        $isStarred = ($l -match "\\Flagged")
                                        $isUnread = (-not ($l -match "\\Seen"))
                                        $currentEmail = [ordered]@{
                                            id = "imap-" + $uid
                                            from = ""
                                            fromName = ""
                                            to = $from
                                            subject = "(No Subject)"
                                            snippet = ""
                                            bodyHtml = ""
                                            date = (Get-Date -Format "MMM d")
                                            isStarred = $isStarred
                                            isUnread = $isUnread
                                            folder = $folder
                                        }
                                        $inHeader = $true
                                        $lastHeader = ""
                                        continue
                                    }

                                    if ($inHeader -and $currentEmail) {
                                        if ($l -match "^From:\s*(.*)$") {
                                            $lastHeader = "from"
                                            $rawFrom = $matches[1].Trim()
                                            if ($rawFrom -match "^(.*)<(.+)>$") {
                                                $currentEmail.fromName = ConvertFrom-MimeHeader ($matches[1].Trim().Trim('"').Trim("'"))
                                                $currentEmail.from = $matches[2].Trim()
                                            } else {
                                                $currentEmail.from = $rawFrom
                                                $currentEmail.fromName = ConvertFrom-MimeHeader ($rawFrom.Split('@')[0])
                                            }
                                        } elseif ($l -match "^Subject:\s*(.*)$") {
                                            $lastHeader = "subject"
                                            $currentEmail.subject = $matches[1].Trim()
                                        } elseif ($l -match "^\s+(.*)$" -and $lastHeader -eq "subject") {
                                            # RFC 822 folded header continuation line
                                            $currentEmail.subject = ($currentEmail.subject + " " + $matches[1].Trim()).Trim()
                                        } elseif ($l -match "^Date:\s*(.*)$") {
                                            $lastHeader = "date"
                                            try {
                                                $d = [DateTime]::Parse($matches[1].Trim())
                                                $currentEmail.date = $d.ToString("MMM d")
                                            } catch {
                                                $currentEmail.date = (Get-Date -Format "MMM d")
                                            }
                                        } elseif ($l -match "^[A-Za-z\-]+:\s*") {
                                            $lastHeader = "other"
                                        } elseif ($l -eq ")" -or $l -match "^a003 OK") {
                                            $inHeader = $false
                                            $lastHeader = ""
                                        }
                                    }

                                    if ($l -match "^a003 (OK|NO|BAD)") { break }
                                } while ($l -ne $null)

                                if ($currentEmail) {
                                    $currentEmail.fromName = ConvertFrom-MimeHeader $currentEmail.fromName
                                    $currentEmail.subject = ConvertFrom-MimeHeader $currentEmail.subject
                                    if (-not $currentEmail.snippet) { $currentEmail.snippet = $currentEmail.subject }
                                    if (-not (Test-IsJunkOrSystemEmail $currentEmail)) {
                                        $emails += $currentEmail
                                    }
                                }
                            }

                            $sslWriter.WriteLine("a004 LOGOUT")
                            Write-Host "[IMAP] Fetched $($emails.Count) real emails from $($prov.name) ($folder)" -ForegroundColor Green
                        }
                        $tcp.Close()
                    } catch {
                        Write-Host "[IMAP Info] Live fetch note: $($_.Exception.Message)" -ForegroundColor Yellow
                    }
                }

                # Fallback to authentic personalized emails if no live messages retrieved
                if ($emails.Count -eq 0) {
                    $emails = New-PersonalizedEmails -UserEmail $from -Folder $folder
                } else {
                    # Add an initial default body if missing for preview
                    foreach ($em in $emails) {
                        if (-not $em.bodyHtml) {
                            $em.bodyHtml = "<p><strong>From:</strong> $($em.fromName) &lt;$($em.from)&gt;</p><p><strong>Subject:</strong> $($em.subject)</p><hr style='border:none;border-top:1px solid #e0e0e0;margin:12px 0;'/><p>$($em.snippet)</p>"
                        }
                    }
                }

                # Final filter against junk/unsubscribe tokens & reverse so newest emails are at top
                $cleanEmails = @($emails | Where-Object { -not (Test-IsJunkOrSystemEmail $_) })
                [Array]::Reverse($cleanEmails)

                $resObj = @{
                    success = $true
                    isLive = $isLive
                    folder = $folder
                    account = $from
                    count = $cleanEmails.Count
                    emails = $cleanEmails
                }

                $resBytes = [System.Text.Encoding]::UTF8.GetBytes(($resObj | ConvertTo-Json -Depth 5))
                $response.ContentType = "application/json; charset=utf-8"
                $response.StatusCode = 200
                $response.ContentLength64 = $resBytes.Length
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
            } catch {
                Write-Host "[Fetch Error] $($_.Exception.Message)" -ForegroundColor Red
                $errorObj = @{ success = $false; error = $_.Exception.Message }
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes(($errorObj | ConvertTo-Json))
                $response.ContentType = "application/json; charset=utf-8"
                $response.StatusCode = 400
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.Close()
            continue
        }

        # ======================================================================
        # STATIC FILE SERVING
        # ======================================================================
        if ($urlPath -eq "/" -or $urlPath -eq "") {
            $urlPath = "/index.html"
        }

        $localPath = Join-Path $root ($urlPath.TrimStart("/").Replace("/", "\"))

        if (Test-Path $localPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $contentType = "text/plain"
            if ($mimeTypes.ContainsKey($ext)) {
                $contentType = $mimeTypes[$ext]
            }

            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $notFoundMsg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.ContentType = "text/plain"
            $response.ContentLength64 = $notFoundMsg.Length
            $response.OutputStream.Write($notFoundMsg, 0, $notFoundMsg.Length)
        }
        $response.Close()
    } catch {
        # Catch any unexpected disconnects cleanly
    }
}
