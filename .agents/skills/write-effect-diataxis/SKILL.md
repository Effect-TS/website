---
name: write-effect-diataxis
description: Classify, create, restructure, and review Effect documentation using the four Diátaxis modes. Use for tutorials, how-to guides, reference material, and explanation under apps/web/src/content/docs, especially when deciding a page's purpose, detecting mixed documentation modes, or applying category-specific structure.
---

# Write Effect Documentation with Diátaxis

Use Diátaxis to decide what a page is for before deciding how to structure it.
Apply the repository's general writing conventions alongside the selected
documentation mode.

## Apply the general documentation skill

Before editing documentation, read `../write-effect-docs/SKILL.md` completely.
It owns prose, terminology, Effect API explanations, code presentation, links,
typography, stable API claims, and validation. Do not duplicate those rules
here.

## Classify the reader's need

Choose the dominant mode from the need the page serves, not from its folder or
current layout.

| Mode         | Reader's need                                        | Orientation            |
| ------------ | ---------------------------------------------------- | ---------------------- |
| Tutorial     | Acquire skill through a managed learning experience  | Learning and action    |
| How-to guide | Complete a concrete task in real work                | Work and action        |
| Reference    | Find accurate facts about the machinery              | Work and knowledge     |
| Explanation  | Understand why, context, relationships, or tradeoffs | Learning and knowledge |

Do not impose four empty sections or classify mechanically. A short supporting
passage may serve the dominant mode, but do not let it become a second competing
purpose. Move substantial secondary material to its own page and link to it.

If the mode is ambiguous, identify the reader's immediate need and the outcome
the page promises. Treat a mismatch between those two as a finding before
rewriting the page.

Record the dominant mode in the page frontmatter with the `diataxis` field.
Use exactly one of `tutorial`, `how-to`, `reference`, or `explanation`. This
metadata records the page's editorial purpose. It does not determine link
colors or replace the structural requirements of the selected mode.

## Load the selected mode

Read the relevant reference completely before acting:

- For a tutorial, read `references/tutorials.md`.
- For a how-to guide, read `references/how-to-guides.md`.
- For reference material, read `references/reference.md`.
- For explanation, read `references/explanation.md`.

Read more than one reference only when separating a mixed page or resolving a
real boundary ambiguity. Once the dominant mode is clear, apply only that
mode's structure to the page.

## Keep the modes connected

Use links to keep substantial secondary topics out of the current page, not to
decorate Effect API mentions:

- Link tutorials and how-to guides to explanation when a concept would
  interrupt their practical flow.
- Keep complete API facts in reference material. Link to the API Reference as
  a separate related resource only when the reader needs those facts.
- Link reference entries to task-oriented or learning material rather than
  embedding instructions or lessons.
- Link explanations to the practical pages where readers can apply the idea.

## Audit the result

After applying the selected reference, verify that:

- the title, introduction, sections, and ending serve the same reader need;
- practical pages guide action and theoretical pages organize knowledge;
- learning material manages the reader's experience, while work-oriented
  material assumes the competence it requires;
- examples support the page's purpose instead of silently changing it;
- substantial digressions have become links to the appropriate mode.

Apply the validation required by `write-effect-docs` and the selected mode.
