// === HELPERS DE OTIMIZAÇÃO ===

// Comprime imagem usando Canvas para evitar que o LocalStorage exploda
const ImageOptimizer = {
    compress(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Redimensionar (Max 800px largura)
                    const maxWidth = 800;
                    const scaleSize = maxWidth / img.width;
                    canvas.width = maxWidth;
                    canvas.height = img.height * scaleSize;

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Comprimir JPEG 0.7
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = (error) => reject(error);
            };
        });
    }
};

const Store = {
    state: {
        filter: 'all',
        search: '',
        page: 1,
        postsPerPage: 8,
        isLoading: false,
        hasMore: true,
        activePostId: null,
        activeProfileUser: null,
        isSignupMode: false
    },
    db: { users: [], posts: [], session: null },

    init() {
        this.db.users = JSON.parse(localStorage.getItem('vibe_users')) || [];
        this.db.posts = JSON.parse(localStorage.getItem('vibe_posts')) || [];
        this.db.session = JSON.parse(localStorage.getItem('vibe_session')) || null;
        if(this.db.posts.length === 0) this.seedData();
    },

    save() {
        try {
            localStorage.setItem('vibe_users', JSON.stringify(this.db.users));
            localStorage.setItem('vibe_posts', JSON.stringify(this.db.posts));
            localStorage.setItem('vibe_session', JSON.stringify(this.db.session));
        } catch (e) {
            alert("Armazenamento cheio! Tente postar imagens menores ou apagar dados antigos.");
        }
    },

    updateSession(user) {
        this.db.session = user;
        const idx = this.db.users.findIndex(u => u.email === user.email);
        if(idx !== -1) this.db.users[idx] = user;
        this.save();
    },

    seedData() {
        const users = ['Alice', 'CyberX', 'DesignGod', 'NeonVibe'];
        users.forEach(u => {
            if(!this.db.users.find(x => x.name === u)) {
                this.db.users.push({ name: u, email: `${u.toLowerCase()}@vibe.com`, pass: '123', following: [] });
            }
        });
        // Mock initial posts
        const topics = ['Neon', 'Minimal', 'Cyberpunk', 'Nature', 'Gaming'];
        for(let i=0; i<16; i++) {
            this.db.posts.push({
                id: Date.now() + i,
                user: users[i % 4],
                caption: `${topics[i % 5]} vibe #${i}`,
                img: `https://picsum.photos/600/${Math.floor(Math.random()*300+400)}?random=${i}`,
                likesBy: [], comments: [], createdAt: Date.now() - (i * 1000000)
            });
        }
        this.save();
    },

    getFilteredPosts() {
        let posts = [...this.db.posts];
        if(this.state.search) posts = posts.filter(p => p.caption.toLowerCase().includes(this.state.search));
        
        if(this.state.filter === 'trending') posts.sort((a, b) => (b.likesBy?.length || 0) - (a.likesBy?.length || 0));
        else if(this.state.filter === 'following') {
            if(!this.db.session) return [];
            const following = this.db.session.following || [];
            posts = posts.filter(p => following.includes(p.user));
        } else posts.sort((a, b) => b.createdAt - a.createdAt);
        
        return posts;
    },

    getPaginatedPosts() {
        const all = this.getFilteredPosts();
        const end = this.state.page * this.state.postsPerPage;
        this.state.hasMore = end < all.length;
        return all.slice(0, end);
    }
};

