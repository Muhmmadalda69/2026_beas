// Package transliterate converts Latin (Romanized Sundanese) text into the
// Aksara Sunda Baku script (Unicode block U+1B80–U+1BBF).
//
// The algorithm is syllable-based. Each Sundanese syllable is an optional
// consonant onset (with optional medial r/l/y), a vowel, and an optional coda.
// Romanization conventions used here:
//
//	digraph consonants : ng ny kh sy
//	medial clusters    : Cr Cl Cy  (e.g. "pra", "klé", "nya" stays nya)
//	vowels             : a i u é o e(=pepet) eu
//	special codas       : -ng -r -h  (panyecek / panglayar / pangwisad)
//	other final cons.   : rendered with pamaaeh (the virama "vowel killer")
//
// All code points below were verified against the Unicode database.
package transliterate

import "strings"

// Independent (standalone) vowel letters — used when a syllable has no onset.
var independentVowel = map[string]rune{
	"a":  'ᮃ', // SUNDANESE LETTER A
	"i":  'ᮄ', // I
	"u":  'ᮅ', // U
	"é":  'ᮆ', // AE  (open e)
	"o":  'ᮇ', // O
	"e":  'ᮈ', // E   (pepet / schwa)
	"eu": 'ᮉ', // EU
}

// Base consonants carry an inherent /a/ vowel (ngalagena).
var baseConsonant = map[string]rune{
	"k":  'ᮊ',
	"q":  'ᮋ',
	"g":  'ᮌ',
	"ng": 'ᮍ',
	"c":  'ᮎ',
	"j":  'ᮏ',
	"z":  'ᮐ',
	"ny": 'ᮑ',
	"t":  'ᮒ',
	"d":  'ᮓ',
	"n":  'ᮔ',
	"p":  'ᮕ',
	"f":  'ᮖ',
	"v":  'ᮗ',
	"b":  'ᮘ',
	"m":  'ᮙ',
	"y":  'ᮚ',
	"r":  'ᮛ',
	"l":  'ᮜ',
	"w":  'ᮝ',
	"s":  'ᮞ',
	"x":  'ᮟ',
	"h":  'ᮠ',
	"kh": 'ᮮ',
	"sy": 'ᮯ',
}

// Vowel signs (rarangkén) replace the inherent /a/ of the preceding consonant.
// "a" has no sign because it is the inherent vowel.
var vowelSign = map[string]rune{
	"i":  'ᮤ', // PANGHULU
	"u":  'ᮥ', // PANYUKU
	"é":  'ᮦ', // PANAELAENG
	"o":  'ᮧ', // PANOLONG
	"e":  'ᮨ', // PAMEPET
	"eu": 'ᮩ', // PANEULEUNG
}

// Medial consonant signs for onset clusters (Cr / Cl / Cy).
var medialSign = map[string]rune{
	"y": 'ᮡ', // PAMINGKAL
	"r": 'ᮢ', // PANYAKRA
	"l": 'ᮣ', // PANYIKU
}

// Dedicated final-consonant signs (coda) for -ng, -r and -h.
var finalSign = map[string]rune{
	"ng": 'ᮀ', // PANYECEK
	"r":  'ᮁ', // PANGLAYAR
	"h":  'ᮂ', // PANGWISAD
}

const pamaaeh = '᮪' // virama: silences the inherent vowel of a consonant

const sundaneseZero = '᮰' // digits run 0..9 contiguously from here

// Transliterate converts an arbitrary Latin string to Aksara Sunda. Characters
// it cannot map (spaces, punctuation, unknown letters) are passed through
// unchanged so prose round-trips cleanly.
func Transliterate(input string) string {
	r := []rune(strings.ToLower(input))
	n := len(r)
	var b strings.Builder

	for i := 0; i < n; {
		// Digits map directly to Sundanese numerals.
		if r[i] >= '0' && r[i] <= '9' {
			b.WriteRune(sundaneseZero + (r[i] - '0'))
			i++
			continue
		}

		// Try to open a syllable with a consonant onset.
		if cons, clen := matchConsonant(r, i); clen > 0 {
			b.WriteRune(baseConsonant[cons])
			i += clen

			// Optional medial (Cr / Cl / Cy): only when a vowel follows it,
			// otherwise the second consonant starts its own syllable.
			if med, mlen := matchMedial(r, i); mlen > 0 {
				if _, vlen := matchVowel(r, i+mlen); vlen > 0 {
					b.WriteRune(medialSign[med])
					i += mlen
				}
			}

			i += writeVowelAndCoda(&b, r, i)
			continue
		}

		// Syllable starting with a bare vowel → independent vowel letter.
		if vow, vlen := matchVowel(r, i); vlen > 0 {
			b.WriteRune(independentVowel[vow])
			i += vlen
			i += writeCoda(&b, r, i)
			continue
		}

		// Anything else (whitespace, punctuation, unmapped rune): pass through.
		b.WriteRune(r[i])
		i++
	}
	return b.String()
}

// writeVowelAndCoda appends the vowel sign (if any) for the current consonant
// onset, then any coda. It returns how many runes were consumed.
func writeVowelAndCoda(b *strings.Builder, r []rune, i int) int {
	consumed := 0
	if vow, vlen := matchVowel(r, i); vlen > 0 {
		if sign, ok := vowelSign[vow]; ok {
			b.WriteRune(sign) // "a" has no sign (inherent), so it is skipped
		}
		consumed += vlen
	} else {
		// Consonant with no following vowel is "dead": silence it with pamaaeh.
		b.WriteRune(pamaaeh)
		return consumed
	}
	return consumed + writeCoda(b, r, i+consumed)
}

// writeCoda appends a dedicated final sign for -ng/-r/-h that is NOT followed by
// a vowel (which would make it the next syllable's onset). Returns runes used.
func writeCoda(b *strings.Builder, r []rune, i int) int {
	cons, clen := matchConsonant(r, i)
	if clen == 0 {
		return 0
	}
	sign, ok := finalSign[cons]
	if !ok {
		return 0 // non-ng/r/h finals fall through to the next loop iteration
	}
	if _, vlen := matchVowel(r, i+clen); vlen > 0 {
		return 0 // a vowel follows → this consonant opens the next syllable
	}
	b.WriteRune(sign)
	return clen
}

// matchConsonant returns the longest consonant (digraph preferred) at index i.
func matchConsonant(r []rune, i int) (string, int) {
	if i+1 < len(r) {
		two := string(r[i : i+2])
		if _, ok := baseConsonant[two]; ok {
			return two, 2
		}
	}
	if i < len(r) {
		one := string(r[i])
		if _, ok := baseConsonant[one]; ok {
			return one, 1
		}
	}
	return "", 0
}

// matchMedial returns r/l/y at index i when usable as a medial sign.
func matchMedial(r []rune, i int) (string, int) {
	if i < len(r) {
		one := string(r[i])
		if _, ok := medialSign[one]; ok {
			return one, 1
		}
	}
	return "", 0
}

// matchVowel returns the longest vowel ("eu" preferred) at index i.
func matchVowel(r []rune, i int) (string, int) {
	if i+1 < len(r) && string(r[i:i+2]) == "eu" {
		return "eu", 2
	}
	if i < len(r) {
		one := string(r[i])
		if _, ok := independentVowel[one]; ok {
			return one, 1
		}
	}
	return "", 0
}
