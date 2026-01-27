# Frontend Refactoring Plan: Modular Architecture

To improve control, scalability, and maintainability, we will transition the frontend from a flat component structure to a feature-based modular architecture, similar to the Backend.

## 1. New Directory Structure
I have pre-created the following folder structure in `src/`:

```
src/
├── features/           # Feature-specific logic & UI
│   ├── auth/           # Authentication (Login, Register, OAuth, Password Reset)
│   ├── chat/           # Chat functionality (Chat, Input, Models)
│   ├── knowledge/      # Admin Knowledge Base
│   ├── wallet/         # Wallet, Transactions, Banking
│   ├── subscription/   # Plans, Billing History
│   └── user/           # User Profile, Usage Dashboard, Avatar
├── components/         # Shared Reusable Components
│   ├── ui/             # Atomic elements (Dialogs, Toasts)
│   └── shared/         # Common widgets
├── pages/              # Top-level Page Views (Mapped to Routes)
├── layouts/            # Page Layout Wrappers (MainLayout, AuthLayout)
└── routes/             # Router configuration file
```

## 2. File Migration Mapping Table
Move files from `src/component/` to the new locations:

| File Pattern | Target Location |
|--------------|-----------------|
| `Login.js`, `Register.js`, `OAuth*.js`, `*Password*.js`, `*Email*.js` | `src/features/auth/` |
| `Chat.js`, `ChatInputSuggest.js`, `ModelManager.js`, `ConversationsList.js` | `src/features/chat/` |
| `KnowledgeAdmin.js` | `src/features/knowledge/` |
| `WalletDashboard.js`, `TransactionHistory.js`, `Deposit*.js`, `Withdraw*.js`, `AddBank*.js`, `BankAccount*.js`, `Currency*.js` | `src/features/wallet/` |
| `Subscription*.js`, `BillingHistory*.js`, `UpgradePrompt.js` | `src/features/subscription/` |
| `ProfileSettings.js`, `Usage*.js`, `Avatar*.js`, `ChangePassword.js` | `src/features/user/` |
| `ConfirmDialog.js`, `Toast*.js` | `src/components/ui/` |

**Note on Utility Files:**
- `SessionManagement.js` can be moved to `src/hooks/` or `src/features/auth/hooks/`.
- `LanguageContext.js`, `DarkModeContext.js` should stay in `src/context/` (or move there if not present).

## 3. Next Steps (Action Items)

1.  **Move Files:** Drag and drop the files from `src/component/` to their new folders as per the table above.
2.  **Update Imports:**
    - VS Code usually updates imports automatically when you move files.
    - If not, verify `App.js` and inter-component imports.
3.  **Install Router:** 
    ```bash
    npm install react-router-dom
    ```
4.  **Implement Routes:**
    - Create `src/routes/index.js` to define routes like `/login`, `/chat`, `/admin`, `/profile`.
    - Create Page wrappers in `src/pages/` (e.g., `ChatPage.js` which renders `<Chat />`).
    - Update `App.js` to use `<RouterProvider>` instead of `useState('chat')`.

## Benefits
- **Better Control:** Logic is isolated by feature.
- **Scalability:** Easy to add new features without cluttering the root folder.
- **Navigation:** Proper URL routing allows deep linking and back button support.
