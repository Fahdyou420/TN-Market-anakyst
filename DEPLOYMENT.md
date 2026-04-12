# Guide de Déploiement Local - Analyse Boursière Tunisie

Ce guide vous explique comment installer et faire fonctionner cette application sur votre PC local (Windows 11) avec une intégration complète vers **n8n**, **Ollama** et **LM Studio**.

## 💻 Votre Configuration Cible
- **OS**: Windows 11
- **Hardware**: i5-12400F / 16GB RAM / RTX 4060 (Idéal pour l'IA locale)
- **Outils**: Docker (pour n8n), Ollama/LM Studio (pour l'IA), No-IP (pour l'accès externe)

---

## 🚀 Étape 1 : Prérequis
Assurez-vous d'avoir installé les outils suivants :
1. **Node.js** (Version 18 ou plus) : [Télécharger ici](https://nodejs.org/)
2. **Git** : [Télécharger ici](https://git-scm.com/)
3. **Docker Desktop** : Déjà installé selon votre setup.

---

## 🛠 Étape 2 : Installation de l'Application
1. Ouvrez un terminal (PowerShell ou CMD).
2. Clonez votre dépôt GitHub :
   ```bash
   git clone https://github.com/VOTRE_NOM/VOTRE_REPO.git
   cd VOTRE_REPO
   ```
3. Installez les dépendances :
   ```bash
   npm install
   ```
4. Créez votre fichier d'environnement :
   - Copiez `.env.example` vers un nouveau fichier nommé `.env`.
   - Modifiez `APP_URL` pour qu'il corresponde à votre adresse locale (ex: `http://localhost:3000`) ou votre domaine No-IP.

---

## 🤖 Étape 3 : Configuration de l'IA (Ollama / LM Studio)
Puisque vous avez une **RTX 4060**, vous pouvez faire tourner des modèles puissants localement.

### Option A : Ollama
1. Lancez Ollama.
2. Téléchargez un modèle performant pour l'analyse :
   ```bash
   ollama run mistral
   ```

### Option B : LM Studio
1. Lancez LM Studio.
2. Chargez un modèle (ex: `Llama-3-8B-Instruct`).
3. Allez dans l'onglet **Local Server** et cliquez sur **Start Server**. Il sera accessible sur `http://localhost:1234`.

---

## 🔗 Étape 4 : Intégration n8n (Le Cerveau)
Votre n8n tourne dans Docker. Voici comment le lier :

1. **Scraping Quotidien** :
   - Créez un workflow avec un noeud **Schedule**.
   - Ajoutez un noeud **HTTP Request** :
     - Méthode : `POST`
     - URL : `http://host.docker.internal:3000/api/scrape/news` (Utilisez `host.docker.internal` pour que Docker puisse parler à votre Windows).

2. **Analyse IA** :
   - Après le scraping, récupérez les données via `GET http://host.docker.internal:3000/api/market/summary`.
   - Envoyez ces données à un noeud **Ollama** ou **HTTP Request** (pour LM Studio).
   - **Prompt suggéré** : *"Analyse ces actualités boursières tunisiennes et donne-moi les 3 points clés et le sentiment du marché."*

3. **Retour vers l'App** :
   - Ajoutez un noeud **HTTP Request** final :
     - Méthode : `POST`
     - URL : `http://host.docker.internal:3000/api/n8n/analysis`
     - Body (JSON) :
       ```json
       {
         "analysis": "{{ $json.ai_output }}",
         "type": "sentiment",
         "source": "Ollama-Mistral"
       }
       ```

---

## 🌐 Étape 5 : Accès Externe (No-IP)
Pour voir votre dashboard depuis l'extérieur :
1. Dans votre routeur, faites une redirection de port (**Port Forwarding**) :
   - Port externe : `80` ou `3000`
   - Port interne : `3000`
   - IP interne : L'adresse IP de votre PC (ex: `192.168.1.50`).
2. Votre application sera accessible via `http://votre-nom.no-ip.org`.

---

## 🏃 Étape 6 : Lancement
Pour démarrer l'application en mode développement :
```bash
npm run dev
```
L'application sera disponible sur `http://localhost:3000`.

---

## 💡 Optimisation GPU (RTX 4060)
Votre carte graphique est excellente pour l'IA locale. 
- **Dans Ollama** : Il utilisera automatiquement vos 8Go de VRAM.
- **Dans LM Studio** : Assurez-vous de cocher **"GPU Offload"** dans les paramètres du modèle pour des réponses instantanées.

---

## 📝 Notes pour débutants
- **Logs** : Si quelque chose ne marche pas, regardez le terminal où tourne `npm run dev`.
- **Base de données** : Les données sont stockées dans `data/db.json`. Vous pouvez le sauvegarder manuellement si besoin.
- **Docker** : N'oubliez pas que `localhost` dans n8n (Docker) désigne le container lui-même. Utilisez toujours `host.docker.internal` pour contacter l'application qui tourne sur Windows.