const UI = {
    elements: {
        grid: document.getElementById('gallery-grid'),
        loader: document.getElementById('infinite-loader'),
        empty: document.getElementById('empty-state'),
        userArea: document.getElementById('user-area'),
        searchSpinner: document.getElementById('search-spinner'),
        userResults: document.getElementById('user-results'),
        userResultsGrid: document.getElementById('user-results-grid')
    },
    menuTimeout: null,

    renderHeader() {
        const session = Store.db.session;
        if(session) {
            const initial = session.name.charAt(0).toUpperCase();
            const avatarImg = session.avatar ? `<img src="${session.avatar}" class="w-full h-full object-cover">` : initial;
            
            this.elements.userArea.innerHTML = `
              <button onclick="UI.openModal('upload-modal')" class="hidden md:flex items-center gap-2 bg-accent text-black font-bold px-4 py-2 rounded-full hover:brightness-110 transition">
                <i class="ph-bold ph-plus"></i> Criar
              </button>
              <div class="relative group" onmouseenter="UI.cancelHideMenu()" onmouseleave="UI.deferHideMenu()">
                 <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-green-600 p-[2px] cursor-pointer overflow-hidden">
                    <div class="w-full h-full rounded-full bg-card flex items-center justify-center font-bold text-white text-sm overflow-hidden">
                        ${avatarImg}
                    </div>
                 </div>
                 <div id="user-dropdown" class="absolute right-0 top-12 w-48 bg-card border border-white/10 rounded-xl shadow-2xl hidden z-50 overflow-hidden animate-fade-in">
                    <div class="px-4 py-3 border-b border-white/5">
                        <p class="text-white font-bold text-sm truncate">${session.name}</p>
                    </div>
                    <button onclick="App.openProfile()" class="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"><i class="ph ph-user"></i> Meu Perfil</button>
                    <button onclick="App.logout()" class="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 transition"><i class="ph ph-sign-out"></i> Sair</button>
                 </div>
              </div>
            `;
        } else {
            this.elements.userArea.innerHTML = `
              <button onclick="App.openAuth('login')" class="text-gray-300 hover:text-white font-medium text-sm px-2">Entrar</button>
              <button onclick="App.openAuth('signup')" class="bg-white text-black px-6 py-2 rounded-full font-bold text-sm hover:bg-gray-200 transition">Cadastrar</button>
            `;
        }
    },

    deferHideMenu() {
        this.menuTimeout = setTimeout(() => {
            const menu = document.getElementById('user-dropdown');
            if(menu) menu.classList.add('hidden');
        }, 1500);
    },

    cancelHideMenu() {
        clearTimeout(this.menuTimeout);
        const menu = document.getElementById('user-dropdown');
        if(menu) menu.classList.remove('hidden');
    },

    renderGrid(posts, append = false) {
        if(!append) this.elements.grid.innerHTML = '';
        if(posts.length === 0 && !append) {
            this.elements.empty.classList.remove('hidden');
            this.elements.empty.classList.add('flex');
        } else {
            this.elements.empty.classList.add('hidden');
            this.elements.empty.classList.remove('flex');
        }

        const fragment = document.createDocumentFragment();
        posts.forEach(post => {
            if(append && document.getElementById(`post-${post.id}`)) return;
            const liked = Store.db.session && post.likesBy?.includes(Store.db.session.email);
            const el = document.createElement('div');
            el.id = `post-${post.id}`;
            el.className = 'pin group cursor-pointer animate-fade-in';
            el.onclick = () => App.openViewModal(post.id);
            el.innerHTML = `
              <img src="${post.img}" class="w-full block bg-gray-800" loading="lazy">
              <div class="pin-overlay absolute inset-0 flex flex-col justify-end p-4">
                <p class="text-white font-bold text-sm truncate drop-shadow-md">${post.caption}</p>
                <div class="flex justify-between items-center mt-2">
                  <span class="text-xs text-gray-200 font-medium shadow-black drop-shadow-md hover:text-accent" onclick="event.stopPropagation(); App.openProfile('${post.user}')">@${post.user}</span>
                  <div class="flex items-center gap-1 bg-black/40 backdrop-blur px-2 py-1 rounded-full text-white">
                    <i class="${liked ? 'ph-fill text-accent' : 'ph-bold'} ph-heart"></i>
                    <span class="text-xs font-bold">${post.likesBy?.length || 0}</span>
                  </div>
                </div>
              </div>
            `;
            fragment.appendChild(el);
        });
        this.elements.grid.appendChild(fragment);
    },

    renderUserResults(users) {
        const container = this.elements.userResults;
        const grid = this.elements.userResultsGrid;
        grid.innerHTML = '';
        
        if(users.length === 0) {
            container.classList.add('hidden');
            container.classList.remove('flex');
            return;
        }
        container.classList.remove('hidden'); container.classList.add('flex');

        users.forEach(u => {
            const initial = u.name.charAt(0).toUpperCase();
            const avatar = u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover">` : initial;
            const div = document.createElement('div');
            div.className = 'bg-card border border-white/10 p-4 rounded-xl flex items-center gap-3 cursor-pointer hover:border-accent transition';
            div.onclick = () => App.openProfile(u.name);
            div.innerHTML = `<div class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden text-white font-bold">${avatar}</div><p class="text-white font-bold text-sm">${u.name}</p>`;
            grid.appendChild(div);
        });
    },

    setLoading(bool) {
        Store.state.isLoading = bool;
        const loader = this.elements.loader;
        bool ? loader.classList.remove('opacity-0') : loader.classList.add('opacity-0');
    },

    openModal(id) {
        document.getElementById(id).classList.remove('hidden');
        document.getElementById(id).classList.add('flex');
    },

    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
        document.getElementById(id).classList.remove('flex');
    },

    showToast(msg, title="Sucesso", type="success") {
        const t = document.getElementById('toast');
        document.getElementById('toast-title').innerText = title;
        document.getElementById('toast-msg').innerText = msg;
        t.classList.remove('translate-x-[150%]');
        setTimeout(() => t.classList.add('translate-x-[150%]'), 3000);
    },

    updateTabs(filter) {
        document.querySelectorAll('aside nav button').forEach(btn => btn.classList.remove('tab-active', 'bg-white/5', 'text-white'));
        const active = document.getElementById(`nav-${filter}`);
        if(active) active.classList.add('tab-active');
    }
};

