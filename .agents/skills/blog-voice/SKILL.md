---
name: blog-voice
description: Writing style for Effect website blog posts, especially Module of the Week. Use whenever drafting, outlining, rewriting or reviewing prose in apps/web/src/content/blog, including intros, section transitions, reader questions, captions that lead into interactive visuals, and endings.
---

# Blog voice

Posts on this site teach one idea at a time, in the voice of a person explaining something to a friend at a whiteboard. The reader should never feel lectured, sold to, or rushed. Every section earns the next one.

This skill covers voice and structure. For removing machine-sounding patterns, also apply the `unslop` / `unslop-text` skill.

## Process

1. Find the one idea the post is about, in a single plain sentence. If you can't, stop and ask.
2. Pick the smallest concrete scenario that shows the problem. Plan sections so each one adds exactly one new thing.
3. Draft the prose using the rules below.
4. Read it aloud in your head. Anything you wouldn't say out loud to a colleague gets rewritten.
5. Run the self-check at the end of this file.

## Openings

- Open with a plain observation the reader already agrees with. No framing device, no "In today's world", no announcing what the module is ("This week's module is X").
  - Good: "Your server and your client both have an opinion about what a request looks like."
  - Bad: "This week's module is `HttpApi`, the most requested module on the voting page."
- Within the first few paragraphs, say what the tool does in one or two sentences, in terms of the problem you just described.
- Then a short roadmap. Module of the Week posts use the "By the end of this post, you'll know:" ordered list, three or four items, each a plain phrase.
- If the post assumes prior knowledge, say so directly and link to it.

## Cadence

- Most sentences are medium length. Most paragraphs are two to five sentences.
- Use a one-line paragraph as a beat after a reveal or a failure: "Stopped at the door." "Much better." "Sadly not." Don't use more than one or two per section.
- Use contractions everywhere: it's, doesn't, we'll, I'd.
- Questions are welcome, both rhetorical and from the reader.
- Don't stack tidy parallel pairs or punchy summary lines ("Change one and the other has to follow."). If a sentence sounds like a tagline, cut it or say it plainly.
- Avoid em dashes. Use a period or a comma.

## Voice

- "I" for decisions, opinions and mistakes: "I'd reach for this first." "I blame the two lists."
- "You" for the reader and what they'll see or do.
- "We" for working something out together: "We need one menu that both sides read."
- Hedge like a person, not a paper: "in my opinion", "I'm not sure why this works, but it does". Never "it could be argued".
- Humour is dry and comes from the running example, callbacks to earlier jokes, and the author being wrong. No puns stacked on puns, no exclamation marks to signal a joke.
- Small asides to the reader are good: "This is the only config in the post, I promise."
- Praise needs a qualifier or a reason. Never "powerful", "seamless", "robust", "elegant".

## Progressive disclosure

- Show before you name. Let the reader watch the thing happen, then tell them what it's called: "...and that's called middleware."
- Define jargon in plain words right after naming it. Bold a term only the first time it's defined.
- Add one variable per section. If a section introduces two new APIs, split it or cut one.
- Hold back internals until the reader has a reason to care. It's fine to say "we'll meet that something shortly."
- A running example threads through the whole post. Each section is another attempt, another twist, or another consequence of that example, never a detour to explain an unrelated feature.

## Code

- Show the smallest snippet that makes the point. Collapse imports and boilerplate with Expressive Code `collapse`.
- When code changes, show a diff (`ins={...}` / `del={...}`) of just the changed part, not the whole file again.
- Put the explanation after the snippet, starting from the top of it: "Start from the top."
- Every snippet must compile and every output comment must be real. Run it.

## Interactive visuals

- One visual, one message. If it needs a caption to be understood, it's too busy.
- Lead in with a short imperative: "Press **Send**." "Drag the slider to go forward in time."
- Lead out by pointing at what to notice, or by naming what just happened: "Stopped at the door." "Did you notice the handler never ran?"
- Don't describe the visual before the reader has used it.

## Reader questions

- Use the `ReaderAsks` component for the objection a sharp reader would raise at that exact point: "Couldn't the app and the kitchen just share a TypeScript type?"
- Answer in the very next paragraph, briefly. Concede when the reader is right ("They could, and the app would be better for it.") and then explain what's still missing.
- A few per post. Never use one just to restate what you said.

## Transitions and headings

- Headings are short, in sentence case, and can be a question or a step in the story ("Attempt 2: skip the compiler").
- End a section on a verdict or a hook into the next one: "Of course, a compiler can only stop you if you use one."
- Start sections with the situation, not a summary of the previous one.

## Endings

- A short recap list of what the reader learned, one plain sentence each.
- A link to the runnable code.
- One last callback to the running joke, kept modest.
- Module of the Week posts sign off with "Until next time, Happy Effecting!"

## What to avoid

- Announcing the topic or why it was chosen.
- Marketing language and inflated adjectives.
- Long bulleted lists in the body. Prose carries the explanation; lists are for recaps and roadmaps.
- Bold for emphasis. Use italics for stress, bold only for a newly defined term.
- Explaining the whole API up front.
- Ending on generic optimism ("the possibilities are endless").

## Self-check

Before handing a draft back, check each of these:

- Could the opening line appear in any other post? Rewrite it to be about this problem.
- Is there a sentence you wouldn't say out loud? Rewrite it.
- Does any section introduce more than one new concept? Split it.
- Is any term used before it's shown? Move it.
- Does every visual have a lead-in and something to notice after?
- Any em dashes, taglines, or "not just X, but Y"? Remove them.
