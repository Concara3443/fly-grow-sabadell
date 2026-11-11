# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: university students, mainly from the Grau en Gestió Aeronàutica (UAB, Campus Sabadell), who open the site on their phone from a link shared in group chats or social media. Their job: decide whether to come, register for free, and optionally pre-register for the Entrevistas Express with their CV.

Secondary: aviation-sector companies evaluating whether to sponsor or take part (stand, talk, interviews). They are served by `/empresas/`. When the two audiences conflict, students win.

## Product Purpose

Website for Fly & Grow Sabadell, a university aeronautics congress organised by students of the Grau en Gestió Aeronàutica. It puts sector companies and students trained specifically for that sector in the same room.

2nd edition: 5 May 2027, 15:00, Campus Sabadell (Carrer Emprius, 2, 08202 Sabadell). The 1st edition (6 May 2026) is past.

Success, all measured from the web:
- Registrations through the form (`POST /api/inscripcion`).
- Students who create a profile on the Entrevistas Express platform.
- Companies writing in to book a package.
- Credibility: the congress reads as serious to the UAB and to the sector.

## Positioning

The Grau en Gestió Aeronàutica is practically unique in Spain, so the audience is an unusually specific pool of talent. The congress is the direct contact point between that pool and the companies that hire from it, run by the students themselves, with a live ATC simulation by IVAO España as the signature activity.

## Operating Context

- Program (orientative, modelled on the 1st edition): stands and company talks from 15:00, sector talks 17:30, networking and Entrevistas Express 19:30, stands close 20:00, end 20:30.
- Entrevistas Express: require a UAB email (attending the congress does not). Students pre-register with CV before a deadline, companies review profiles, 5 to 10 minute rotating interviews on the day. May not happen if pre-registrations are low. Needs a UAB email.
- Live ATC: IVAO España simulates Barcelona-El Prat (LEBL) traffic all afternoon, 5 positions (tower and approach); part of the team holds a real ATC licence.
- Company packages (`/empresas/`, from the 2026 dossier, may change for 2027): Despegue 175€, Conexión 250€, Altitud 275€, Primera Clase 400€. There is no free package. Booking is by email to `flyandgrow.sabadell@gmail.com`.
- Contact: `flyandgrow.sabadell@gmail.com`, Instagram `@flyandgrow.sabadell`.

## Capabilities and Constraints

- Static HTML/CSS/JS, inline, no build step. `index.html` (public) and `empresas/index.html` (companies). Small Node backend in `api/` sends registration mail via Resend; `/admin/` is a private, Basic-Auth manual mail form, not part of the public product.
- Served by nginx at `https://flyandgrow.es` (`.online` and `.eu` redirect there).
- Mobile-first: most traffic is phone traffic. Must work on iOS Safari; no reliance on fixed `100vh` or `background-attachment: fixed`.
- Registration is free and non-binding, open to students from any university or degree (confirmed by Guillermo, 2026-11-11).
- Registrants get a confirmation email with an .ics calendar file; personal data is used only to manage the registration.
- Open / unconfirmed:
  - Real URL of the Entrevistas Express platform (currently the MEMEnginy HUB placeholder `https://app.memenginy.cat`).
  - Exact program of the day.
  - Which companies take part in 2027; the collaborators shown are from the 1st edition's folder, with no guarantee they repeat.
  - Whether an English version is wanted in addition to Catalan.

## Brand Commitments

- Name: Fly & Grow Sabadell. Official logos (logotype, isotype, imagotype, colour and white) live in `/home/concara/guillermo/Fly & Grow/Grafismo/00_Recursos/00_Logos_FlyGrow/`.
- Official Fly & Grow corporate blue `#223D58` (from the specifications annex) and UAB institutional green `#008539` (from the UAB logo) are brand colours, not choices.
- Voice: plain Spanish, direct, student-to-student; to companies, informal plural "vosotros".

## Evidence on Hand

- 150 real attendees at the 1st edition.
- Partnership with IVAO España (5 ATC positions).
- Source material: company dossier, specifications annex and IVAO ATC roster in `/home/concara/guillermo/Fly & Grow/`.
- Collaborator logos from the 1st edition in `assets/`.
- No testimonials, photos of the 1st edition, press coverage or confirmed 2027 companies yet. Do not invent any.

## Product Principles

1. Students on a phone first: every decision is judged on a mobile viewport before desktop.
2. Real over promised: only confirmed facts; unconfirmed items are marked as such on the page.
3. Registration is the main action; everything else supports getting there.
4. Credible enough for the UAB and the sector to put their name next to it.

## Accessibility & Inclusion

- Language: a Catalan version is required (UAB / degree context). Currently only Spanish exists. English is undecided.
- No formal accessibility standard has been set.
