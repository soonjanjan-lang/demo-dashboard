# Project Instructions

## Purpose

Build and maintain an interactive PhD-level Economics Literature Review teaching dashboard for a research methods course. The dashboard must support both instructor-led teaching and student self-study.

## Audience and academic standard

- Primary audience: Economics PhD students and their instructor.
- Default examples: Malaysian applied microeconomics, development, labour, education, household behaviour, public policy, migration, and cost of living, supplemented by wider economics examples.
- Default citation style: APA 7 unless the user specifies otherwise.
- Distinguish illustrative examples from verified claims and sources.
- Never invent citations, journal rankings, article findings, database coverage, or institutional policies.

## Content requirements

Cover the purpose, search, screening, synthesis, writing, quality appraisal, theory, framework choice, Malaysian literature, gap construction, literature matrices, mind maps, AI-assisted workflows, prompt templates, AI-writing traces, worked examples, worksheets, tutorials, and further teaching resources for a thesis Literature Review chapter.

Use the three source files in the project root as teaching references:

- `allthings-Chapter2.docx`
- `theoretical framework eg.docx`
- `my RF diagrams.pdf`

Preserve the source notes' useful teaching ideas: thematic and funnelled synthesis, references versus bibliography, snowballing, Malaysian-study synthesis, theory-to-concept-to-variable mapping, literature summary matrices, and framework diagrams that connect the issue, research questions, objectives, method, output, and contribution.

## Design and interaction

- Use semantic HTML, modern CSS, and accessible JavaScript.
- Keep the interface responsive and keyboard accessible.
- Provide clickable modules/tabs, search, progress tracking, copyable prompt templates, interactive exercises, and printable/downloadable worksheets.
- Prefer an editorial academic visual direction over a generic SaaS dashboard.
- Use motion sparingly and respect `prefers-reduced-motion`.
- Avoid decorative card overload, fake statistics, and unsupported ranking badges.

## Quality and verification

- Test representative desktop and mobile layouts.
- Check keyboard navigation, contrast, focus states, empty states, and print styles.
- Verify that internal links, tab controls, copy buttons, search, filters, worksheets, and local progress storage work.
- Keep all references and external links readable and traceable.

## Project records

- Append every new user prompt to `PROMPT_LOG.md` with the local Singapore date and time.
- Also append the user's answers to clarification questions.
- Do not overwrite earlier prompt-log entries.

## Deployment

- Push the completed dashboard to `https://github.com/soonjanjan-lang/demo-dashboard`.
- Deploy through GitHub Pages unless the user requests another host.
- Never commit credentials, temporary render files, or local caches.
