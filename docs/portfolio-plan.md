# Rencana Proyek: Web Portofolio Full-Stack — Muhammad Hasan Rabbani

> Dokumen perencanaan tahap awal. Belum ada kode. Setelah dokumen ini disetujui, pekerjaan dimulai dari **Phase 1** (lihat bagian 17).

## 0. Ringkasan keputusan

| Hal           | Keputusan                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Stack         | React (Vite) + Express + PostgreSQL, JavaScript (ES modules)                                      |
| Bentuk deploy | **Satu layanan**: Express menyajikan API dan hasil build React, ditambah satu database PostgreSQL |
| SEO untuk SPA | Express menyisipkan meta tag, JSON-LD, dan status HTTP yang benar ke HTML sebelum dikirim         |
| Auth admin    | Session cookie server-side (bukan JWT di localStorage) + proteksi CSRF                            |
| Styling       | CSS Modules + CSS custom properties (tanpa framework CSS)                                         |
| Urutan kerja  | Mengikuti 22 phase Anda, dengan **3 penyesuaian** yang dijelaskan di bagian 2.4                   |

**Yang perlu Anda konfirmasi** (jika tidak dijawab, saya pakai default yang tertulis):

1. Bahasa antarmuka: **Inggris** (default), Indonesia, atau dua bahasa?
2. JavaScript (default, sesuai daftar skill Anda) atau TypeScript?
3. Upload gambar dari admin: **ditunda** (default); gambar awal diletakkan di folder `public/`.
4. Layanan email untuk notifikasi form kontak: SMTP biasa (default, mis. Gmail App Password atau penyedia lain), diputuskan saat Phase 10.
5. Domain: sudah punya atau belum? (menentukan canonical URL dan sitemap).

---

## 1. Project overview

Portofolio pribadi yang berfungsi sebagai **bukti kemampuan engineering**, bukan hanya brosur. Pengunjung (rekruter, dosen, calon klien) dapat melihat profil, project, pengalaman, pendidikan, sertifikat, dan artikel, lalu menghubungi pemilik. Pemilik mengelola konten lewat dashboard admin tanpa mengubah kode.

Nilai tambah dibanding portofolio statis: backend REST API, database relasional, autentikasi, validasi sisi server, testing, CI/CD, dan deployment yang terdokumentasi. Semua itu dapat dijelaskan dalam wawancara.

Prinsip: _"Build what is needed, build it correctly, and keep it maintainable."_ Prioritas bila terjadi konflik: Correctness > Security > Accessibility > Performance > Maintainability > UX > Visual design.

---

## 2. Requirement analysis

### 2.1 Ringkasan kebutuhan fungsional

- **Publik:** Home, About, Skills, Projects (+detail), Experience, Education, Certificates (+filter), Blog (+detail, related, TOC, share), Contact, Resume, 404.
- **Admin:** login, kelola projects, certificates, posts, messages (CRUD). Skills, experience, dan education awalnya dikelola lewat seed data; antarmuka admin untuknya opsional di akhir.
- **Lintas halaman:** dark/light/system mode, navigasi responsif, SEO per halaman, aksesibilitas, loading/empty/error state.

### 2.2 Kebutuhan non-fungsional (diperlakukan sebagai requirement utama)

SEO, Accessibility, Performance, Security. Detail ada di bagian 11 sampai 14.

### 2.3 Hal yang ambigu dan asumsi sementara

| Ambigu                                                                | Asumsi sementara                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bahasa konten                                                         | Inggris. Dua bahasa menggandakan semua konten dan routing; ditunda.                                                                                                                                                                              |
| Data nyata (bio, foto, CV, link GitHub/LinkedIn, project)             | Placeholder yang jelas ditandai. **Tidak ada pengalaman, sertifikat, statistik, atau testimonial palsu**; bagian yang belum ada datanya menampilkan _empty state_ yang rapi, atau disembunyikan di production.                                   |
| Home berisi "section" vs halaman terpisah (`/about`, `/skills`, dst.) | Keduanya: setiap topik punya **route sendiri** (baik untuk SEO), dan Home menampilkan ringkasan/teaser. Navbar memakai route, bukan anchor, sehingga masalah "navbar menutupi konten saat anchor" hanya relevan untuk table of contents artikel. |
| Tingkat skill                                                         | Tiga label: Familiar / Intermediate / Advanced, plus keterangan konteks penggunaan ("dipakai di project X"). Tanpa persentase.                                                                                                                   |
| Siapa saja pengguna admin                                             | Satu pemilik. Tidak ada registrasi publik.                                                                                                                                                                                                       |
| Analytics                                                             | Ditunda. Jika dipakai: layanan tanpa cookie (mis. Plausible atau Umami) agar tidak perlu banner consent.                                                                                                                                         |

