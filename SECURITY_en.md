# Security Policy

Repository: **Eduardo854832/Wplace-Script**

This document explains how to responsibly report security vulnerabilities affecting this project.

## 1. Reporting a Vulnerability

Choose ONE of the following methods:

1. (Preferred) Open a private security report (if GitHub “Security > Report a vulnerability” is enabled for this repository).
2. Open a new Issue with the title starting with: `[SECURITY]`  
   - Keep details minimal if the impact is high. We can request more info privately.
3. Email: suportecat7252@gmail.com  
   Subject: `Security Report: Wplace-Script`

If the issue is high impact (remote code execution, data exfiltration, account/session takeover), please use email first for coordinated disclosure.

## 2. What to Include

(Please sanitize or redact any sensitive tokens before sending.)

```
Affected file / component:
Severity (your estimate):
Description:
Steps to Reproduce:
Proof of Concept (code / sequence):
Expected Result:
Actual Result:
Impact (who / what can be affected):
Environment (browser, OS, commit SHA):
Suggested Remediation (optional):
Your preferred contact (optional):
```

## 3. Quick Issue Template (Copy & Paste)

```
Title: [SECURITY] <brief summary>

## Description
<clear description>

## Steps to Reproduce
1. ...
2. ...
3. ...

## Impact
<why this matters / potential abuse>

## Proof of Concept
<code / screenshot / sequence>

## Environment
- Browser:
- OS:
- Script version (commit SHA):

## Suggested Fix (optional)
<idea>

## Additional Notes
<anything else>
```

## 4. Coordinated Disclosure

We respectfully request up to 30 days to triage, patch, and release a fix before full public disclosure.  
Timeline goals (best effort):
- Acknowledgment: within 5 business days
- Status update: within 10 business days
- Fix ETA (if confirmed): provided after initial triage

## 5. Out of Scope (Examples)

These will generally not be treated as security vulnerabilities:
- Social engineering attacks
- Issues requiring unrealistic or improbable user interaction
- Vulnerabilities in third‑party browsers/extensions unrelated to this code
- Self XSS requiring user to paste code in console
- Rate limiting “improvements” without demonstrated exploit impact

## 6. Best Practices for Users

- Only use scripts from this official repository.
- Keep your browser updated.
- Do not execute modified bookmarklets from untrusted sources.

## 7. Data & Privacy

The script is not intended to collect personal data beyond what is strictly necessary to interact with wplace.live.  
If you discover unintended data collection, report it immediately.

## 8. Acknowledgments

With your consent, we may credit valid security reporters in release notes or a future acknowledgments section.  
(If you prefer anonymity, state that in your report.)

## 9. Contact Summary

| Method | Use Case | Notes |
|--------|----------|-------|
| Private vulnerability report (GitHub) | Non-public disclosure | If feature enabled |
| Issue `[SECURITY]` | Low/medium issues | Don’t post exploit chains |
| Email (suportecat7252@gmail.com) | High impact / urgent | Use subject format shown |

Thank you for helping keep the project and its users safe!