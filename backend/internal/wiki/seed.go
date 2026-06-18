package wiki

import "context"

// Seed inserts starter encyclopedia articles when the collection is empty so a
// fresh deployment is not blank. It is idempotent.
func (s *Service) Seed(ctx context.Context) error {
	existing, err := s.repo.List(ctx, ListFilter{})
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return nil
	}
	for _, in := range seedArticles {
		if _, err := s.Create(ctx, in); err != nil {
			return err
		}
	}
	return nil
}

var seedArticles = []ArticleInput{
	{
		Title:       "Sejarah Aksara Sunda",
		TitleAksara: "ᮞᮏᮛᮂ ᮃᮊ᮪ᮞᮛ ᮞᮥᮔ᮪ᮓ",
		Category:    "Sejarah",
		Summary:     "Asal-usul dan perkembangan sistem tulisan masyarakat Sunda dari masa ke masa.",
		Content: `## Asal-usul

Aksara Sunda merupakan sistem tulisan yang berkembang di tatar Sunda. Akarnya berasal dari aksara **Pallawa** yang masuk ke Nusantara, lalu berkembang menjadi aksara **Kawi**, dan akhirnya membentuk aksara Sunda Kuno (Aksara Sunda Kuna).

## Aksara Sunda Baku

Pada akhir abad ke-20, dilakukan standardisasi yang menghasilkan **Aksara Sunda Baku**. Bentuk inilah yang kini diajarkan di sekolah dan dipakai pada papan nama jalan di Jawa Barat. Aksara Sunda Baku resmi masuk ke dalam standar Unicode pada blok U+1B80–U+1BBF.

## Kedudukan Saat Ini

Aksara Sunda kini menjadi bagian penting pelestarian budaya. Penggunaannya didorong melalui pendidikan, papan nama publik, dan teknologi digital seperti aplikasi ini.`,
	},
	{
		Title:       "Aksara Ngalagena",
		TitleAksara: "ᮃᮊ᮪ᮞᮛ ᮍᮜᮌᮨᮔ",
		Category:    "Dasar",
		Summary:     "Konsonan dasar dalam Aksara Sunda yang membawa vokal bawaan /a/.",
		Content: `## Pengertian

**Ngalagena** adalah aksara konsonan yang secara bawaan mengandung vokal /a/. Misalnya aksara ᮊ dibaca "ka", bukan sekadar "k".

## Daftar Dasar

Terdapat 18 aksara ngalagena dasar: ka, ga, nga, ca, ja, nya, ta, da, na, pa, ba, ma, ya, ra, la, wa, sa, ha.

## Konsonan Serapan

Untuk menulis kata serapan, ditambahkan tujuh aksara: fa, va, qa, xa, za, kha, dan sya. Aksara-aksara ini melengkapi kebutuhan menulis nama dan istilah asing.`,
	},
	{
		Title:       "Rarangkén: Tanda Vokal dan Konsonan",
		TitleAksara: "ᮛᮛᮀᮊᮦᮔ᮪",
		Category:    "Dasar",
		Summary:     "Tanda diakritik yang mengubah bunyi vokal bawaan dan menambah konsonan.",
		Content: `## Apa itu Rarangkén?

**Rarangkén** adalah tanda yang ditambahkan pada aksara ngalagena untuk mengubah vokal bawaan /a/ atau menambahkan konsonan.

## Rarangkén Vokal

- **panghulu** (ᮤ) mengubah ke bunyi /i/
- **panyuku** (ᮥ) mengubah ke bunyi /u/
- **panéléng** (ᮦ) mengubah ke bunyi /é/
- **panolong** (ᮧ) mengubah ke bunyi /o/
- **pamepet** (ᮨ) mengubah ke bunyi /e/
- **paneuleung** (ᮩ) mengubah ke bunyi /eu/

## Penanda Akhir

- **panyecek** (ᮀ) untuk akhiran -ng
- **panglayar** (ᮁ) untuk akhiran -r
- **pangwisad** (ᮂ) untuk akhiran -h
- **pamaéh** (᮪) mematikan vokal bawaan`,
	},
	{
		Title:       "Angka dalam Aksara Sunda",
		TitleAksara: "ᮃᮃᮍ᮪ᮊ",
		Category:    "Dasar",
		Summary:     "Sistem penulisan angka 0–9 dalam Aksara Sunda.",
		Content: `## Bentuk Angka

Aksara Sunda memiliki lambang angkanya sendiri dari 0 sampai 9: ᮰ ᮱ ᮲ ᮳ ᮴ ᮵ ᮶ ᮷ ᮸ ᮹.

## Penulisan

Saat menulis angka di tengah kalimat, angka Sunda biasanya diapit tanda khusus agar tidak tertukar dengan aksara. Dalam penggunaan digital modern, angka ditulis langsung sesuai konteks.`,
	},
}