### 2.4 Bagian requirement yang saya sarankan diubah

Anda meminta saya menjelaskan jika ada requirement yang kurang baik. Ada tiga:

1. **React SPA bertabrakan dengan tuntutan SEO.** SPA biasa mengirim HTML kosong; crawler media sosial (Open Graph) tidak menjalankan JavaScript, dan URL slug yang tidak ada akan tetap berstatus 200 ("soft 404"). _Solusi:_ server menyisipkan meta, JSON-LD, dan status 404 yang benar per request (bagian 12). Alternatifnya Next.js (lihat 3.2).
2. **Urutan phase: UI dulu, backend baru di Phase 11 dst.** Risikonya, data di-hard-code di komponen lalu ditulis ulang saat API jadi. _Solusi:_ pendekatan **contract-first**. Dari Phase 1, bentuk data ditetapkan sama dengan bentuk respons API, disimpan sebagai file JSON seed. Frontend membaca lewat lapisan `services/` yang pada awalnya mengambil JSON lokal dan kelak diganti ke `fetch` API tanpa mengubah komponen.
3. **Form kontak (Phase 10) membutuhkan backend, padahal backend baru Phase 11.** _Solusi:_ endpoint `POST /api/contact` dibuat minimal pada Phase 10 (validasi, rate limit, simpan ke DB), sedangkan CRUD dan auth tetap di phase aslinya.

Dua penyesuaian kecil lain: CI (lint + build) dipasang sejak **Phase 1** karena murah dan mencegah masalah menumpuk; dan endpoint tulis memakai prefix `/api/admin/*` (bagian 7) agar batas otorisasi mudah diaudit.

Catatan keamanan data: CV PDF bersifat publik. Jangan mencantumkan alamat rumah atau nomor telepon pribadi di dalamnya.

---

## 3. Technology stack

### 3.1 Pilihan dan alasan

| Lapisan       | Pilihan                                                     | Alasan                                                                                                                                                            |
| ------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend      | React + Vite, React Router                                  | Sesuai skill yang ingin ditunjukkan; build cepat; code splitting per route                                                                                        |
| Bahasa        | JavaScript (ES modules)                                     | Sesuai prompt; TypeScript bisa ditambahkan nanti (trade-off: kurva belajar vs keamanan tipe)                                                                      |
| Styling       | CSS Modules + design tokens (CSS variables)                 | Nol dependency runtime, dark mode mudah lewat variabel, menunjukkan kemampuan CSS                                                                                 |
| Data fetching | `fetch` + hook kecil (`useAsync`)                           | Jumlah endpoint publik sedikit; TanStack Query dievaluasi ulang saat admin dikerjakan                                                                             |
| Backend       | Node.js (LTS) + Express                                     | Sesuai prompt; sederhana dan eksplisit sehingga alurnya mudah dijelaskan                                                                                          |
| Validasi      | `zod`                                                       | Skema yang sama bisa dipakai di client dan server                                                                                                                 |
| Database      | PostgreSQL                                                  | Tipe `enum`, `jsonb`, array, constraint kuat, full-text search untuk blog                                                                                         |
| Akses DB      | `pg` (query terparameter) + migrasi SQL (`node-pg-migrate`) | Melatih SQL dan desain skema; aman dari SQL injection bila query selalu terparameter. Trade-off vs Prisma: lebih banyak kode manual, tetapi lebih sedikit "magic" |
| Auth          | `express-session` + `connect-pg-simple`, hash `argon2`      | Session di server dapat dicabut; cookie `HttpOnly` tidak bisa dibaca JavaScript                                                                                   |
| Keamanan HTTP | `helmet`, `express-rate-limit`, CSRF token                  | Lihat bagian 11                                                                                                                                                   |
| Markdown      | `markdown-it` + `sanitize-html` di server                   | Render di server: tidak menambah bundle client dan konten disanitasi                                                                                              |
| Email         | `nodemailer` (SMTP)                                         | Tanpa vendor lock-in; kegagalan email tidak menggagalkan penyimpanan pesan                                                                                        |
| Testing       | Vitest, Testing Library, Supertest, Playwright, axe-core    | Unit, integrasi, E2E, dan cek aksesibilitas otomatis                                                                                                              |
| Kualitas kode | ESLint, Prettier                                            | Konsistensi                                                                                                                                                       |
| Deploy        | Docker multi-stage di PaaS + PostgreSQL terkelola           | Platform dipilih di Phase 21, karena harga dan paket gratis sering berubah; periksa kondisi terbaru saat itu                                                      |

### 3.2 Trade-off arsitektur utama

