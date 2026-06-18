package transliterate

// Glyph is a single character in the reference chart.
type Glyph struct {
	Latin   string `json:"latin"`
	Aksara  string `json:"aksara"`
	Name    string `json:"name"`
	Example string `json:"example,omitempty"`
}

// ChartGroup is a labelled category of glyphs for the encyclopedia/learn page.
type ChartGroup struct {
	Key         string  `json:"key"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Glyphs      []Glyph `json:"glyphs"`
}

// Chart returns the full Aksara Sunda reference grouped by category. It is the
// canonical data source for the "learn the script" page on the frontend.
func Chart() []ChartGroup {
	return []ChartGroup{
		{
			Key:         "swara",
			Title:       "Aksara Swara (Vokal Mandiri)",
			Description: "Tujuh vokal mandiri yang dipakai saat suku kata diawali huruf vokal.",
			Glyphs: []Glyph{
				{"a", "ᮃ", "a", ""},
				{"i", "ᮄ", "i", ""},
				{"u", "ᮅ", "u", ""},
				{"é", "ᮆ", "ae", ""},
				{"o", "ᮇ", "o", ""},
				{"e", "ᮈ", "e (pepet)", ""},
				{"eu", "ᮉ", "eu", ""},
			},
		},
		{
			Key:         "ngalagena",
			Title:       "Aksara Ngalagena (Konsonan)",
			Description: "Konsonan dasar yang membawa vokal bawaan /a/.",
			Glyphs: []Glyph{
				{"ka", "ᮊ", "ka", ""},
				{"ga", "ᮌ", "ga", ""},
				{"nga", "ᮍ", "nga", ""},
				{"ca", "ᮎ", "ca", ""},
				{"ja", "ᮏ", "ja", ""},
				{"nya", "ᮑ", "nya", ""},
				{"ta", "ᮒ", "ta", ""},
				{"da", "ᮓ", "da", ""},
				{"na", "ᮔ", "na", ""},
				{"pa", "ᮕ", "pa", ""},
				{"ba", "ᮘ", "ba", ""},
				{"ma", "ᮙ", "ma", ""},
				{"ya", "ᮚ", "ya", ""},
				{"ra", "ᮛ", "ra", ""},
				{"la", "ᮜ", "la", ""},
				{"wa", "ᮝ", "wa", ""},
				{"sa", "ᮞ", "sa", ""},
				{"ha", "ᮠ", "ha", ""},
			},
		},
		{
			Key:         "ngalagena-serepan",
			Title:       "Ngalagena Panyerepan (Konsonan Serapan)",
			Description: "Konsonan tambahan untuk menulis kata serapan dari bahasa lain.",
			Glyphs: []Glyph{
				{"fa", "ᮖ", "fa", ""},
				{"va", "ᮗ", "va", ""},
				{"qa", "ᮋ", "qa", ""},
				{"xa", "ᮟ", "xa", ""},
				{"za", "ᮐ", "za", ""},
				{"kha", "ᮮ", "kha", ""},
				{"sya", "ᮯ", "sya", ""},
			},
		},
		{
			Key:         "rarangken-vokal",
			Title:       "Rarangkén Vokal",
			Description: "Tanda yang mengubah vokal bawaan /a/ pada konsonan.",
			Glyphs: []Glyph{
				{"-i", "ᮤ", "panghulu", "ki ᮊᮤ"},
				{"-u", "ᮥ", "panyuku", "ku ᮊᮥ"},
				{"-é", "ᮦ", "panéléng", "ké ᮊᮦ"},
				{"-o", "ᮧ", "panolong", "ko ᮊᮧ"},
				{"-e", "ᮨ", "pamepet", "ke ᮊᮨ"},
				{"-eu", "ᮩ", "paneuleung", "keu ᮊᮩ"},
			},
		},
		{
			Key:         "rarangken-konsonan",
			Title:       "Rarangkén Konsonan & Panampa",
			Description: "Tanda sisipan konsonan dan penanda akhir suku kata.",
			Glyphs: []Glyph{
				{"-y-", "ᮡ", "pamingkal", "pya ᮕᮡ"},
				{"-r-", "ᮢ", "panyakra", "pra ᮕᮢ"},
				{"-l-", "ᮣ", "panyiku", "pla ᮕᮣ"},
				{"-ng", "ᮀ", "panyecek", "bang ᮘᮀ"},
				{"-r", "ᮁ", "panglayar", "bar ᮘᮁ"},
				{"-h", "ᮂ", "pangwisad", "bah ᮘᮂ"},
				{"∅", "᮪", "pamaéh", "mati huruf"},
			},
		},
		{
			Key:         "angka",
			Title:       "Angka Sunda",
			Description: "Sistem angka Aksara Sunda dari 0 sampai 9.",
			Glyphs: []Glyph{
				{"0", "᮰", "nol", ""},
				{"1", "᮱", "hiji", ""},
				{"2", "᮲", "dua", ""},
				{"3", "᮳", "tilu", ""},
				{"4", "᮴", "opat", ""},
				{"5", "᮵", "lima", ""},
				{"6", "᮶", "genep", ""},
				{"7", "᮷", "tujuh", ""},
				{"8", "᮸", "dalapan", ""},
				{"9", "᮹", "salapan", ""},
			},
		},
	}
}
