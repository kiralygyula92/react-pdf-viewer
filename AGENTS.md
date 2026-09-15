# Docs & site structure

This project's presentation/documentation site follows the standard in
`docs/ppds/02-plugin-docs-standard.md`. Read it before editing any page,
template, route or nav data.

Hard rules:

- Never hand-write reference/settings/API tables — they are generated.
- Never delete a URL. Retire by 301 redirect only.
- Never invent metrics, testimonials, prices or compatibility claims.
  Emit `TODO:` and log it in GAPS.md instead.
- Badges (New/Preview/Beta/Planned/Deprecated/tier names) are declared on
  nav nodes only, never hardcoded in page content.
- Capability pages keep the section order:
  Basics → variations → recipes → Customization → escape hatch →
  Limitations → API.
