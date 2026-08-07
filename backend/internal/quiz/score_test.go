package quiz

import (
	"encoding/base64"
	"testing"
)

// b64mask renders a grid mask (0/1) whose ink is a square of the given
// half-size centred at (cx,cy), then base64-encodes it the way the client
// transmits drawings.
func b64maskAt(half, cx, cy int) string {
	m := make([]byte, gradeGrid*gradeGrid)
	for y := cy - half; y < cy+half; y++ {
		for x := cx - half; x < cx+half; x++ {
			if x >= 0 && y >= 0 && x < gradeGrid && y < gradeGrid {
				m[y*gradeGrid+x] = 1
			}
		}
	}
	return base64.StdEncoding.EncodeToString(m)
}

func b64mask(half int) string { c := gradeGrid / 2; return b64maskAt(half, c, c) }

func TestGradeWrite(t *testing.T) {
	ref := b64mask(12)

	if got := gradeWrite(ref, ref); got != 100 {
		t.Errorf("identical masks: got %d, want 100", got)
	}

	empty := base64.StdEncoding.EncodeToString(make([]byte, gradeGrid*gradeGrid))
	if got := gradeWrite(ref, empty); got != 0 {
		t.Errorf("empty drawing: got %d, want 0", got)
	}

	// A square shifted well off-centre overlaps only partially → mid/low score.
	c := gradeGrid / 2
	if got := gradeWrite(ref, b64maskAt(12, c+16, c+16)); got <= 0 || got >= 100 {
		t.Errorf("partial overlap: got %d, want (0,100)", got)
	}

	// Malformed / wrong-size payloads grade to 0, never panic.
	if got := gradeWrite(ref, "not-base64!!"); got != 0 {
		t.Errorf("garbage drawing: got %d, want 0", got)
	}
	if got := gradeWrite("", ref); got != 0 {
		t.Errorf("missing reference: got %d, want 0", got)
	}
}
