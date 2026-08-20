# Dashboard Perlindungan Sosial PMI 2022–2024

Situs statis (HTML/CSS/JS biasa, tanpa proses build) yang menampilkan hasil Survei Perlindungan Sosial PMI 2022–2024. Datanya ada di folder `data/` sebagai file JSON — kalau datanya berubah, cukup ganti file JSON tersebut dan situsnya otomatis menampilkan angka yang baru (tidak perlu ubah kode).

## Struktur file

```
index.html      -> halaman utama
style.css       -> semua styling
app.js          -> logika pengambilan data & interaktivitas
data/
  program_summary.json      -> ringkasan nasional per program
  program_by_province.json  -> ringkasan per program x provinsi
  program_detail.json       -> detail masalah/pengaduan per responden (yang relevan saja)
```

## Cara publikasi ke GitHub Pages

1. Buat repository baru di GitHub (bisa publik atau privat — Pages gratis untuk repo publik).
2. Upload semua file di folder ini ke repository tersebut (lewat web GitHub: "Add file" → "Upload files", seret semua file dan folder `data/`).
3. Di repository, buka **Settings** → **Pages** (di menu kiri).
4. Pada bagian **Build and deployment**, pilih **Source: Deploy from a branch**, lalu **Branch: main**, folder **/ (root)** → klik **Save**.
5. Tunggu 1–2 menit, GitHub akan menampilkan URL situsnya, biasanya berbentuk:
   `https://<nama-akun-anda>.github.io/<nama-repo>/`
6. Buka URL tersebut — dashboard sudah bisa diakses publik.

Setiap kali ingin memperbarui data, cukup upload ulang file JSON di folder `data/` (via GitHub web atau `git push`); situsnya akan otomatis ter-update dalam waktu singkat.
