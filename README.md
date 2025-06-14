# HaqqMitra - Lawyer Companion

HaqqMitra is a modern legal tech web application designed to help lawyers and legal professionals manage cases, analyze documents, and get AI-powered insights for strategic decision-making. The platform provides an intuitive interface for organizing cases, uploading documents, and leveraging machine learning (ML) predictions to assist with legal strategy, cost estimation, and more.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (React-based, server-side rendering)
- **Frontend**: React, TypeScript, Radix UI, Lucide React icons
- **State Management & Utilities**: React Context, Custom Hooks
- **Backend/Services**: Firebase (Firestore for database, Firebase Storage for file uploads)
- **AI/ML Integration**: Custom flows simulating ML predictions, with integration points for Perplexity API (for strategy generation)
- **Styling**: Custom CSS, Inter & Space Grotesk fonts
- **Other Tools**: Nix for development environment management (see `.idx/dev.nix`)

---

## 🚀 Getting Started (Local Development)

### 1. **Clone the repository**
```sh
git clone https://github.com/AmanKashyap0807/HaqqMitra-Lawyer_Cyfuture.git
cd HaqqMitra-Lawyer_Cyfuture
```

### 2. **Install dependencies**
```sh
npm install
# or
yarn install
```

### 3. **Set up environment variables**
- Copy `.env.example` to `.env.local` and fill in the required Firebase and API credentials.
- Example:
  ```
  NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
  NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
  PERPLEXITY_API_KEY=your_perplexity_api_key
  ```

### 4. **Run the development server**
```sh
npm run dev
# or
yarn dev
```
- The app should now be running at [http://localhost:3000](http://localhost:3000).

---

## 🧑‍💻 Project Structure

- `src/app/`: Main application pages and layout
- `src/components/`: UI components (Sidebar, Forms, Panels, etc.)
- `src/ai/`: AI/ML flow logic and API integration
- `src/services/`: Service functions (chat, case management, etc.)
- `src/lib/`: Utility libraries (Firebase config, etc.)
- `src/types/`: TypeScript types and interfaces
- `docs/`: Project documentation and style guides

---

## 📝 Additional Notes

- **Firebase**: Make sure your Firebase project is set up and credentials are correct.
- **ML/AI Integration**: Some features require valid API keys (e.g., Perplexity) for full AI-powered analysis.
- **Nix/Dev Containers**: For cloud workspaces or reproducible environments, see `.idx/dev.nix`.
