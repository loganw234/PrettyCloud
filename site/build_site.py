#!/usr/bin/env python3
"""The front door, built from one place.

FOUR HAND-WRITTEN HEADS WOULD DRIFT. Every page needs the same share
card tags, the same nav, the same footer, and the moment they are copied
one of them stops matching - which is the exact failure this whole
project has a test suite about. So the pages are content here and HTML
on disk, the same manifest-to-artefact shape the book uses.

    python site/build_site.py

Writes site/*.html. Nothing here is live: the atlas still owns the repo
root, and this sits in site/ until Logan has looked at it.
"""
import html
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = "https://prettycloud.io"
CARD = f"{SITE}/og/atlas-card.jpg"

NAV = [("index.html", "The work"), ("book.html", "The book"),
       ("prints.html", "Prints"), ("about.html", "About")]

SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="Pretty Cloud">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{card}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{card}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400&family=Ubuntu+Mono&display=swap" rel="stylesheet">
<link rel="stylesheet" href="site.css">
</head>
<body>
<div class="bar">
  <a class="home" href="index.html">Pretty&nbsp;Cloud</a>
  <nav>{nav}</nav>
</div>
<main>
{body}
</main>
<footer>
<p>Every photograph here is of an object with no physical existence,
made by a camera that has never been built, through glass that mostly no
longer exists. The instrument is specified, and what it does not do is
written down beside what it does.</p>
<p class="mono">Logan White · <a href="mailto:logan@improperaperture.com">logan@improperaperture.com</a>
· <a href="https://github.com/loganw234/PrettyCloud">source</a></p>
</footer>
</body>
</html>
"""


def page(slug, title, desc, body):
    nav = "".join(
        f'<a href="{h}"{" aria-current=page" if h == slug else ""}>'
        f'{html.escape(t)}</a>' for h, t in NAV)
    return SHELL.format(title=html.escape(title), desc=html.escape(desc),
                        url=f"{SITE}/{slug}", card=CARD, nav=nav, body=body)


PAGES = {}

# ---- the front door -------------------------------------------------
PAGES["index.html"] = dict(
    title="Pretty Cloud — photographs of things that have never existed",
    desc="A film camera for things that have never existed, with real "
         "glass in front of it. Fifty-six mathematical objects, "
         "photographed through a thousand lenses traced from their patents.",
    body="""
<h1>Photographs of things<br>that have never existed</h1>
<p class="lede">A film camera for things that have never existed,
with real glass in front of it.</p>

<figure>
  <img src="../og/atlas-card.jpg" alt="The Hopf fibration: nested
       luminous rings in yellow, magenta and blue on black.">
  <figcaption>Plate I, the Hopf fibration. Every closed curve here is
  the preimage of one point on an ordinary sphere, and any two of them,
  chosen anywhere, are linked exactly once.</figcaption>
</figure>

<p>The subjects are mathematical objects — fifty-six of them, each a few
lines of arithmetic rather than a model on a disk. The camera is a
four-by-five sheet that exists only as a program: the focal length falls
out of a declared field of view, the aperture is a real entrance pupil
computed from it, and the exposure accumulates one pass at a time and
converges, because that is what an exposure does.</p>

<p>In front of it is real glass. A thousand and nine objectives, 1840 to
2007, each traced from the radii and thicknesses its own patent records.
Their faults are not dialled in. They are what the tracing produces, and
where a design refuses to trace honestly the camera says so rather than
substituting the nearest survivor.</p>

<p>None of that makes a picture better. It makes it checkable, which is
a different property and a more useful one.</p>

<hr>

