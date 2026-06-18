package transliterate

import "testing"

func TestTransliterate(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"inherent a", "ka", "ᮊ"},
		{"vowel sign i", "ki", "ᮊᮤ"},
		{"vowel sign u", "ku", "ᮊᮥ"},
		{"independent vowel", "aku", "ᮃᮊᮥ"},
		{"final ng (panyecek)", "bang", "ᮘᮀ"},
		{"final r (panglayar)", "bar", "ᮘᮁ"},
		{"final h (pangwisad)", "bah", "ᮘᮂ"},
		{"digraph nga onset", "nga", "ᮍ"},
		{"digraph nya onset", "nyaho", "ᮑᮠᮧ"},
		{"medial panyakra", "pra", "ᮕᮢ"},
		{"medial pamingkal", "pya", "ᮕᮡ"},
		{"trailing dead consonant", "k", "ᮊ᮪"},
		{"multi-syllable lalaki", "lalaki", "ᮜᮜᮊᮤ"},
		{"sunda", "sunda", "ᮞᮥᮔ᮪ᮓ"},
		{"digits", "tahun 2024", "ᮒᮠᮥᮔ᮪ ᮲᮰᮲᮴"},
		{"passthrough punctuation", "a, i", "ᮃ, ᮄ"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := Transliterate(c.in); got != c.want {
				t.Errorf("Transliterate(%q) = %q, want %q", c.in, got, c.want)
			}
		})
	}
}

func TestChartNonEmpty(t *testing.T) {
	groups := Chart()
	if len(groups) == 0 {
		t.Fatal("chart returned no groups")
	}
	for _, g := range groups {
		if g.Key == "" || len(g.Glyphs) == 0 {
			t.Errorf("group %q malformed", g.Title)
		}
	}
}
