+++
title = "About This Site"
description = "What this site is, what is on it, and how it was built: drawn illustrations, step-by-step animations, vision simulators and private eye drop tools."
template = "page.html"
date = 2026-11-11
updated = 2026-11-11
weight = 7

[extra]
article = true
+++

This site is a plain-language reference on eye health, especially glaucoma and cataract, with practical tools for people who use eye drops. It is written for patients anywhere, and their families, to help them understand their eyes and their care and come to appointments with good questions. It is general education, not medical advice.

## What is on it

- **More than 40 articles** on [glaucoma](@/learn/glaucoma/_index.md), [cataract](@/learn/cataract/_index.md), [dry eye](@/learn/dry-eye/_index.md), the [cornea](@/learn/cornea/_index.md) and the [retina](@/learn/retina/_index.md), each ending with questions worth asking.
- **Step-by-step animations** of lasers and operations, from [SLT](@/learn/slt-laser.md) and [MIGS](@/learn/migs.md) to [vitrectomy](@/learn/vitrectomy.md), that can be played or stepped through, and opened full screen in the exam room.
- **Simulators** that show what words cannot: [what vision loss looks like](@/learn/vision-loss.md) in different eye diseases, what a [glasses prescription](@/learn/glasses-prescription.md) means, how each [lens implant](@/learn/lens-implants.md) sees at different distances, and how each glaucoma treatment changes the [eye pressure](@/learn/eye-pressure.md).
- **Tools for eye drops**: a [medication reference](@/patients/eye-drops.md) with photos and cap colors, the [Post-Op Eye Drop Schedule](@/patients/post-op-schedule.md), and a [schedule builder](@/patients/eye-drop-form.md) that prints a daily routine, adds reminders to a phone's calendar and makes a QR code.
- **A [search](@/search.md)** across every page and medication.

## How it is made

- **Every illustration and animation is drawn for this site.** The pictures of the eye are drawn in code, so the same anatomy appears consistently from page to page, stays sharp on any screen, and loads quickly.
- **The simulators run on your own device**, using everyday photographs and the browser's own image filters. Nothing is uploaded.
- **The schedule tools are private.** Your choices stay in your browser and in the page's address; nothing is sent to a server. See [Privacy](@/privacy.md).
- **The dosing rules are tested automatically.** Every change to the site is checked before it goes live: links, spelling, page layout, and that the drop schedules in the articles agree with the schedule tools.
- **Built for phones first**, and checked at phone and desktop sizes, with printing in mind for the schedules and the Amsler grid.
- **No advertising, no cookies, no tracking** across other sites. A privacy-friendly counter records only which pages are read.

Dr. Katz designed the site and reviews everything on it. It was built with the help of AI tools.

## For the technically curious

- A static site built with [Zola](https://www.getzola.org/), hosted on Cloudflare Pages, with small server functions for the contact form and the visitor counter
- Plain JavaScript with no frameworks, and SVG for every drawing and animation
- Automated tests and a build check on every change, with a preview of each change before it is published
- A strict content security policy: the pages load scripts, fonts and images from this site only

Questions or suggestions about the site are welcome through the [Contact](@/contact/_index.md) page.