| Opsi                                                               | Kelebihan                                              | Kekurangan                                                                                             | Kesimpulan                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **A. React (Vite) + Express + PostgreSQL**, meta disisipkan server | Sesuai prompt; backend terlihat jelas; satu deployment | Lapisan injeksi SEO harus dibuat sendiri (cukup kecil)                                                 | **Dipilih**                                                       |
| B. Next.js (App Router) + PostgreSQL                               | SSR/SSG dan SEO bawaan                                 | Backend tersembunyi di balik konvensi framework; kurang menunjukkan Express/REST; lebih banyak "magic" | Alternatif bila SEO dirasa lebih penting dari demonstrasi backend |
| C. Express + template server-side (EJS/Nunjucks) + JS ringan       | Paling sederhana, SEO dan performa sangat baik         | Tidak menunjukkan React; interaksi admin lebih repetitif                                               | Alternatif bila ingin minimal                                     |

---

## 4. Architecture

### 4.1 Gambaran umum

```
Browser
   │  HTTPS
   ▼
┌──────────────────────────── Satu layanan Node.js ────────────────────────────┐
│  Express                                                                      │
│   ├─ /api/*            → routes → controllers → services → repositories ──┐   │
│   ├─ /sitemap.xml, /robots.txt, /rss.xml, /healthz                        │   │
│   └─ semua halaman lain → index.html hasil build React                    │   │
│        + injeksi <title>, meta, canonical, OG, JSON-LD, status 200/404    │   │
└───────────────────────────────────────────────────────────────────────────┼───┘
                                                                            ▼
                                                                    PostgreSQL
```

Lapisan backend dan tanggung jawabnya:

- **routes**: memetakan URL ke controller, memasang middleware (auth, validasi, rate limit).
- **controllers**: membaca request, memanggil service, membentuk respons. Tanpa logika bisnis.
- **services**: aturan bisnis (mis. hanya post berstatus `published` yang tampil, hitung reading time).
- **repositories**: satu-satunya tempat yang menulis SQL.

### 4.2 Alur injeksi SEO

1. Request `/projects/portfolio-website` masuk.
2. Server mencari project berdasarkan slug.
3. Tidak ada → kirim halaman 404 dengan **status 404**. Ada → ambil template `index.html`, isi title, description, canonical, OG/Twitter, JSON-LD (`BreadcrumbList`, dll.), kirim 200.
4. React mengambil alih di browser (hidrasi) dan mengambil data lewat API untuk konten halaman.

Konten utama tetap dirender oleh React di client. Googlebot menjalankan JavaScript, sedangkan crawler pratinjau sosial cukup membaca meta yang sudah disisipkan. Bila nanti terbukti perlu, prerender HTML penuh untuk halaman publik dapat ditambahkan tanpa mengubah arsitektur.

### 4.3 Alur autentikasi admin

1. `GET /api/csrf-token` → token disimpan di memori client.
2. `POST /api/auth/login` (rate limited) → verifikasi argon2 → buat session → cookie `HttpOnly; Secure; SameSite=Lax`.
3. Setiap request tulis wajib membawa header `X-CSRF-Token`.
4. Middleware `requireAdmin` memeriksa session **di server** pada setiap route `/api/admin/*`. Route React `/admin/*` hanya pengalaman UI; keamanan sebenarnya ada di API.

### 4.4 Alur form kontak

Validasi zod → honeypot → rate limit → simpan ke tabel `messages` → kirim email notifikasi (asinkron; gagal tidak membatalkan) → respons `201`.

---

## 5. Folder structure

npm workspaces (monorepo sederhana):

