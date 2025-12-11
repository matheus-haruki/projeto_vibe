# VIBE - Estrutura do Projeto

## 📁 Estrutura de Arquivos

```
Projeto_de_Nuvem-main/
├── server.js                 # Servidor Node.js/Express
├── package.json              # Dependências do projeto
├── public/                   # Frontend (arquivos estáticos)
│   ├── index.html           # HTML principal (apenas estrutura)
│   ├── style.css            # Estilos CSS separados
│   ├── script.js            # Lógica JavaScript separada
│   └── index-substituido.html  # Backup do arquivo original
└── uploads/                  # Diretório para uploads de imagens
```

## 🎯 Arquivos Principais

### **index.html**
- Contém apenas a estrutura HTML
- Referencia arquivos externos (style.css e script.js)
- Usa Tailwind CSS para estilização base
- Estrutura semântica preparada para integração

### **style.css**
- Estilos customizados separados
- Classes reutilizáveis
- Otimizações de performance
- Responsividade mobile-first

### **script.js**
- Toda a lógica da aplicação
- Sistema de autenticação (localStorage)
- Gerenciamento de posts e usuários
- Pronto para migração de localStorage → Banco de Dados

## 🔄 Próximos Passos - Integração com Banco de Dados

### 1. **Estrutura de Dados Atual (LocalStorage)**

```javascript
// Store.db atual:
{
  users: [
    {
      name: string,
      email: string,
      pass: string,
      following: [string],
      avatar: string (base64)
    }
  ],
  posts: [
    {
      id: number,
      user: string,
      caption: string,
      img: string (base64),
      likesBy: [string],
      comments: [
        {
          user: string,
          text: string,
          date: number
        }
      ],
      createdAt: number
    }
  ],
  session: object | null
}
```

### 2. **Tabelas Sugeridas para o Banco de Dados**

#### **users**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **posts**
```sql
CREATE TABLE posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  caption TEXT,
  image_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### **likes**
```sql
CREATE TABLE likes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_like (post_id, user_id)
);
```

#### **comments**
```sql
CREATE TABLE comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### **follows**
```sql
CREATE TABLE follows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  follower_id INT NOT NULL,
  following_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_follow (follower_id, following_id)
);
```

### 3. **Endpoints API a Criar no server.js**

```javascript
// Autenticação
POST   /api/auth/register    // Criar nova conta
POST   /api/auth/login       // Login
POST   /api/auth/logout      // Logout
GET    /api/auth/session     // Verificar sessão

// Usuários
GET    /api/users            // Buscar usuários
GET    /api/users/:id        // Perfil do usuário
PUT    /api/users/:id        // Atualizar perfil
POST   /api/users/:id/avatar // Upload avatar

// Posts
GET    /api/posts            // Listar posts (com filtros: all, trending, following)
POST   /api/posts            // Criar post
GET    /api/posts/:id        // Detalhes do post
DELETE /api/posts/:id        // Deletar post

// Likes
POST   /api/posts/:id/like   // Curtir/descurtir
GET    /api/posts/:id/likes  // Listar curtidas

// Comentários
POST   /api/posts/:id/comments      // Adicionar comentário
GET    /api/posts/:id/comments      // Listar comentários
DELETE /api/comments/:id             // Deletar comentário

// Seguir
POST   /api/users/:id/follow        // Seguir/deixar de seguir
GET    /api/users/:id/followers     // Seguidores
GET    /api/users/:id/following     // Seguindo
```

### 4. **Modificações Necessárias no script.js**

#### **Substituir Store.init():**
```javascript
// Antes (localStorage):
init() {
  this.db.users = JSON.parse(localStorage.getItem('vibe_users')) || [];
  // ...
}

// Depois (API):
async init() {
  try {
    const response = await fetch('/api/auth/session');
    if (response.ok) {
      this.db.session = await response.json();
    }
  } catch (error) {
    console.error('Erro ao carregar sessão:', error);
  }
}
```

#### **Substituir Store.save():**
```javascript
// Remover completamente - a API salvará automaticamente
```

#### **Modificar App.createPost():**
```javascript
// Antes:
Store.db.posts.unshift(newPost);
Store.save();

// Depois:
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('caption', captionInput.value);

const response = await fetch('/api/posts', {
  method: 'POST',
  body: formData
});

if (response.ok) {
  const newPost = await response.json();
  // Atualizar UI
}
```

### 5. **Bibliotecas Necessárias**

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",           // Ou pg para PostgreSQL
    "multer": "^1.4.5-lts.1",     // Upload de arquivos
    "bcrypt": "^5.1.1",            // Hash de senhas
    "express-session": "^1.17.3",  // Gerenciar sessões
    "cors": "^2.8.5",              // CORS
    "dotenv": "^16.3.1"            // Variáveis de ambiente
  }
}
```

### 6. **Arquivo .env (Criar na raiz)**

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=vibe_social
DB_PORT=3306

SESSION_SECRET=sua_chave_secreta_aqui
PORT=3000

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

## 🚀 Como Integrar

1. **Instalar dependências:**
   ```bash
   npm install express mysql2 multer bcrypt express-session cors dotenv
   ```

2. **Criar banco de dados:**
   - Execute os scripts SQL acima
   - Configure as credenciais no .env

3. **Modificar server.js:**
   - Adicionar conexão com banco
   - Criar todos os endpoints da API

4. **Atualizar script.js:**
   - Substituir localStorage por chamadas fetch()
   - Manter estrutura atual da UI

5. **Testar:**
   ```bash
   node server.js
   ```

## 📝 Observações

- **Imagens:** Atualmente em base64. Na produção, salvar apenas URLs no banco
- **Senhas:** Usar bcrypt para hash antes de salvar
- **Sessões:** Implementar JWT ou express-session
- **Validação:** Adicionar validação de dados no backend
- **Segurança:** Sanitizar inputs, proteger rotas sensíveis

## 🎨 Frontend Pronto

O frontend está completamente funcional com:
- ✅ Sistema de autenticação
- ✅ Upload de imagens
- ✅ Feed de posts (grid masonry responsivo)
- ✅ Sistema de likes
- ✅ Comentários
- ✅ Perfis de usuário
- ✅ Seguir/deixar de seguir
- ✅ Busca

**Toda a lógica está pronta - basta conectar com o backend!**
