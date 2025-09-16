class GeopoliticalNewsAggregator {
    constructor() {
        this.apiKey = 'AIzaSyAX5MMNJGPgokFb2Yiu0ejGfV-QAnDpu_4';
        this.channels = [
            { name: 'Dialogue Works Português', id: '@DialogueWorksPT', channelId: null },
            { name: 'TRT World', id: '@trtworld', channelId: null },
            { name: 'La Iguana TV', id: '@laiguanatv-television', channelId: null },
            { name: 'Neutrality Studies Português', id: '@NeutralityStudiesPT', channelId: null },
            { name: 'Glenn Diesen Português', id: '@GDiesenPT', channelId: null },
            { name: 'Danny Haiphong Português', id: '@DHaiphongPT', channelId: null },
            { name: 'India & Global Left Português', id: '@IndiaGlobalLeftPT', channelId: null },
            { name: 'Meet Your Mentor em Português', id: '@MeetYourMentor_pt', channelId: null },
            { name: 'Pepe Café', id: '@pepecafe', channelId: null },
            { name: 'Opera Mundi', id: '@omundi', channelId: null },
            { name: 'The Africa News Network', id: '@TheAfricaNewsNetwork', channelId: null },
            { name: 'Novara Media', id: '@NovaraMedia', channelId: null },
            { name: 'The Grayzone', id: '@thegrayzone7996', channelId: null },
            { name: 'Democracy Now!', id: '@DemocracyNow', channelId: null },
            { name: 'SaneVox Português', id: '@SaneVoxPT', channelId: null },
            { name: 'World Affairs In Context - Português', id: '@LenaPetrovaPT', channelId: null }
        ];
        
        this.allVideos = [];
        this.filteredVideos = [];
        this.currentFilter = '';
        this.currentSort = 'newest';
        this.videosPerPage = 12;
        this.currentPage = 1;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.renderChannelsList();
        this.renderChannelFilter();
        await this.loadAllChannelIds();
        await this.loadAllVideos();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');
        
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
            clearSearch.style.display = e.target.value ? 'block' : 'none';
        });
        
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            clearSearch.style.display = 'none';
            this.handleSearch('');
        });

        // Filter and sort
        document.getElementById('channelFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.applyFilters();
        });

        document.getElementById('sortOrder').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.applyFilters();
        });

        // Refresh button
        document.getElementById('refreshAll').addEventListener('click', () => {
            this.loadAllVideos();
        });

        // Load more button
        document.getElementById('loadMoreBtn').addEventListener('click', () => {
            this.loadMoreVideos();
        });
    }

    renderChannelsList() {
        const channelsList = document.getElementById('channelsList');
        channelsList.innerHTML = `
            <li><a href="#" data-channel="" class="active">Todos os canais</a></li>
            ${this.channels.map(channel => `
                <li><a href="#" data-channel="${channel.name}">${channel.name}</a></li>
            `).join('')}
        `;

        // Add click handlers for channel navigation
        channelsList.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                
                // Update active state
                channelsList.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                e.target.classList.add('active');
                
                // Filter by channel
                const channelName = e.target.dataset.channel;
                document.getElementById('channelFilter').value = channelName;
                this.currentFilter = channelName;
                this.applyFilters();
            }
        });
    }

    renderChannelFilter() {
        const channelFilter = document.getElementById('channelFilter');
        channelFilter.innerHTML = `
            <option value="">Todos os canais</option>
            ${this.channels.map(channel => `
                <option value="${channel.name}">${channel.name}</option>
            `).join('')}
        `;
    }

    async loadAllChannelIds() {
        const promises = this.channels.map(async (channel) => {
            try {
                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${channel.id}&key=${this.apiKey}`
                );
                const data = await response.json();
                
                if (data.items && data.items.length > 0) {
                    channel.channelId = data.items[0].id;
                } else {
                    // Fallback: try searching by channel name
                    const searchResponse = await fetch(
                        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(channel.name)}&type=channel&key=${this.apiKey}`
                    );
                    const searchData = await searchResponse.json();
                    
                    if (searchData.items && searchData.items.length > 0) {
                        channel.channelId = searchData.items[0].snippet.channelId;
                    }
                }
            } catch (error) {
                console.error(`Erro ao carregar ID do canal ${channel.name}:`, error);
            }
        });

        await Promise.all(promises);
    }

    async loadAllVideos() {
        this.showLoading(true);
        this.allVideos = [];

        const promises = this.channels
            .filter(channel => channel.channelId)
            .map(channel => this.loadChannelVideos(channel));

        try {
            const results = await Promise.all(promises);
            this.allVideos = results.flat();
            this.applyFilters();
        } catch (error) {
            console.error('Erro ao carregar vídeos:', error);
            this.showError(true);
        } finally {
            this.showLoading(false);
        }
    }

    async loadChannelVideos(channel) {
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel.channelId}&order=date&type=video&maxResults=3&key=${this.apiKey}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            return data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium.url,
                channelName: channel.name,
                publishedAt: new Date(item.snippet.publishedAt),
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                description: item.snippet.description
            }));
        } catch (error) {
            console.error(`Erro ao carregar vídeos do canal ${channel.name}:`, error);
            return [];
        }
    }

    handleSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.allVideos];

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(video => 
                video.title.toLowerCase().includes(this.searchQuery) ||
                video.channelName.toLowerCase().includes(this.searchQuery) ||
                video.description.toLowerCase().includes(this.searchQuery)
            );
        }

        // Apply channel filter
        if (this.currentFilter) {
            filtered = filtered.filter(video => video.channelName === this.currentFilter);
        }

        // Apply sorting
        switch (this.currentSort) {
            case 'newest':
                filtered.sort((a, b) => b.publishedAt - a.publishedAt);
                break;
            case 'oldest':
                filtered.sort((a, b) => a.publishedAt - b.publishedAt);
                break;
            case 'channel':
                filtered.sort((a, b) => a.channelName.localeCompare(b.channelName));
                break;
        }

        this.filteredVideos = filtered;
        this.currentPage = 1;
        this.renderVideos();
    }

    renderVideos() {
        const container = document.getElementById('videosContainer');
        const startIndex = 0;
        const endIndex = this.currentPage * this.videosPerPage;
        const videosToShow = this.filteredVideos.slice(startIndex, endIndex);

        if (videosToShow.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>Nenhum vídeo encontrado</h3>
                    <p>Tente ajustar os filtros ou termos de busca.</p>
                </div>
            `;
            document.getElementById('loadMoreBtn').style.display = 'none';
            return;
        }

        container.innerHTML = videosToShow.map(video => this.createVideoCard(video)).join('');

        // Show/hide load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        loadMoreBtn.style.display = endIndex < this.filteredVideos.length ? 'block' : 'none';
    }

    createVideoCard(video) {
        const timeAgo = this.getTimeAgo(video.publishedAt);
        
        return `
            <div class="video-card" onclick="window.open('${video.url}', '_blank')">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <div class="video-channel">${video.channelName}</div>
                    <div class="video-meta">
                        <span>${timeAgo}</span>
                        <i class="fas fa-external-link-alt"></i>
                    </div>
                </div>
            </div>
        `;
    }

    loadMoreVideos() {
        this.currentPage++;
        this.renderVideos();
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Agora mesmo';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
        if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} meses atrás`;
        return `${Math.floor(diffInSeconds / 31536000)} anos atrás`;
    }

    showLoading(show) {
        document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
        document.getElementById('videosContainer').style.display = show ? 'none' : 'grid';
    }

    showError(show) {
        document.getElementById('errorMessage').style.display = show ? 'block' : 'none';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GeopoliticalNewsAggregator();
});