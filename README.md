# Ledgerly : Nje portofol virtual per te gjurmuar shpenzimet 

Nje aplikacion i plote React per gjurmimin e te ardhurave dhe shpenzimeve personale, menaxhimin e buxheteve mujore dhe planifikimin e shpenzimeve te ardhshme.
Kjo faqje u krijua specifikisht pasi me mungote nje menyre per te gjurmuar shpenzimet e mia ditore dhe gjendjen mujore te te ardhurave.

---

## Karakteristikat

- **Dashboard** — Pasqyre mujore me tregues te te ardhurave/shpenzimeve, grafik "pie chart" per kategori, grafik shtylle per krahasim, dhe liste transaksionesh ne kohe reale
- **Historiku Vjetor** — Pamje ne forme tabele per te 12 muajt me totale per kategori; mbeshtet eksport dhe import CSV
- **Kategori** — Krijo dhe fshi kategori te personalizuara te ardhurave/shpenzimeve me etiketa ngjyrash dhe grupe
- **Buxhetet Mujore** — Vendos kufij shpenzimesh per kategori me shtylla progresit dhe sinjalizime tejkalimi
- **Per te Shpenzuar** — Planifiko shpenzime te ardhshme me nivele prioriteti, data qellimi dhe gjurmim i statusit
- **Autentifikim** — Hyrje dhe regjistrim me email/fjalekalim nepermjet Supabase Auth

---

## Teknologjite e Perdorura

| Shtresa | Teknologjia |
|---|---|
| Framework UI | React 18 + TypeScript |
| Routing | React Router v6 |
| Gjendja / Cache | TanStack React Query |
| Formular dhe Validim | React Hook Form + Zod |
| Stilim | Tailwind CSS + shadcn/ui |
| Grafiket | Recharts |
| Backend / API | Supabase (REST API + Auth) |
| Mjeti i Build | Vite |

---

## Struktura e Projektit

```
src/
├── components/
│   ├── finance/          # AddTransactionDialog, CategoryDrilldown, CsvIO
│   ├── layout/           # AppLayout (shiritin anesore + nav per celular)
│   └── ui/               # Komponentet primitive te shadcn/ui
├── hooks/
│   ├── useAuth.tsx        # Konteksti i autentifikimit dhe menaxhimi i sesionit
│   └── useFinanceData.ts  # Hook-et per marrjen dhe ndryshimin e te dhenave
├── integrations/
│   └── supabase/          # Konfigurimi i klientit Supabase
├── lib/
│   ├── format.ts          # Funksion ndihmese per formatimin e monedhes
│   └── utils.ts           # Funksion ndihmese per bashkimin e klasave Tailwind
├── pages/
│   ├── Auth.tsx           # Hyrje / Krijim llogarie
│   ├── Dashboard.tsx      # Pasqyra kryesore mujore
│   ├── YearGrid.tsx       # Tabela e plote vjetore
│   ├── Categories.tsx     # Menaxhimi i kategorive
│   ├── Budgets.tsx        # Kufijtë e buxhetit mujor
│   └── ToSpend.tsx        # Gjurmues i shpenzimeve te planifikuara
└── types/
    └── db.ts              # Tipet TypeScript per te gjithe modelet e te dhenave
```

---

## Integrimi me API

Te gjitha te dhenat ruhen nepermjet **Supabase REST API**. Klienti inicializohet ne `src/integrations/supabase/client.ts` dhe perdoret nepermjet hook-eve te React Query ne `src/hooks/useFinanceData.ts`.

**Tabelat e bazes se te dhenave:**
- `categories` — kategori te ardhurave dhe shpenzimeve per perdorues
- `transactions` — regjistrime individuale te te ardhurave/shpenzimeve
- `budgets` — kufij mujore shpenzimesh per kategori
- `planned_expenses` — shpenzime te ardhshme me gjurmim statusi

**Autentifikimi:** Supabase Auth me email dhe fjalekalim. Sesionet ruhen ne `localStorage` dhe ripermprosen automatikisht.

---

## Si te hapesh lokalisht projektin

### Ne fillim 

- Node.js 18+
- Nje projekt [Supabase](https://supabase.com) me tabelat e meposhtme

### Konfigurimi

1. Klono repository-n:
   ```bash
   git clone <repository-url>
   cd expense-tracker
   ```

2. Instalo varesiте:
   ```bash
   npm install
   ```

3. Krijo nje skedar `.env` ne rrenjе me kredencialet e Supabase:
   ```env
   VITE_SUPABASE_URL=url_e_projektit_tend_supabase
   VITE_SUPABASE_PUBLISHABLE_KEY=celesi_anonim_supabase
   ```

4. Starto serverin e zhvillimit:
   ```bash
   npm run dev
   ```

5. Hap [http://localhost:8080](http://localhost:8080) ne shfletuesin tend.

---