<div class="cols">
  <div>
    <p class="label">Play</p>
    <p>The atlas runs in a browser. Fifty-six objects, drawn a million
    points at a time, with the levers exposed — which is how anybody,
    including me, finds out what they do.</p>
    <p><a class="go" href="/">Open the atlas</a></p>
  </div>
  <div>
    <p class="label">Read</p>
    <p>Volume one is the instrument described the way a camera is
    described: what it is, what it measures, and what it does not do —
    the absences printed at the same size as the measurements.</p>
    <p><a class="go quiet" href="book.html">The book</a></p>
  </div>
  <div>
    <p class="label">Own</p>
    <p>Prints are made one at a time, on cotton rag. Each carries the
    full parameter set it was made from, so a print made next year can
    be measured against the one before it.</p>
    <p><a class="go quiet" href="prints.html">Prints</a></p>
  </div>
</div>
""")

# ---- the book -------------------------------------------------------
PAGES["book.html"] = dict(
    title="The book — Pretty Cloud",
    desc="Volume one: the Atlas Camera Mk1, described the way a camera "
         "is described, with its absences printed at the same size as "
         "its measurements.",
    body="""
<h1>Volume one</h1>
<p class="lede">The instrument, described the way a camera is described
— including what it refuses to do.</p>

<p>It opens with a video game. Mercenaries 2 stores every bone of every
model under a 32-bit hash and ships none of the names, and a string that
collides with one of those hashes will load the bone perfectly while not
being the name at all. The two are indistinguishable by arithmetic. What
separated them was a fact from outside the arithmetic entirely — where
the bone actually sat.</p>

<p>That is the whole book, applied to light. A glow added because it
looks nice is a colliding string: it works and it means nothing. So the
aperture is a real pupil, the glass is transcribed from patents, the
printing processes absorb light by their own coefficients, and every
number in the text is measured against the thing that produced it rather
than typed beside it.</p>

<p>It also prints what went wrong. Four aberration terms shipped
inverted or scaled, every one of them producing a plausible photograph
— which is the argument for measuring rather than looking, made at my
own expense.</p>

<div class="spec">
  <div class="k">Extent</div><div class="v">62 pages</div>
  <div class="k">Trim</div><div class="v">17 × 11 inches, landscape</div>
  <div class="k">Binding</div><div class="v">Lay-flat — three spreads
      cross the gutter and one puts its brightest passage on the fold</div>
  <div class="k">Type</div><div class="v">Ubuntu and Ubuntu Mono</div>
  <div class="k">Colour</div><div class="v">Adobe RGB (1998), 16-bit,
      360 ppi</div>
  <div class="k">Status</div><div class="v">Drafted and in proof. Not yet
      printed.</div>
</div>

<h2>It will be free to read</h2>
<p>The complete PDF, not an extract. A book nobody can read is worth
nothing, and the argument is the reason to have made any of this. The
hardcover, when it exists, will be a short run — and it will carry
nothing the PDF lacks, because a free version deliberately crippled
stops doing the only job it has.</p>
<p class="note">Neither is available yet. This page will say so when
that changes.</p>
""")

# ---- prints ---------------------------------------------------------
PAGES["prints.html"] = dict(
    title="Prints — Pretty Cloud",
    desc="Prints made one at a time on cotton rag, each carrying the "
         "full parameter set it was made from.",
    body="""
<h1>Prints</h1>
<p class="lede">Made one at a time, and reproducible to the file.</p>

<p>Two renders of one specification produce a bit-identical negative and
a bit-identical file — not a similar one. That is a property of how the
studio was built rather than a claim about it, and it is what makes the
rest of this page mean anything.</p>

<h2>What comes with one</h2>
<div class="spec">
  <div class="k">The certificate</div>
  <div class="v">The full parameter set — plate, lens, aperture, focus,
      passes, process and paper — from which the exact file can be
      regenerated. Not a signature attesting to a print; a recipe that
      reproduces it.</div>
  <div class="k">The edition</div>
  <div class="v">Numbered, and recorded in the studio ledger. The ledger
      refuses to number a print beyond the declared size, so the edition
      cannot quietly grow.</div>
  <div class="k">A permalink</div>
  <div class="v">A code on the card resolving to the living plate with
      the exact settings the print was made at, so the object can be
      picked up and turned — the one thing paper cannot do.</div>
  <div class="k">Paper</div>
  <div class="v">Cotton rag, pigment, 360 ppi. Supplied unframed.</div>
