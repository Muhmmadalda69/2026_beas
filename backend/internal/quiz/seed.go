package quiz

import "context"

// Seed creates a starter set of leveled questions when no levels exist. The
// three tiers deliberately increase in difficulty: recognising single glyphs,
// then vowel signs/syllables, then whole words and final consonants.
func (s *Service) Seed(ctx context.Context) error {
	n, err := s.repo.CountLevels(ctx)
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}

	for _, ls := range seedData {
		level, err := s.repo.CreateLevel(ctx, ls.level)
		if err != nil {
			return err
		}
		for _, q := range ls.questions {
			if _, err := s.repo.CreateQuestion(ctx, level.ID, q); err != nil {
				return err
			}
		}
	}
	return nil
}

type levelSeed struct {
	level     LevelInput
	questions []QuestionInput
}

var seedData = []levelSeed{
	{
		level: LevelInput{Number: 1, Title: "Tingkat 1 — Pangenal Aksara", Difficulty: "Pemula", PassScore: 60, DrawCount: 5,
			Description: "Mengenali aksara ngalagena dan swara dasar satu per satu."},
		questions: []QuestionInput{
			{Prompt: "Aksara manakah yang dibaca \"ka\"?", Options: []string{"ᮊ", "ᮌ", "ᮕ", "ᮒ"}, CorrectIndex: 0, Points: 10, Explanation: "ᮊ adalah aksara ngalagena \"ka\"."},
			{Prompt: "Aksara manakah yang dibaca \"ma\"?", Options: []string{"ᮔ", "ᮙ", "ᮘ", "ᮜ"}, CorrectIndex: 1, Points: 10, Explanation: "ᮙ adalah aksara ngalagena \"ma\"."},
			{Prompt: "Vokal mandiri \"a\" ditulis dengan?", Options: []string{"ᮃ", "ᮄ", "ᮅ", "ᮇ"}, CorrectIndex: 0, Points: 10, Explanation: "ᮃ adalah aksara swara \"a\"."},
			{Prompt: "Aksara ᮜ dibaca?", Options: []string{"ra", "la", "na", "da"}, CorrectIndex: 1, Points: 10, Explanation: "ᮜ dibaca \"la\"."},
			{Prompt: "Aksara ᮞ dibaca?", Options: []string{"sa", "ca", "ja", "ya"}, CorrectIndex: 0, Points: 10, Explanation: "ᮞ dibaca \"sa\"."},
			{Prompt: "Aksara manakah yang dibaca \"nga\"?", Options: []string{"ᮑ", "ᮍ", "ᮌ", "ᮔ"}, CorrectIndex: 1, Points: 10, Explanation: "ᮍ adalah \"nga\"."},
			{Prompt: "Vokal mandiri \"i\" ditulis dengan?", Options: []string{"ᮅ", "ᮄ", "ᮆ", "ᮃ"}, CorrectIndex: 1, Points: 10, Explanation: "ᮄ adalah aksara swara \"i\"."},
		},
	},
	{
		level: LevelInput{Number: 2, Title: "Tingkat 2 — Rarangkén Vokal", Difficulty: "Menengah", PassScore: 65, DrawCount: 5,
			Description: "Menggabungkan konsonan dengan tanda vokal (rarangkén) menjadi suku kata."},
		questions: []QuestionInput{
			{Prompt: "Bagaimana menulis suku kata \"ki\"?", Options: []string{"ᮊᮤ", "ᮊᮥ", "ᮊᮧ", "ᮊᮦ"}, CorrectIndex: 0, Points: 12, Explanation: "ᮊ + panghulu (ᮤ) = ki."},
			{Prompt: "Bagaimana menulis suku kata \"ku\"?", Options: []string{"ᮊᮤ", "ᮊᮥ", "ᮊᮨ", "ᮊᮩ"}, CorrectIndex: 1, Points: 12, Explanation: "ᮊ + panyuku (ᮥ) = ku."},
			{Prompt: "Tanda rarangkén yang menghasilkan bunyi \"o\" adalah?", Options: []string{"panghulu ᮤ", "panolong ᮧ", "panyuku ᮥ", "pamepet ᮨ"}, CorrectIndex: 1, Points: 12, Explanation: "Panolong (ᮧ) mengubah vokal menjadi /o/."},
			{Prompt: "Suku kata ᮘᮦ dibaca?", Options: []string{"bi", "bu", "bé", "bo"}, CorrectIndex: 2, Points: 12, Explanation: "ᮘ + panéléng (ᮦ) = bé."},
			{Prompt: "Apa nama tanda untuk bunyi \"eu\"?", Options: []string{"paneuleung", "pamepet", "panghulu", "panyuku"}, CorrectIndex: 0, Points: 12, Explanation: "Paneuleung (ᮩ) menghasilkan /eu/."},
			{Prompt: "Bagaimana menulis suku kata \"me\" (pepet)?", Options: []string{"ᮙᮦ", "ᮙᮨ", "ᮙᮤ", "ᮙᮧ"}, CorrectIndex: 1, Points: 12, Explanation: "ᮙ + pamepet (ᮨ) = me."},
		},
	},
	{
		level: LevelInput{Number: 3, Title: "Tingkat 3 — Kecap jeung Panampa", Difficulty: "Mahir", PassScore: 70, DrawCount: 5,
			Description: "Menulis kata utuh dengan tanda akhir suku kata (panyecek, panglayar, pangwisad, pamaéh)."},
		questions: []QuestionInput{
			{Prompt: "Tanda untuk akhiran \"-ng\" (seperti \"bang\") adalah?", Options: []string{"panglayar ᮁ", "panyecek ᮀ", "pangwisad ᮂ", "pamaéh ᮪"}, CorrectIndex: 1, Points: 15, Explanation: "Panyecek (ᮀ) menandai akhiran -ng."},
			{Prompt: "Kata \"sunda\" ditulis sebagai?", Options: []string{"ᮞᮥᮔ᮪ᮓ", "ᮞᮔ᮪ᮓ", "ᮞᮥᮔᮓ", "ᮞᮥᮒ᮪ᮓ"}, CorrectIndex: 0, Points: 15, Explanation: "su (ᮞᮥ) + n mati (ᮔ᮪) + da (ᮓ)."},
			{Prompt: "Fungsi tanda pamaéh (᮪) adalah?", Options: []string{"mengubah vokal jadi i", "mematikan vokal bawaan", "menambah bunyi -r", "menggandakan konsonan"}, CorrectIndex: 1, Points: 15, Explanation: "Pamaéh menghilangkan vokal bawaan /a/."},
			{Prompt: "Kata \"bah\" ditulis sebagai?", Options: []string{"ᮘᮀ", "ᮘᮁ", "ᮘᮂ", "ᮘ᮪"}, CorrectIndex: 2, Points: 15, Explanation: "ᮘ + pangwisad (ᮂ) = bah."},
			{Prompt: "Cara menulis gugus \"pra\" (panyakra) adalah?", Options: []string{"ᮕᮢ", "ᮕᮡ", "ᮕᮣ", "ᮕᮬ"}, CorrectIndex: 0, Points: 15, Explanation: "ᮕ + panyakra (ᮢ) menyisipkan -r-."},
			{Prompt: "Angka \"5\" dalam aksara Sunda adalah?", Options: []string{"᮵", "᮳", "᮷", "᮰"}, CorrectIndex: 0, Points: 15, Explanation: "᮵ adalah angka lima."},
		},
	},
}