```
portfolio/
├── client/
│   ├── public/                 # favicon, font self-hosted, gambar statis, cv.pdf
│   ├── src/
│   │   ├── app/                # router, providers, layout root
│   │   ├── components/
│   │   │   ├── ui/             # Button, Card, Badge, Tag, Skeleton, ...
│   │   │   ├── layout/         # Header, Footer, MobileNav, ThemeToggle, SkipLink
│   │   │   └── sections/       # Hero, ProjectGrid, SkillGroup, Timeline, ...
│   │   ├── pages/
│   │   │   ├── public/         # Home, About, Skills, Projects, ...
│   │   │   └── admin/          # Login, Dashboard, ProjectsAdmin, ...
│   │   ├── hooks/              # useAsync, useTheme, useReducedMotion, ...
│   │   ├── services/           # apiClient.js, projectsService.js, ...
│   │   ├── styles/             # tokens.css, reset.css, base.css
│   │   ├── utils/              # format tanggal, slugify, dll.
│   │   └── main.jsx
│   ├── tests/
│   ├── index.html
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/             # env.js (validasi env dengan zod)
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/         # auth, csrf, rateLimit, errorHandler, notFound
│   │   ├── validators/         # skema zod per resource
│   │   ├── seo/                # injeksi meta, sitemap, robots, rss, JSON-LD
│   │   ├── db/
│   │   │   ├── pool.js
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   ├── utils/
│   │   ├── app.js              # membangun app Express (mudah dites)
│   │   └── server.js           # menjalankan listen()
│   └── tests/
├── shared/                     # skema zod bersama, siteConfig.json, data seed JSON
├── e2e/                        # Playwright
├── docs/                       # arsitektur, API, deployment, screenshot
├── .github/workflows/ci.yml
├── Dockerfile
├── docker-compose.yml          # PostgreSQL untuk development
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

**Identitas yang mudah diganti:** semua data diri (nama, role, email, URL sosial, CV) berada di `shared/siteConfig.json`, dibaca oleh client dan server (untuk JSON-LD, footer, meta). Mengganti identitas cukup mengubah satu file.

---

## 6. Database schema (PostgreSQL)

Prinsip: relasional dan ternormalisasi seperlunya; tanpa tabel yang belum dibutuhkan. Kolom `created_at` dan `updated_at` ada di semua tabel konten (tidak diulang di bawah).

```
users
  id PK, email UNIQUE, password_hash, role ('admin'), last_login_at

technologies                      -- satu sumber nama teknologi
  id PK, name, slug UNIQUE, category ('frontend'|'backend'|'database'|'tools'|'other'), icon_key

skills
  id PK, technology_id FK UNIQUE → technologies, level ('familiar'|'intermediate'|'advanced'),
  description, sort_order, is_visible

projects
  id PK, slug UNIQUE, title, summary, description_md, problem_md, solution_md,
  features text[], architecture_md, architecture_image_url, challenges_md, lessons_md,
  category, status ('planned'|'in_progress'|'completed'|'archived'), year,
  thumbnail_url, thumbnail_alt, repo_url, demo_url,
  is_featured, is_published, sort_order

project_technologies
  project_id FK → projects, technology_id FK → technologies, PK (project_id, technology_id)

project_images                    -- screenshots
  id PK, project_id FK, url, alt, caption, sort_order

experiences
  id PK, position, organization,
  type ('employment'|'internship'|'freelance'|'academic'|'personal'|'organization'|'volunteer'),
  start_date, end_date NULL (null = sekarang), description, responsibilities text[],
  sort_order, is_visible

experience_technologies
  experience_id FK, technology_id FK, PK (experience_id, technology_id)

education
  id PK, institution, program, start_year, end_year NULL, subjects text[], achievements text[],
  sort_order, is_visible

certificates
  id PK, title, issuer, issued_date, category, credential_id NULL, credential_url NULL,
  file_url, file_alt NULL, is_visible

posts
  id PK, slug UNIQUE, title, excerpt, content_md, cover_image_url, cover_alt,
  category, status ('draft'|'published'), published_at NULL, reading_time_minutes,
  search_vector tsvector (indeks GIN)

tags
  id PK, name UNIQUE, slug UNIQUE

post_tags
  post_id FK, tag_id FK, PK (post_id, tag_id)

messages
  id PK, name, email, subject, body, status ('new'|'read'|'archived'),
  ip_hash NULL, created_at

session                           -- dikelola connect-pg-simple
  sid PK, sess json, expire (indeks)