</div>

<h2>Commissions</h2>
<p>A commissioned print is an edition of one: you choose the subject,
the glass and the size, and it is made here and carries the same
certificate as any other print.</p>
<p>A commissioned <em>file</em> is the master, delivered — and it is
sold explicitly as not a print. No certificate, no edition number, no
plate numeral. Once the file leaves, the paper, the profile and the ink
are somebody else's decisions, and it would be dishonest to let the
guarantees travel with the download.</p>

<hr>
<p class="note">Nothing is for sale here yet — the first edition has not
been printed. If you want to be told when it is, or want to ask about a
commission, write to
<a href="mailto:logan@improperaperture.com">logan@improperaperture.com</a>.</p>
""")

# ---- about ----------------------------------------------------------
PAGES["about.html"] = dict(
    title="About — Pretty Cloud",
    desc="How a video game's deleted bone names turned into a camera, "
         "and why the difference between working and being true is the "
         "whole point.",
    body="""
<h1>How this got here</h1>
<p class="lede">It began with a video game from 2008 and a set of names
somebody deleted.</p>

<p>Mercenaries 2 keeps 9,539 bone hashes and no names. The hash is weak
enough to guess against, so finding a string that produces a given one
is easy — and I wrote a tool that does exactly that. Feed the engine a
colliding string and it loads the bone quite happily, because the engine
only ever knew the number.</p>

<p>But a working handle is not the name. It is a nonsense word that
happens to collide, and what I wanted was the word a developer typed in
2007. Those two are indistinguishable by arithmetic. The thing that
separated them was not more computation; it was information from outside
the hash entirely — every bone has a position, and a bone at the front
left of a vehicle, low down, near the ground, is a wheel.</p>

<p>Asking that question meant plotting nine and a half thousand points
in three dimensions and turning them around to see whether anything
clustered. That program is where the camera came from, and it explains
something that would otherwise look strange about it: it does not draw
surfaces. It has no polygons and no shading model. It accumulates
points, one at a time, because it grew out of something written to look
at a cloud of positions and work out whether they meant anything.</p>

<h2>Something can work and not be true</h2>
<p>A glow added because it looks nice is a colliding string. It works
and it means nothing — and worse, it is unfalsifiable. If the corners
are soft because I decided they should be, nothing about the picture can
be wrong, and a picture that cannot be wrong cannot be right either.</p>

<p>So the instrument was made real in every respect that could be made
real, and then allowed to do whatever that turns out to make it do. The
rules are not mine: diffraction at a circular aperture has one answer, a
Topogon has the field curvature it has because Robert Richter chose
those radii in 1933 solving for aerial survey, and the glass catalogue
is published by the people who melt the glass. Each of those is a place
this work touches something outside itself and can be found wanting.</p>

<h2>Who is doing this</h2>
<p>I am a carpenter. I am not a mathematician and not a programmer by
trade, and I did not choose the Hopf fibration because I understand
fibre bundles — I chose it because it is a few lines of arithmetic that
produce something no drawing can honestly show, and I wanted to look
at it.</p>

<p>That turns out to disqualify nothing, and I think the trade is why I
was comfortable with it. A carpenter works to a measurement. You do not
need a theory of timber to build a straight door; you need to know what
the material does, to check the thing you made against a number rather
than against your own opinion of it, and to be honest about the
tolerance you actually held. That is the entire method here, applied to
a different material.</p>
""")


def main():
    for slug, p in PAGES.items():
        (HERE / slug).write_text(
            page(slug, p["title"], p["desc"], p["body"]), encoding="utf-8")
        print(f"  {slug:14s} {len(p['body']):6d} chars  {p['title'][:44]}")
    print(f"\nwrote {len(PAGES)} pages into {HERE}")


if __name__ == "__main__":
    main()