const App = {
    init() {
        Store.init();
        UI.renderHeader();
        this.loadPosts(true);
        this.setupInfiniteScroll();
        this.setupGlobalEvents();
    },

    loadPosts(reset = false) {
        if(Store.state.isLoading) return;
        if(reset) { Store.state.page = 1; Store.state.hasMore = true; UI.elements.grid.innerHTML = ''; }
        if(!Store.state.hasMore) return;

        UI.setLoading(true);
        // Delay artificial para simular carregamento e suavidade
        setTimeout(() => {
            const posts = Store.getPaginatedPosts();
            UI.renderGrid(posts, !reset);
            UI.setLoading(false);
        }, 600);
    },

    setupInfiniteScroll() {
        new IntersectionObserver((entries) => {
            if(entries[0].isIntersecting && !Store.state.isLoading && Store.state.hasMore) {
                Store.state.page++;
                this.loadPosts(false);
            }
        }, { rootMargin: '200px' }).observe(UI.elements.loader);
    },

    setFilter(filter) {
        Store.state.filter = filter;
        UI.updateTabs(filter);
        document.getElementById('page-title').innerText = { 'all': 'Para Você', 'trending': 'Em Alta', 'following': 'Seguindo' }[filter];
        this.loadPosts(true);
    },

    handleSearch(val) {
        clearTimeout(this.searchTimeout);
        UI.elements.searchSpinner.classList.remove('hidden');
        const input = document.getElementById('global-search');
        if(input && input.value !== val) input.value = val;

        this.searchTimeout = setTimeout(() => {
            Store.state.search = val.toLowerCase();
            const foundUsers = val ? Store.db.users.filter(u => u.name.toLowerCase().includes(val.toLowerCase())) : [];
            UI.renderUserResults(foundUsers);
            this.loadPosts(true);
            UI.elements.searchSpinner.classList.add('hidden');
        }, 500);
    },

    openAuth(mode) {
        Store.state.isSignupMode = (mode === 'signup');
        this.updateAuthModalUI();
        UI.openModal('auth-modal');
    },

    toggleAuthMode() {
        Store.state.isSignupMode = !Store.state.isSignupMode;
        this.updateAuthModalUI();
    },

    updateAuthModalUI() {
        const title = document.getElementById('auth-title');
        const nameInput = document.getElementById('auth-name');
        const switchBtn = document.getElementById('auth-switch');
        if(Store.state.isSignupMode) {
            title.innerText = "Criar Conta"; nameInput.classList.remove('hidden');
            switchBtn.innerHTML = "Já tem conta? <span class='underline'>Faça login</span>.";
        } else {
            title.innerText = "Entrar"; nameInput.classList.add('hidden');
            switchBtn.innerHTML = "Não tem conta? <span class='underline'>Cadastre-se</span>.";
        }
    },

    handleAuthSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-pass').value;
        const name = document.getElementById('auth-name').value;

        if(Store.state.isSignupMode) {
            if(Store.db.users.find(u => u.email === email)) return UI.showToast("E-mail já cadastrado", "Erro", "error");
            const newUser = { name, email, pass, following: [], avatar: null };
            Store.db.users.push(newUser); Store.db.session = newUser;
            UI.showToast("Conta criada!");
        } else {
            const user = Store.db.users.find(u => u.email === email && u.pass === pass);
            if(!user) return UI.showToast("Dados incorretos", "Erro", "error");
            Store.db.session = user;
            UI.showToast(`Bem-vindo, ${user.name}!`);
        }
        Store.save(); UI.renderHeader(); UI.closeModal('auth-modal'); this.loadPosts(true);
    },

    logout() {
        Store.db.session = null; Store.save(); UI.renderHeader(); this.setFilter('all'); UI.showToast("Saiu.");
    },

    createPost() {
        const fileInput = document.getElementById('file-input');
        const captionInput = document.getElementById('post-caption');
        const btn = document.getElementById('btn-publish');

        if(!Store.db.session) return UI.showToast("Faça login.", "Erro", "error");
        if(fileInput.files.length === 0) return UI.showToast("Escolha imagem.", "Erro", "error");

        btn.innerText = "Processando...";
        btn.disabled = true;

        // Usando o Otimizador de Imagem
        ImageOptimizer.compress(fileInput.files[0]).then(compressedImg => {
            const newPost = {
                id: Date.now(), user: Store.db.session.name, caption: captionInput.value || "",
                img: compressedImg, likesBy: [], comments: [], createdAt: Date.now()
            };
            Store.db.posts.unshift(newPost); Store.save();
            UI.closeModal('upload-modal'); UI.showToast("Publicado!"); this.loadPosts(true);
            
            // Reset
            fileInput.value = ''; captionInput.value = '';
            document.getElementById('preview-img').classList.add('hidden');
            document.getElementById('upload-placeholder').classList.remove('hidden');
            btn.innerText = "Publicar"; btn.disabled = false;
        }).catch(err => {
            console.error(err);
            UI.showToast("Erro ao processar imagem", "Erro", "error");
            btn.innerText = "Publicar"; btn.disabled = false;
        });
    },

    openViewModal(postId) {
        const post = Store.db.posts.find(p => p.id === postId);
        if(!post) return;
        Store.state.activePostId = postId;

        document.getElementById('view-img').src = post.img;
        document.getElementById('view-caption').innerText = post.caption;
        document.getElementById('view-user').innerText = post.user;
        
        const author = Store.db.users.find(u => u.name === post.user);
        const avatarEl = document.getElementById('view-avatar');
        const avatarIcon = document.getElementById('view-avatar-icon');
        if(author && author.avatar) {
            avatarEl.src = author.avatar; avatarEl.classList.remove('hidden'); avatarIcon.classList.add('hidden');
        } else {
            avatarEl.classList.add('hidden'); avatarIcon.classList.remove('hidden');
        }

        this.updatePostInteractions(post);
        this.renderComments(post);
        this.updateFollowButton('follow-btn', post.user);
        UI.openModal('view-modal');
    },

    updateFollowButton(btnId, targetUser) {
        const btn = document.getElementById(btnId);
        if(Store.db.session && Store.db.session.name !== targetUser) {
            const isFollowing = Store.db.session.following?.includes(targetUser);
            btn.innerText = isFollowing ? "Seguindo" : "Seguir";
            btn.className = isFollowing 
                ? "text-xs font-bold px-3 py-1.5 rounded-full bg-accent text-black transition"
                : "text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 hover:bg-white hover:text-black transition";
            btn.onclick = () => this.toggleFollow(targetUser);
            btn.style.display = "block";
        } else {
            btn.style.display = "none";
        }
    },

    toggleLike() {
        if(!Store.db.session) return UI.showToast("Login necessário.", "Ops", "error");
        const postIdx = Store.db.posts.findIndex(p => p.id === Store.state.activePostId);
        if(postIdx === -1) return;
        const post = Store.db.posts[postIdx];
        const email = Store.db.session.email;
        
        if(post.likesBy.includes(email)) post.likesBy = post.likesBy.filter(e => e !== email);
        else post.likesBy.push(email);
        
        Store.save();
        this.updatePostInteractions(post);
    },

    toggleFollow(targetUser) {
        if(!Store.db.session) return UI.showToast("Login necessário.", "Ops", "error");
        const session = Store.db.session;
        session.following = session.following || [];
        
        if(session.following.includes(targetUser)) {
            session.following = session.following.filter(u => u !== targetUser);
        } else {
            session.following.push(targetUser);
            UI.showToast(`Seguindo ${targetUser}`);
        }
        
        Store.updateSession(session);
        this.updateFollowButton('follow-btn', targetUser);
        this.updateFollowButton('profile-follow-btn', targetUser);
    },

    postComment(e) {
        e.preventDefault();
        if(!Store.db.session) return UI.showToast("Login necessário.", "Ops", "error");
        const input = document.getElementById('comment-input');
        if(!input.value.trim()) return;

        const postIdx = Store.db.posts.findIndex(p => p.id === Store.state.activePostId);
        Store.db.posts[postIdx].comments.push({ user: Store.db.session.name, text: input.value.trim(), date: Date.now() });
        Store.save();
        input.value = '';
        this.renderComments(Store.db.posts[postIdx]);
    },

    updatePostInteractions(post) {
        const liked = Store.db.session && post.likesBy.includes(Store.db.session.email);
        const icon = document.getElementById('view-like-icon');
        const count = document.getElementById('view-likes-count');
        const btn = document.getElementById('view-like-btn');
        count.innerText = `${post.likesBy.length} curtidas`;
        icon.className = liked ? "ph-fill ph-heart text-2xl text-accent animate-pulse-fast" : "ph-bold ph-heart text-2xl";
        btn.onclick = () => this.toggleLike();
    },

    renderComments(post) {
        const list = document.getElementById('comments-list');
        list.innerHTML = '';
        if(!post.comments || post.comments.length === 0) {
            list.innerHTML = '<p class="text-xs text-gray-500 italic">Sem comentários.</p>'; return;
        }
        post.comments.forEach(c => {
            list.innerHTML += `<div class="flex gap-3 items-start animate-fade-in"><div class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0"><span class="text-xs font-bold text-gray-300">${c.user.charAt(0).toUpperCase()}</span></div><div><p class="text-xs font-bold text-white">${c.user}</p><p class="text-sm text-gray-300">${c.text}</p></div></div>`;
        });
    },

    openProfile(targetUser = null) {
        const username = targetUser || (Store.db.session ? Store.db.session.name : null);
        if(!username) return App.openAuth('login');

        Store.state.activeProfileUser = username;
        const userObj = Store.db.users.find(u => u.name === username);
        const isMe = Store.db.session && Store.db.session.name === username;

        document.getElementById('profile-name').innerText = username;
        document.getElementById('profile-initial').innerText = username.charAt(0).toUpperCase();
        
        const avatarImg = document.getElementById('profile-avatar-img');
        const initialTxt = document.getElementById('profile-initial');
        const editOverlay = document.getElementById('profile-edit-overlay');

        if(userObj && userObj.avatar) {
            avatarImg.src = userObj.avatar; avatarImg.classList.remove('hidden'); initialTxt.classList.add('hidden');
        } else {
            avatarImg.classList.add('hidden'); initialTxt.classList.remove('hidden');
        }

        isMe ? editOverlay.classList.replace('hidden','flex') : editOverlay.classList.replace('flex','hidden');

        const myPosts = Store.db.posts.filter(p => p.user === username);
        const myLikes = Store.db.posts.filter(p => p.likesBy?.includes(userObj.email));
        document.getElementById('profile-stats').innerText = `${myPosts.length} posts • ${myLikes.length} curtidas`;
        
        this.updateFollowButton('profile-follow-btn', username);
        UI.openModal('profile-modal');
        this.switchProfileTab('posts');
    },

    updateAvatar(input) {
        if(!input.files || !input.files[0]) return;
        if(!Store.db.session) return;

        ImageOptimizer.compress(input.files[0]).then(newAvatar => {
            Store.db.session.avatar = newAvatar;
            Store.updateSession(Store.db.session);
            document.getElementById('profile-avatar-img').src = newAvatar;
            document.getElementById('profile-avatar-img').classList.remove('hidden');
            document.getElementById('profile-initial').classList.add('hidden');
            UI.renderHeader();
            UI.showToast("Foto atualizada!");
        });
    },

    switchProfileTab(tab) {
        const grid = document.getElementById('profile-grid');
        const btnPosts = document.getElementById('tab-posts');
        const btnLikes = document.getElementById('tab-likes');
        const username = Store.state.activeProfileUser;
        const userObj = Store.db.users.find(u => u.name === username);
        
        grid.innerHTML = '';

        if(tab === 'posts') {
            btnPosts.className = "flex-1 md:flex-none px-8 py-4 text-sm font-bold text-white border-b-2 border-accent";
            btnLikes.className = "flex-1 md:flex-none px-8 py-4 text-sm font-bold text-gray-500 hover:text-white";
            const posts = Store.db.posts.filter(p => p.user === username);
            this.renderProfileGrid(posts, grid);
        } else {
            btnPosts.className = "flex-1 md:flex-none px-8 py-4 text-sm font-bold text-gray-500 hover:text-white";
            btnLikes.className = "flex-1 md:flex-none px-8 py-4 text-sm font-bold text-white border-b-2 border-accent";
            const posts = Store.db.posts.filter(p => p.likesBy?.includes(userObj.email));
            this.renderProfileGrid(posts, grid);
        }
    },

    renderProfileGrid(posts, container) {
        if(posts.length === 0) {
            container.innerHTML = '<p class="text-gray-500 col-span-full text-center py-10">Nada para mostrar.</p>'; return;
        }
        posts.forEach(post => {
            const el = document.createElement('div');
            el.className = "aspect-square rounded-xl overflow-hidden relative group cursor-pointer border border-white/10";
            el.onclick = () => this.openViewModal(post.id);
            el.innerHTML = `<img src="${post.img}" class="w-full h-full object-cover hover:scale-110 transition duration-500"><div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 text-white font-bold"><i class="ph-fill ph-heart"></i> ${post.likesBy?.length || 0}</div>`;
            container.appendChild(el);
        });
    },

    setupGlobalEvents() {
        document.getElementById('auth-form').addEventListener('submit', (e) => this.handleAuthSubmit(e));
        document.getElementById('comment-form').addEventListener('submit', (e) => this.postComment(e));
        
        document.getElementById('file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = document.getElementById('preview-img');
                    img.src = ev.target.result; img.classList.remove('hidden');
                    document.getElementById('upload-placeholder').classList.add('hidden');
                }
                reader.readAsDataURL(file);
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
