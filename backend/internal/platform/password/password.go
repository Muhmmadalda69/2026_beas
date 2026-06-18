// Package password wraps bcrypt so call sites never touch the cost factor or
// comparison details directly.
package password

import "golang.org/x/crypto/bcrypt"

// cost balances security and login latency; 12 is a sensible 2020s default.
const cost = 12

// Hash returns a bcrypt hash suitable for storage.
func Hash(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), cost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// Verify reports whether plain matches the stored hash in constant time.
func Verify(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
