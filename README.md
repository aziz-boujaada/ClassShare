# ClassShare - Plateforme Étudiante de Partage de Connaissances

ClassShare est une application web moderne pour étudiants et élèves-ingénieurs permettant de publier, structurer, découvrir et valoriser des présentations pédagogiques et exposés de cours avec coloration syntaxique de code, résumés, points clés et classement communautaire.

---

## 🛠️ Stack Technologique

- **Frontend** : React 19, TypeScript strict, Vite 8, Tailwind CSS v4
- **Routage & Navigation** : React Router v7
- **Données & Requêtes** : TanStack Query
- **Coloration Syntaxique** : Prism.js (TypeScript, Python, JavaScript, SQL, Bash)
- **Base de Données & Auth** : Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS)
- **Icônes & Micro-interactions** : Lucide React, Canvas Confetti

---

## 🚀 Démarrage Rapide

### 1. Installation des dépendances
```bash
npm install
```

### 2. Variables d'environnement
Créez un fichier `.env` à la racine pour le développement. Définissez les mêmes variables dans l'environnement de production :
```env
VITE_SUPABASE_URL="https://votre-projet.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_votre-cle"
```

Supabase est obligatoire pour l'authentification et toutes les données. Il n'y a pas de base de données locale, de compte de démonstration ni de repli vers `localStorage`. La clé anon/publishable est destinée au navigateur et reste protégée par les politiques RLS. Ne placez jamais une clé `service_role` dans une variable `VITE_*`.

### 3. Lancer le serveur de développement
```bash
npm run dev
```
L'application est accessible sur `http://localhost:3000`.

### 4. Lancer les tests unitaires
```bash
npm test # ou: node --test src/lib/logic.test.ts
```

---

## 🗄️ Architecture de la Base de Données Supabase

Le schéma complet et les politiques de sécurité RLS se trouvent dans :
`supabase/migrations/20250101000000_initial_schema.sql`

### Tables principales :
1. **`profiles`** : Liée à `auth.users(id)` via clé étrangère CASCADE. Stocke `username`, `full_name`, `avatar_url`, `bio`, `study_program` et le rôle (`student`, `teacher`, `admin`).
2. **`presentations`** : Titre, slug unique, filière (`subject`), tags, date d'exposé, statut (`draft` ou `published`), URL des slides d'origine.
3. **`presentation_blocks`** : Blocs structurés ordonnés (`position INT`) contenant du JSONB typé :
   - `summary` : résumé synthétique
   - `key_points` : tableau de concepts fondamentaux
   - `explanation` : texte riche / markdown
   - `code_snippet` : code source, langage, explication
   - `resource` : liens externes de documentation
   - `image` : URL, légende et texte alternatif
4. **`likes`** : Contrainte unique `(presentation_id, user_id)` évitant les doublons.
5. **`comments`** : Commentaires étudiants avec modération par l'auteur ou le propriétaire.
6. **`notifications`** : Alertes pour likes et commentaires reçus.
7. **`leaderboard_view`** : Vue SQL sécurisée calculant les classements avec départage strict :
   `Nombre d'exposés publiés DESC -> Likes reçus DESC -> Commentaires reçus DESC`.

### Sécurité & Row Level Security (RLS) :
- Les brouillons (`status = 'draft'`) ne sont consultables et modifiables **que par leur auteur**.
- Les politiques RLS vérifient `auth.uid() = author_id` sur toutes les mutations.
- Un déclencheur PostgreSQL (`on_auth_user_created`) crée automatiquement le profil utilisateur à l'inscription sans élévation de privilèges.

### Déployer le schéma sur le projet Supabase de production

1. Créez un projet Supabase hébergé et récupérez son `project-ref`, son URL et sa clé anon/publishable.
2. Installez le [Supabase CLI](https://supabase.com/docs/guides/cli) et authentifiez-vous :
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   ```
3. Appliquez les migrations versionnées :
   ```bash
   npx supabase db push --dry-run
   npx supabase db push
   ```
4. Définissez `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` dans les variables de votre hébergeur, puis reconstruisez/redéployez le frontend. L'ancienne variable `VITE_SUPABASE_ANON_KEY` reste acceptée pour les projets existants.
5. Dans Supabase Auth, configurez les URL de redirection autorisées pour votre domaine de production et la confirmation d'e-mail.

La migration n'insère aucune donnée de démonstration. `supabase/seed.sql` n'est pas exécuté. Si le schéma a déjà été créé manuellement dans le SQL Editor, vérifiez l'historique des migrations avant `db push`; au besoin, réconciliez-le avec `npx supabase migration repair`.

### Déployer le frontend sur Vercel

1. Importez le dépôt dans Vercel et gardez la configuration définie dans `vercel.json` : installation avec `npm ci`, build avec `npm run build` et sortie `dist`.
2. Dans **Project Settings → Environment Variables**, ajoutez `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` pour l'environnement **Production**.
3. Déployez le projet. `vercel.json` réécrit les routes React vers `index.html`, afin que les liens directs comme `/presentations/mon-expose` fonctionnent après rechargement.
4. Dans **Supabase → Authentication → URL Configuration**, définissez l'URL de production Vercel comme **Site URL** et ajoutez-la aux **Redirect URLs**. Ajoutez aussi les domaines de prévisualisation si l'authentification doit y fonctionner.

Le build de production échoue volontairement si l'URL Supabase ou la clé publishable manque. Cette clé est publique et soumise à RLS; ne mettez jamais une clé secrète Supabase dans une variable `VITE_*`.

---

## 🧪 Scénarios Validés

1. Inscription, connexion et session persistante.
2. Création et réorganisation de blocs de contenu ordonnés.
3. Prévisualisation en direct avant publication.
4. Gestion des brouillons privés vs publications publiques.
5. Système de likes sans doublon et commentaires en direct.
6. Classement temps réel avec podium des trois meilleurs étudiants.
7. Recherche, tri et filtres par filière universitaire.
