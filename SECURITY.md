# Security policy

## Supported versions

Security fixes are released for the latest minor version of `@kiralygyula92/react-pdf-viewer`.

## Reporting a vulnerability

Please do **not** open a public issue. Report vulnerabilities privately through
[GitHub security advisories](https://github.com/kiralygyula92/react-pdf-viewer/security/advisories/new).
Include the affected version, a description of the impact and, ideally, a minimal reproduction
(for example a crafted PDF).

You can expect an acknowledgement within a few days. Once a fix is released, the advisory is
published with credit to the reporter unless you prefer to stay anonymous.

## Scope and hardening

- PDF parsing and rendering are done by [PDF.js](https://github.com/mozilla/pdf.js). Vulnerabilities
  in PDF.js itself should be reported to Mozilla; this package keeps its peer range on patched
  versions (CVE-2024-4367 is excluded) and passes `isEvalSupported: false`.
- The viewer never injects `<script>` tags, never reads globals such as `window.pdfjsLib`, and
  opens external document links with `rel="noopener noreferrer nofollow"`.
