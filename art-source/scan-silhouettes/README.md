# Scan silhouette test — 03 Nerve Forest

Concept test only. Not runtime art.

The sheet checks whether the three proposed scan silhouettes survive at 36×36
against the actual 03 room, before spending a Nano Banana generation pass:

- **Neuron** — star-crowned teardrop cell with a curled axon and fork.
- **Myelin** — continuous capsule with a pinched node.
- **Pathway** — three-bead chain with a terminal fork.

Open `index.html` or view `scan-silhouette-review.png`. The review page places
the shapes at the real `scan-neuron`, `scan-myelin`, and `scan-pathway` positions
and compares them with the Neuron Keeper, the two pads, and the accepted
synapse/muscle scans.

The first pass (v1) failed: the neuron read as a blob, myelin as two eggs, and
pathway as three dots. v2 is the current review. Re-run `node shot.mjs` after
editing the SVG shapes.

This directory is intentionally outside `public/`; it must never be wired into
the runtime manifest.
