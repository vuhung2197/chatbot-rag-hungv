# Hướng dẫn setup ESLint và Prettier

## Bước 1: Cài đặt ESLint cho Backend

```bash
cd backend
npm install --save-dev eslint @eslint/js
npx eslint --init
```

Chọn các options:
- How would you like to use ESLint? → Problems
- What type of modules? → JavaScript modules (import/export)  
- Which framework? → None
- Does your project use TypeScript? → No
- Where does your code run? → Node
- What format config file? → JavaScript

## Bước 2: Tạo file cấu hình ESLint

Tạo file `backend/.eslintrc.js`:

```javascript
module.exports = {
  env: {
    es2021: true,
    node: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Bắt buộc sử dụng const/let thay vì var
    'no-var': 'error',
    'prefer-const': 'error',
    
    // Cấm console.log trong production
    'no-console': 'warn',
    
    // Cấm biến không sử dụng
    'no-unused-vars': 'error',
    
    // Bắt buộc semicolon
    'semi': ['error', 'always'],
    
    // Bắt buộc quotes nhất quán
    'quotes': ['error', 'single']
  }
};
```

## Bước 3: Cài đặt Prettier cho formatting

```bash
cd backend
npm install --save-dev prettier eslint-config-prettier
```

Tạo file `backend/.prettierrc`:

```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 80
}
```

## Bước 4: Cập nhật package.json scripts

```json
{
  "scripts": {
    "start": "node index.js",
    "lint": "eslint . --fix",
    "format": "prettier --write .",
    "check": "npm run lint && npm run format"
  }
}
```

## Bước 5: Setup cho Frontend (tương tự)

```bash
cd frontend  
npm install --save-dev eslint eslint-plugin-react eslint-plugin-react-hooks
```