```

Keputusan desain:

- **`technologies` dipakai bersama** oleh skills, projects, dan experiences. Nama teknologi tidak terduplikasi dan filter lintas entitas mudah.
- **Tidak ada relasi `users → projects`** (pada prompt asli). Dengan satu admin, kolom pemilik adalah kompleksitas tanpa manfaat; dapat ditambahkan lewat migrasi bila kelak ada banyak penulis.
- **`ip_hash`** (hash dengan garam, bukan IP asli) untuk analisis spam tanpa menyimpan data pribadi. Tetapkan masa retensi pesan (usulan: hapus pesan terarsip setelah 12 bulan).
- Constraint `CHECK`/`enum` pada kolom status dan kategori agar data tidak bisa menjadi tidak valid dari sisi database.
- Tahun sertifikat diturunkan dari `issued_date`, sehingga tidak ada kolom `year` yang bisa tidak sinkron.

---

## 7. API architecture

Konvensi: JSON, prefix `/api`, huruf kecil dan jamak.

**Format respons**

```json
{ "success": true, "data": {}, "meta": { "page": 1, "pageSize": 12, "total": 40 } }
```

```json
{ "success": false, "message": "Project not found" }
```

Untuk galat validasi (`422`) ditambahkan `"errors": [{ "field": "email", "message": "Invalid email address" }]`.

**Endpoint publik (read-only; hanya data `published`/`is_visible`)**

| Method | Path                  | Keterangan                                |
| ------ | --------------------- | ----------------------------------------- |
| GET    | `/api/projects`       | Query: `category`, `tech`, `q`, `page`    |
| GET    | `/api/projects/:slug` | Detail, termasuk teknologi dan screenshot |
| GET    | `/api/skills`         | Dikelompokkan per kategori                |
| GET    | `/api/experiences`    | Terurut                                   |
| GET    | `/api/education`      |                                           |
| GET    | `/api/certificates`   | Query: `issuer`, `year`, `category`       |
| GET    | `/api/posts`          | Query: `tag`, `category`, `q`, `page`     |
| GET    | `/api/posts/:slug`    | Beserta artikel terkait                   |
| POST   | `/api/contact`        | Rate limited, honeypot, validasi zod      |

**Auth**

| Method | Path               |
| ------ | ------------------ |
| GET    | `/api/csrf-token`  |
| POST   | `/api/auth/login`  |
| POST   | `/api/auth/logout` |
| GET    | `/api/auth/me`     |

**Admin (semua di belakang `requireAdmin` + CSRF)**

| Method           | Path                                          |
| ---------------- | --------------------------------------------- |
| GET, POST        | `/api/admin/projects`                         |
| GET, PUT, DELETE | `/api/admin/projects/:id`                     |
| sama untuk       | `/api/admin/certificates`, `/api/admin/posts` |
| GET              | `/api/admin/messages`                         |
| PATCH, DELETE    | `/api/admin/messages/:id`                     |

_Alasan prefix `/api/admin`:_ mengapa tidak `POST /api/projects` seperti pada contoh prompt? Dengan memisahkan jalur, aturan "semua yang di bawah `/api/admin` wajib admin" dapat dipasang sekali di router dan diuji sekali, sehingga tidak ada route tulis yang lupa diberi proteksi. Admin juga perlu melihat draft yang tidak boleh muncul di jalur publik.

**Non-JSON:** `/sitemap.xml`, `/robots.txt`, `/rss.xml` (opsional), `/healthz`.

**Status code:** 200, 201 (dibuat), 204 (hapus), 400 (request rusak), 401 (belum login), 403 (CSRF/izin), 404, 409 (slug duplikat), 422 (validasi gagal), 429 (rate limit), 500 (pesan generik ke client; detail hanya di log server).

---

## 8. Page structure

| Route                                                                                                 | Halaman        | Catatan                                                              |
| ----------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------- |
| `/`                                                                                                   | Home           | Hero, highlight teknologi, project unggulan, artikel terbaru, CTA    |
| `/about`                                                                                              | About          | Bio, minat, fokus, tujuan karier, pendekatan engineering             |
| `/skills`                                                                                             | Skills         | Dikelompokkan: Frontend, Backend, Database, Tools, Other             |
| `/projects`                                                                                           | Daftar project | Pencarian dan filter (kategori, teknologi)                           |
| `/projects/:slug`                                                                                     | Detail project | Problem, solusi, fitur, arsitektur, tantangan, pelajaran, screenshot |
| `/experience`                                                                                         | Timeline       | Empty state jika belum ada data                                      |
| `/education`                                                                                          | Pendidikan     |                                                                      |
| `/certificates`                                                                                       | Galeri         | Filter organisasi, tahun, kategori                                   |
| `/blog`                                                                                               | Daftar artikel | Pencarian dan filter tag                                             |
| `/blog/:slug`                                                                                         | Artikel        | TOC, related, share, reading time                                    |
| `/contact`                                                                                            | Kontak         | Form dan tautan sosial                                               |
| `/resume`                                                                                             | Resume         | Ringkasan dan tombol unduh/buka PDF                                  |
| `*`                                                                                                   | 404            | Status HTTP 404 sungguhan, tombol "Back to Home"                     |
| `/admin/login`, `/admin`, `/admin/projects`, `/admin/certificates`, `/admin/posts`, `/admin/messages` | Admin          | Di-lazy-load; `noindex`                                              |

Kerangka heading: tiap halaman punya tepat satu `h1`; di bawahnya `h2` per bagian, lalu `h3` bila perlu. Tidak ada lompatan level.

---

## 9. Component structure

**ui/** (stateless, dapat dipakai ulang): `Button`, `LinkButton`, `Card`, `Badge`, `Tag`, `Icon`, `Input`, `Textarea`, `FormField` (label + pesan galat), `Skeleton`, `Spinner`, `EmptyState`, `ErrorState`, `Pagination`, `Tabs/FilterBar`.

**layout/**: `SiteLayout`, `Header`, `DesktopNav`, `MobileNav` (hamburger), `ThemeToggle` (light/dark/system), `SkipLink`, `Footer`, `ScrollToTopOnRoute`, `RouteAnnouncer` (live region untuk pembaca layar).

**sections/**: `Hero`, `HighlightStrip`, `AboutSummary`, `SkillGroup` + `SkillItem`, `ProjectCard` + `ProjectGrid`, `ProjectDetail`, `ArchitectureDiagram`, `Timeline` + `TimelineItem`, `EducationItem`, `CertificateCard` + `CertificateFilters`, `PostCard`, `PostContent`, `TableOfContents`, `RelatedPosts`, `ShareButtons`, `ContactForm`, `SocialLinks`.

**Admin**: `AdminLayout`, `RequireAuth`, `DataTable`, `ResourceForm`, `ConfirmDialog`, `Toast`.

Aturan: komponen `ui/` tidak memanggil API; hanya halaman dan hook yang berbicara dengan `services/`.

---

## 10. Design system

**Arah visual:** minimalis, banyak ruang kosong, hierarki jelas, satu warna aksen. Menghindari tampilan "template AI": tanpa gradient ungu, tanpa kartu kaca (glassmorphism), tanpa blob dekoratif.

**Tokens (CSS custom properties)**

- **Warna:** netral abu-abu hangat untuk latar dan teks; **satu** warna aksen (usulan: teal/hijau tua; ditetapkan dan diuji di Phase 2); warna semantik untuk success/error/warning. Setiap pasangan teks-latar harus lolos WCAG AA (4,5:1 untuk teks normal), diverifikasi dengan alat, bukan perkiraan.
- **Tipografi:** maksimal dua keluarga font, self-hosted, format WOFF2, `font-display: swap`: satu sans-serif variabel untuk semua teks dan satu monospace untuk kode. Skala fluid dengan `clamp()`.
- **Spacing:** skala berbasis 4 px (4, 8, 12, 16, 24, 32, 48, 64, 96).
- **Radius dan bayangan:** dua tingkat radius; bayangan tipis dan jarang.
- **Breakpoint (mobile-first):** 480, 768, 1024, 1280 px; lebar konten maksimum sekitar 1120 px; ukuran target sentuh minimal 44×44 px.
- **Motion:** durasi 150–250 ms, easing seragam; seluruh animasi dimatikan atau disederhanakan di bawah `prefers-reduced-motion: reduce`. Animasi diizinkan: hover, transisi tombol/kartu, scroll reveal ringan, transisi navbar.

**Dark mode:** variabel warna didefinisikan untuk `[data-theme="light"]` dan `[data-theme="dark"]`. Pilihan user (`light`/`dark`/`system`) disimpan di `localStorage`. Skrip kecil inline di `<head>` menetapkan atribut sebelum render pertama agar tidak ada kilatan warna; skrip ini diberi hash di CSP.

---

## 11. Security considerations

| Ancaman                 | Mitigasi                                                                                                                                                                               | Phase  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| SQL injection           | Semua query terparameter di repository; tidak ada penyusunan SQL dari input                                                                                                            | 12     |
| XSS                     | React meng-escape output; markdown disanitasi di server (`sanitize-html` dengan allowlist); CSP ketat tanpa `unsafe-inline`                                                            | 9, 20  |
| CSRF                    | Cookie `SameSite=Lax` + token CSRF pada setiap request tulis                                                                                                                           | 13     |
| Brute force login       | Rate limit login per IP dan per email; pesan galat generik; hash `argon2`                                                                                                              | 13     |
| Spam form kontak        | Honeypot, rate limit (usulan 5 per jam per IP), batas panjang field                                                                                                                    | 10     |
| Pembajakan session      | Cookie `HttpOnly`, `Secure`, nama `__Host-`; session disimpan di DB sehingga bisa dicabut; ID session diganti saat login                                                               | 13     |
| Akses admin tanpa izin  | `requireAdmin` di server untuk semua `/api/admin/*`; tes otomatis memastikan 401/403                                                                                                   | 13, 16 |
| Kebocoran secret        | Semua secret lewat environment variable, divalidasi saat start (aplikasi menolak berjalan jika hilang); `.env` di `.gitignore`; hanya `.env.example` yang di-commit; scan secret di CI | 1, 22  |
| Password admin awal     | Dibuat lewat skrip CLI interaktif, tidak ada password di kode atau seed; tidak ada endpoint registrasi                                                                                 | 13     |
| Header HTTP             | `helmet`, CSP, `X-Content-Type-Options`, `Referrer-Policy`, HSTS di production                                                                                                         | 20     |
| Dependency rentan       | `npm audit` dan Dependabot; sedikit dependency                                                                                                                                         | 22     |
| Kebocoran info di error | Error handler terpusat: client menerima pesan generik, detail hanya di log; tidak ada stack trace di production                                                                        | 11     |
| Privasi                 | Hash IP, retensi pesan, analytics tanpa cookie                                                                                                                                         | 10, 21 |

---

## 12. SEO strategy

- **Per halaman:** `title` unik, `meta description`, canonical absolut, Open Graph dan Twitter Card (gambar OG default dan per project/artikel), semuanya disisipkan server (bagian 4.2).
- **JSON-LD** hanya yang sesuai isi halaman: `Person` dan `WebSite` (Home/About), `Article` (blog), `BreadcrumbList` (detail project dan blog). Data diambil dari sumber yang sama dengan konten yang tampil.
- **`sitemap.xml`** dinamis dari DB (hanya konten publik); **`robots.txt`** mengizinkan situs publik dan melarang `/admin` dan `/api`; halaman admin memakai `noindex`.
- **Status HTTP benar:** slug tidak ada → 404 sungguhan.
- **URL bersih dan stabil;** slug unik di DB. Heading semantik; teks alt bermakna.
- **RSS** (opsional) untuk blog.

---

## 13. Accessibility strategy

Target: WCAG 2.2 level AA.

- HTML semantik: `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`; ARIA hanya bila elemen semantik tidak cukup.
- Skip link "Skip to main content" sebagai elemen fokus pertama.
- Navigasi keyboard penuh; indikator fokus selalu terlihat; menu mobile menjebak fokus saat terbuka, menutup dengan `Esc`, dan mengembalikan fokus ke tombol.
- Pada perpindahan route (SPA): fokus dipindah ke `h1` dan judul diumumkan lewat live region.
- Form: `label` terhubung ke setiap input, galat terhubung via `aria-describedby`, ringkasan galat diumumkan; status berhasil/gagal memakai `role="status"`/`role="alert"`.
- Kontras AA di light dan dark; informasi tidak hanya disampaikan lewat warna.
- `prefers-reduced-motion` dihormati; teks dapat diperbesar sampai 200% tanpa kehilangan fungsi.
- Verifikasi: axe-core di tes otomatis, Lighthouse, dan pemeriksaan manual dengan keyboard serta pembaca layar pada setiap akhir phase.

---

## 14. Performance strategy

**Target** (ambang "good" Core Web Vitals dari Google, diukur pada profil mobile): LCP < 2,5 s, INP < 200 ms, CLS < 0,1. Anggaran JavaScript awal ditetapkan di Phase 19 (usulan: ≤ 150 KB gzip untuk rute publik pertama).

- Code splitting per route (`React.lazy`); admin sepenuhnya terpisah dari bundle publik.
- Tanpa library besar: markdown dirender di server, tanpa library animasi, tanpa ikon berbasis font (SVG inline atau sprite).
- Gambar: WebP/AVIF dengan `srcset`/`sizes`, dimensi eksplisit (mencegah CLS), `loading="lazy"` untuk gambar di bawah fold, gambar LCP diberi prioritas (`fetchpriority="high"`).
- Font: self-hosted, subset, maksimal beberapa varian, `preload` untuk font utama.
- Cache: aset ber-hash dengan `Cache-Control: immutable`; kompresi Brotli/gzip; ETag untuk API publik.
- Query DB: indeks pada `slug`, `status`, `published_at`; paginasi.
- Pengukuran: Lighthouse CI di pipeline sebagai pemeriksa regresi.

---

## 15. Testing strategy

Menguji perilaku penting, bukan mengejar angka cakupan.

| Jenis         | Alat                         | Contoh yang diuji                                                                                                                                                                                       |
| ------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit          | Vitest                       | Skema validasi, util tanggal/slug, reading time, injeksi meta                                                                                                                                           |
| Komponen      | Vitest + Testing Library     | `ContactForm` (galat, sukses, aksesibilitas), `ThemeToggle`, `MobileNav` (fokus, Esc), filter sertifikat                                                                                                |
| API/integrasi | Supertest + DB test terpisah | Kontrak respons; `POST /api/contact` (valid, tidak valid, rate limit); semua `/api/admin/*` mengembalikan 401 tanpa login dan 403 tanpa CSRF; draft tidak bocor di endpoint publik; slug duplikat → 409 |
| Auth          | Supertest                    | Login berhasil/gagal, logout mencabut session, pembatasan percobaan                                                                                                                                     |
| E2E           | Playwright                   | Alur kunjungan utama; kirim pesan; login admin → buat project → muncul di publik                                                                                                                        |
| Aksesibilitas | axe-core (via Playwright)    | Tidak ada pelanggaran serius pada halaman utama, light dan dark                                                                                                                                         |

---

## 16. Deployment strategy

```
User ─► CDN/HTTPS (disediakan platform) ─► Container Node.js (Express + React build) ─► PostgreSQL terkelola
```

- **Build:** Dockerfile multi-stage (build client → salin hasil ke image server yang ramping, berjalan sebagai user non-root).
- **Environment:** `development` (lokal + `docker-compose` untuk PostgreSQL), `staging`, `production`. Masing-masing memiliki database, secret, dan `SITE_URL` sendiri. Tidak ada secret di repo; semua diisi lewat pengaturan platform.
- **Migrasi:** dijalankan sebagai langkah rilis sebelum aplikasi baru melayani trafik.
- **Operasional:** endpoint `/healthz`, log terstruktur (JSON), backup database terjadwal oleh penyedia dan dicatat di dokumentasi, HTTPS wajib dan redirect dari HTTP.
- **Pemilihan platform dan database terkelola:** diputuskan di Phase 21 dengan membandingkan harga/batasan terkini.

**CI/CD (GitHub Actions)**, aktif sejak Phase 1 dan diperluas bertahap:

```
push / PR → install → lint → test (dengan service PostgreSQL) → build
                                                     └─ main → deploy (staging → production)
```

---

## 17. Development roadmap

Mengikuti 22 phase Anda. Penyesuaian ditandai ★.

| #   | Phase                  | Hasil / kriteria selesai                                                                                                                 |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Project setup ★        | Monorepo, Vite + Express berjalan, env tervalidasi, ESLint/Prettier, `docker-compose` PostgreSQL, `siteConfig.json`, **CI lint + build** |
| 2   | Design system          | Tokens, reset, tipografi, komponen `ui/` dasar, dark mode tanpa flash                                                                    |
| 3   | Layout dan navigation  | Header, mobile nav, footer, skip link, route + 404                                                                                       |
| 4   | Home                   | Hero dan CTA                                                                                                                             |
| 5   | About + Skills         |                                                                                                                                          |
| 6   | Projects               | Daftar, filter, detail                                                                                                                   |
| 7   | Experience + Education | Timeline dan empty state                                                                                                                 |
| 8   | Certificates           | Galeri dan filter                                                                                                                        |
| 9   | Blog                   | Daftar, detail, TOC, related, share                                                                                                      |
| 10  | Contact ★              | Form + `POST /api/contact` minimal (validasi, rate limit, simpan)                                                                        |
| 11  | Backend                | Struktur lapisan, error handler, logging                                                                                                 |
| 12  | Database               | Migrasi, seed dari JSON, repository                                                                                                      |
| 13  | Authentication         | Session, CSRF, skrip pembuatan admin                                                                                                     |
| 14  | Admin dashboard        | CRUD projects, certificates, posts, messages                                                                                             |
| 15  | API ★                  | Penggantian `services/` dari JSON lokal ke API; dokumentasi API                                                                          |
| 16  | Testing                | Melengkapi tes sesuai bagian 15                                                                                                          |
| 17  | SEO                    | Injeksi meta, sitemap, robots, JSON-LD, RSS                                                                                              |
| 18  | Accessibility          | Audit penuh                                                                                                                              |
| 19  | Performance            | Anggaran bundle, gambar, Lighthouse CI                                                                                                   |
| 20  | Security review        | CSP, header, audit dependency, tinjauan semua endpoint                                                                                   |
| 21  | Deployment             | Dockerfile, platform, staging dan production, dokumentasi                                                                                |
| 22  | CI/CD                  | Perluasan pipeline: tes, e2e, deploy otomatis                                                                                            |

Setelah setiap phase: review, cari bug potensial, cek aksesibilitas, responsif, keamanan, performa, dan maintainability sebelum lanjut.

### Phase pertama yang akan dikerjakan: Phase 1 — Project setup

**Cakupan:**

1. Inisialisasi monorepo (npm workspaces): `client`, `server`, `shared`.
2. Client: Vite + React + React Router, halaman placeholder.
3. Server: Express (`app.js` dan `server.js` terpisah), `GET /healthz`, validasi environment dengan zod, helmet, error handler dasar.
4. `docker-compose.yml` untuk PostgreSQL lokal.
5. ESLint dan Prettier, `.gitignore` (mengecualikan `.env`, `node_modules`), `.env.example`.
6. `shared/siteConfig.json` berisi identitas placeholder.
7. `README.md` kerangka awal.
8. Workflow GitHub Actions: install, lint, build.

**Kriteria selesai:** `npm run dev` menjalankan client dan server; `/healthz` merespons; `npm run lint` dan `npm run build` lolos; tidak ada secret di repo.

Phase 1 akan memberikan kode lengkap per file, penjelasan fungsi setiap file, dependency yang di-install, dan perintah yang dijalankan.
