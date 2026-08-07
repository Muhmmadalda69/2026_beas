package quiz

import (
	"encoding/base64"
	"math"
)

// Server-side grading of "write" questions. A drawing is a GRID×GRID binary
// ink mask. The learner submits their mask; we compare it against the trusted
// reference mask stored with the question (computed once at authoring time).
//
// This mirrors the client-side scorer in the web app (lib/aksaraScore.ts) so
// the on-screen practice score and the graded quiz score agree: a distance-
// tolerant precision/recall, combined via F1.
const (
	gradeGrid  = 64 // reference & submitted masks are gradeGrid×gradeGrid
	gradeTol   = 3  // distance tolerance in cells (~14px at the 340px canvas)
	writeFloor = 40 // similarity below this earns 0 points (too dissimilar)
)

// decodeMask turns a base64 payload into a 0/1 mask of exactly grid*grid cells.
// Any non-zero byte counts as ink. Returns nil if the payload is the wrong size.
func decodeMask(b64 string, grid int) []byte {
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil || len(raw) != grid*grid {
		return nil
	}
	mask := make([]byte, len(raw))
	for i, v := range raw {
		if v != 0 {
			mask[i] = 1
		}
	}
	return mask
}

// distanceTransform: for each cell, the approximate Euclidean distance to the
// nearest ink cell (two-pass Chamfer 3-4). Ink cells are 0.
func distanceTransform(mask []byte, w, h int) []float64 {
	const inf = 1e9
	d := make([]float64, w*h)
	for i := range d {
		if mask[i] != 0 {
			d[i] = 0
		} else {
			d[i] = inf
		}
	}
	const d1, d2 = 1.0, math.Sqrt2
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			i := y*w + x
			if d[i] == 0 {
				continue
			}
			if x > 0 {
				d[i] = math.Min(d[i], d[i-1]+d1)
			}
			if y > 0 {
				d[i] = math.Min(d[i], d[i-w]+d1)
			}
			if x > 0 && y > 0 {
				d[i] = math.Min(d[i], d[i-w-1]+d2)
			}
			if x < w-1 && y > 0 {
				d[i] = math.Min(d[i], d[i-w+1]+d2)
			}
		}
	}
	for y := h - 1; y >= 0; y-- {
		for x := w - 1; x >= 0; x-- {
			i := y*w + x
			if d[i] == 0 {
				continue
			}
			if x < w-1 {
				d[i] = math.Min(d[i], d[i+1]+d1)
			}
			if y < h-1 {
				d[i] = math.Min(d[i], d[i+w]+d1)
			}
			if x < w-1 && y < h-1 {
				d[i] = math.Min(d[i], d[i+w+1]+d2)
			}
			if x > 0 && y < h-1 {
				d[i] = math.Min(d[i], d[i+w-1]+d2)
			}
		}
	}
	return d
}

// compareMasks returns a 0..100 similarity between a reference and a user mask:
// the F1 of distance-tolerant precision (user ink lying on the glyph) and
// recall (glyph covered by user ink). Returns 0 when the user drew too little.
func compareMasks(ref, user []byte, w, h int, tol float64) int {
	distR := distanceTransform(ref, w, h)
	distU := distanceTransform(user, w, h)

	var refCount, refCovered, userCount, userOn int
	for i := range ref {
		if ref[i] != 0 {
			refCount++
			if distU[i] <= tol {
				refCovered++
			}
		}
		if user[i] != 0 {
			userCount++
			if distR[i] <= tol {
				userOn++
			}
		}
	}
	if refCount == 0 || float64(userCount) < float64(refCount)*0.03 {
		return 0
	}
	precision := float64(userOn) / float64(userCount)
	recall := float64(refCovered) / float64(refCount)
	if precision+recall == 0 {
		return 0
	}
	f1 := 2 * precision * recall / (precision + recall)
	score := int(f1*100 + 0.5)
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}
	return score
}

// gradeWrite scores a submitted drawing (base64 mask) against a question's
// reference mask (base64), returning 0..100. Malformed or missing input is 0.
func gradeWrite(refB64, drawingB64 string) int {
	ref := decodeMask(refB64, gradeGrid)
	user := decodeMask(drawingB64, gradeGrid)
	if ref == nil || user == nil {
		return 0
	}
	return compareMasks(ref, user, gradeGrid, gradeGrid, gradeTol)
}
