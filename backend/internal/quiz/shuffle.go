package quiz

import (
	"crypto/rand"
	"math/big"
)

// secureIntn returns a uniformly random integer in [0, n) using a CSPRNG.
// Using crypto/rand makes the per-play ordering unpredictable, so players
// cannot learn or memorise a fixed question/answer sequence.
func secureIntn(n int) int {
	if n <= 0 {
		return 0
	}
	v, err := rand.Int(rand.Reader, big.NewInt(int64(n)))
	if err != nil {
		// rand.Reader effectively never fails; fall back deterministically.
		return 0
	}
	return int(v.Int64())
}

// shuffle performs an in-place unbiased Fisher–Yates shuffle.
func shuffle[T any](s []T) {
	for i := len(s) - 1; i > 0; i-- {
		j := secureIntn(i + 1)
		s[i], s[j] = s[j], s[i]
	}
}

// pickN returns up to n elements drawn at random (without replacement) from s.
// It shuffles a copy so the source slice is left untouched.
func pickN[T any](s []T, n int) []T {
	cp := make([]T, len(s))
	copy(cp, s)
	shuffle(cp)
	if n > len(cp) {
		n = len(cp)
	}
	return cp[:n]
}
