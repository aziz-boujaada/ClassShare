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

## Générateur de présentations IA

La page protégée `/presentations/generate` accepte des notes, un PDF (30 Mo et 80 pages par défaut), un lien public Google Slides, ou une présentation déjà créée par l'utilisateur pour en tirer un défi de code. Pour ce dernier mode, l'Edge Function vérifie la propriété de la présentation et la lit directement dans Supabase; elle ne crée pas une seconde présentation. L'export Slides est demandé uniquement à `docs.google.com` via son URL d'export PDF fixe; les redirections sont refusées. Canva ne fournit pas automatiquement l'accès aux contenus d'un lien de partage : exportez-le en PDF et importez le fichier.

La génération s'exécute dans `supabase/functions/generate-presentation` via l'API Groq, avec une clé conservée côté serveur et des réponses JSON validées par la fonction avant utilisation. Les PDF sont extraits page par page en mémoire avec le build serverless de `unpdf`, sans stockage durable ni OCR. Les contenus scannés sans texte extractible sont refusés avec une explication. Les présentations produites utilisent les blocs existants et sont enregistrées en brouillon; elles doivent être relues et publiées explicitement par l'étudiant.

Pour déployer cette fonctionnalité :

1. Appliquez les migrations avec `npx supabase db push` (la migration de quota limite un utilisateur à 10 demandes par 24 heures).
2. Définissez les secrets Edge Function :
   ```bash
   npx supabase secrets set GROQ_API_KEY='votre-cle-groq'
   npx supabase secrets set GROQ_MODEL='openai/gpt-oss-20b'
   npx supabase secrets set MAX_PDF_SIZE_MB=30
   ```
3. Déployez la fonction :
   ```bash
   npx supabase functions deploy generate-presentation
   ```
4. Définissez les variables optionnelles côté Edge Function, si nécessaire : `MAX_PDF_SIZE_MB`, `MAX_PDF_PAGES`, `MAX_GENERATION_TOKENS`, `AI_GENERATION_TIMEOUT_MS` et `APP_ORIGIN`. Les valeurs par défaut sont documentées dans `.env.example`. Les valeurs `VITE_*` ne sont jamais utilisées pour les secrets IA.

La fonction vérifie le JWT Supabase, utilise un quota atomique par utilisateur, borne les tailles et durées, valide la signature PDF, et valide/normalise la sortie avant de l'enregistrer. Pour les erreurs de format, elle peut afficher le message du fournisseur après suppression de la clé et troncature; le contenu du document et le prompt ne sont pas journalisés.

### Défis de programmation

Les cours de programmation et certains cours techniques peuvent générer un défi lié à une section de la présentation. Depuis `/presentations/generate`, choisissez « Défi depuis une présentation » pour sélectionner un de vos cours existants et générer un défi rattaché à celui-ci. Les défis publics et les brouillons d'étudiants sont enregistrés dans Supabase. La solution de référence et les tests cachés sont conservés dans une colonne sans droit de lecture pour les clients; l'éditeur ne les reçoit pas. Le nouvel éditeur Monaco est chargé depuis les dépendances locales et les brouillons de code sont sauvegardés pour l'étudiant connecté.

Les boutons **Exécuter** et **Soumettre** appellent la fonction protégée `execute-code`. Elle envoie le code à un sandbox Judge0 configuré côté serveur, limite les ressources et vérifie les cas publics/cachés. Soumettre n’expose jamais les entrées ni sorties des tests cachés au navigateur. Les langages Java, Python, JavaScript et TypeScript sont pris en charge par Judge0; les défis SQL restent non exécutables par ce runner.

L’exécution utilise Judge0 CE (`https://ce.judge0.com`) sans clé API, avec Java 17 (ID 91). `JUDGE0_URL` est facultative; si elle est définie, elle doit cibler l’origine CE (`https://ce.judge0.com`) ou son chemin `/submissions`. Les clés Judge0 et RapidAPI ne sont pas envoyées par cette fonction.

```bash
npx supabase db push
npx supabase functions deploy execute-code
```

Les IDs par défaut sont Java 17 (91), Python (71), JavaScript (63) et TypeScript (74); `JUDGE0_LANGUAGE_IDS` peut remplacer ces valeurs pour une instance différente. Le quota est de 30 actions par utilisateur et par heure. Le bouton Exécuter transmet l’entrée standard éditable de la console; Soumettre évalue les tests publics et cachés côté serveur.

---

## 🧪 Scénarios Validés

1. Inscription, connexion et session persistante.
2. Création et réorganisation de blocs de contenu ordonnés.
3. Prévisualisation en direct avant publication.
4. Gestion des brouillons privés vs publications publiques.
5. Système de likes sans doublon et commentaires en direct.
6. Classement temps réel avec podium des trois meilleurs étudiants.
7. Recherche, tri et filtres par filière universitaire.
