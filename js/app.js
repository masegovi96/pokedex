// Configuración de la API y paginación
const API_BASE_URL = 'https://pokeapi.co/api/v2';
const POKEMON_PER_PAGE = 20;

// Estado global de la aplicación
let currentOffset = 0;
let allPokemonList = [];
let filteredPokemonList = []; // Lista filtrada actual
let currentDisplayedCount = 0; // Contador de Pokémon mostrados
let currentFilter = {
    type: '',
    generation: '',
    search: ''
};

// Elementos del DOM
const pokemonGrid = document.getElementById('pokemonGrid');
const loadingSpinner = document.getElementById('loadingSpinner');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const typeFilter = document.getElementById('typeFilter');
const generationFilter = document.getElementById('generationFilter');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const pokemonModal = document.getElementById('pokemonModal');
const modalBody = document.getElementById('modalBody');

// Funciones de utilidad
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const formatPokemonNumber = (num) => `#${String(num).padStart(3, '0')}`;

const toggleLoading = (show) => {
    loadingSpinner.classList.toggle('hidden', !show);
};

// Rangos de ID por generación de Pokémon
const getGenerationRange = (gen) => {
    const ranges = {
        '1': { start: 1, end: 151 },
        '2': { start: 152, end: 251 },
        '3': { start: 252, end: 386 },
        '4': { start: 387, end: 493 },
        '5': { start: 494, end: 649 },
        '6': { start: 650, end: 721 },
        '7': { start: 722, end: 809 },
        '8': { start: 810, end: 905 },
        '9': { start: 906, end: 1025 }
    };
    return ranges[gen] || null;
};

// Traducción de nombres de estadísticas al español
const translateStat = (stat) => {
    const translations = {
        'hp': 'PS',
        'attack': 'Ataque',
        'defense': 'Defensa',
        'special-attack': 'At. Especial',
        'special-defense': 'Def. Especial',
        'speed': 'Velocidad'
    };
    return translations[stat] || stat;
};

// Determinar color de la barra según el valor de la estadística
const getStatColor = (value) => {
    if (value >= 100) return '#27ae60';
    if (value >= 70) return '#f39c12';
    if (value >= 40) return '#e67e22';
    return '#e74c3c';
};

// Petición asíncrona: Obtener lista de Pokémon (con paginación)
const fetchPokemonList = async (limit = POKEMON_PER_PAGE, offset = 0) => {
    try {
        const response = await fetch(`${API_BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
        if (!response.ok) throw new Error('Error al cargar la lista de Pokémon');
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Error:', error);
        showError('No se pudo cargar la lista de Pokémon. Intenta de nuevo.');
        return [];
    }
};

// Petición asíncrona: Obtener detalles completos de un Pokémon
const fetchPokemonDetails = async (nameOrId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/pokemon/${nameOrId}`);
        if (!response.ok) throw new Error('Pokémon no encontrado');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
};

// Petición asíncrona: Obtener todos los Pokémon de un tipo específico
const fetchPokemonByType = async (type) => {
    try {
        const response = await fetch(`${API_BASE_URL}/type/${type}`);
        if (!response.ok) throw new Error('Error al cargar Pokémon por tipo');
        const data = await response.json();
        return data.pokemon.map(p => ({ name: p.pokemon.name, url: p.pokemon.url }));
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
};

// Petición asíncrona: Obtener información de especies (descripción en español)
const fetchPokemonSpecies = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/pokemon-species/${id}`);
        if (!response.ok) throw new Error('Error al cargar especies');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
};

// Crear tarjeta HTML de un Pokémon
const createPokemonCard = (pokemon) => {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.style.animationDelay = `${Math.random() * 0.3}s`;
    
    const imageUrl = pokemon.sprites.other['official-artwork'].front_default || 
                     pokemon.sprites.front_default;
    
    card.innerHTML = `
        <div class="pokemon-number">${formatPokemonNumber(pokemon.id)}</div>
        <div class="pokemon-image-container">
            <img src="${imageUrl}" alt="${pokemon.name}" class="pokemon-image">
        </div>
        <h3 class="pokemon-name">${capitalize(pokemon.name)}</h3>
        <div class="pokemon-types">
            ${pokemon.types.map(type => 
                `<span class="type-badge type-${type.type.name}">${capitalize(type.type.name)}</span>`
            ).join('')}
        </div>
    `;
    
    card.addEventListener('click', () => showPokemonModal(pokemon));
    
    return card;
};

// Renderizar lista de Pokémon (usa Promise.all para peticiones paralelas)
const renderPokemon = async (pokemonList, append = false) => {
    if (!append) {
        pokemonGrid.innerHTML = '';
    }
    
    toggleLoading(true);
    
    // Promise.all ejecuta múltiples peticiones en paralelo para mejor rendimiento
    const pokemonPromises = pokemonList.map(pokemon => 
        fetchPokemonDetails(pokemon.name).catch(err => {
            console.error(`Error cargando ${pokemon.name}:`, err);
            return null;
        })
    );
    
    const pokemonData = await Promise.all(pokemonPromises);
    
    // Usar DocumentFragment para optimizar el rendimiento del DOM
    const fragment = document.createDocumentFragment();
    pokemonData.forEach(pokemon => {
        if (pokemon) {
            const card = createPokemonCard(pokemon);
            fragment.appendChild(card);
        }
    });
    pokemonGrid.appendChild(fragment);
    
    toggleLoading(false);
};

// Mostrar modal con detalles completos del Pokémon
const showPokemonModal = async (pokemon) => {
    const species = await fetchPokemonSpecies(pokemon.id);
    // Optional Chaining (?.) evita errores si no hay descripción
    const description = species?.flavor_text_entries.find(entry => 
        entry.language.name === 'es'
    )?.flavor_text.replace(/\f/g, ' ') || 'No hay descripción disponible.';
    
    const imageUrl = pokemon.sprites.other['official-artwork'].front_default || 
                     pokemon.sprites.front_default;
    
    // Sprites animados del Pokémon (GIF)
    const spriteAnimated = pokemon.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default || 
                          pokemon.sprites.front_default;
    
    // Sonido del Pokémon (cry)
    const pokemonCry = pokemon.cries?.latest || pokemon.cries?.legacy || null;
    
    modalBody.innerHTML = `
        <div class="modal-header">
            <div class="modal-pokemon-number">${formatPokemonNumber(pokemon.id)}</div>
            <h2 class="modal-pokemon-name">${capitalize(pokemon.name)}</h2>
            
            <div class="pokemon-display">
                <img src="${imageUrl}" alt="${pokemon.name}" class="modal-pokemon-image" id="pokemonMainImage">
                ${spriteAnimated ? `
                    <div class="sprite-container">
                        <img src="${spriteAnimated}" alt="${pokemon.name} sprite" class="pokemon-sprite-animated">
                    </div>
                ` : ''}
            </div>
            
            ${pokemonCry ? `
                <button class="play-cry-btn" onclick="document.getElementById('pokemonCry').play()">
                    🔊 Escuchar grito
                </button>
                <audio id="pokemonCry" src="${pokemonCry}"></audio>
            ` : ''}
            
            <div class="modal-pokemon-types">
                ${pokemon.types.map(type => 
                    `<span class="type-badge type-${type.type.name}">${capitalize(type.type.name)}</span>`
                ).join('')}
            </div>
        </div>
        
        <div class="modal-details">
            <div class="detail-section">
                <h3>Descripción</h3>
                <p style="color: var(--text-secondary); line-height: 1.8;">${description}</p>
            </div>
            
            <div class="detail-section">
                <h3>Información Básica</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Altura</div>
                        <div class="info-value">${(pokemon.height / 10).toFixed(1)} m</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Peso</div>
                        <div class="info-value">${(pokemon.weight / 10).toFixed(1)} kg</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Experiencia Base</div>
                        <div class="info-value">${pokemon.base_experience || 'N/A'}</div>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Habilidades</h3>
                <div class="abilities-list">
                    ${pokemon.abilities.map(ability => 
                        `<span class="ability-badge">${capitalize(ability.ability.name.replace('-', ' '))}</span>`
                    ).join('')}
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Estadísticas</h3>
                <div class="stats-grid">
                    ${pokemon.stats.map(stat => {
                        const percentage = (stat.base_stat / 255) * 100;
                        const color = getStatColor(stat.base_stat);
                        return `
                            <div class="stat-row">
                                <div class="stat-name">${translateStat(stat.stat.name)}</div>
                                <div class="stat-bar">
                                    <div class="stat-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                                </div>
                                <div class="stat-value">${stat.base_stat}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    
    pokemonModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

const closeModal = () => {
    pokemonModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
};

// Sistema de filtros combinados (generación + tipo + búsqueda)
const applyFilters = async () => {
    toggleLoading(true);
    
    // Spread operator crea una copia del array original
    let filteredList = [...allPokemonList];
    
    if (currentFilter.generation) {
        const range = getGenerationRange(currentFilter.generation);
        if (range) {
            filteredList = filteredList.filter((pokemon) => {
                // Extraer ID del Pokémon desde la URL de la API
                const urlParts = pokemon.url.split('/');
                const pokemonId = parseInt(urlParts[urlParts.length - 2]);
                return pokemonId >= range.start && pokemonId <= range.end;
            });
        }
    }
    
    if (currentFilter.type) {
        const typePokemon = await fetchPokemonByType(currentFilter.type);
        const typeNames = typePokemon.map(tp => tp.name);
        filteredList = filteredList.filter(p => typeNames.includes(p.name));
    }
    
    if (currentFilter.search) {
        const searchTerm = currentFilter.search.toLowerCase();
        filteredList = filteredList.filter(p => {
            if (p.name.includes(searchTerm)) return true;
            
            if (parseInt(searchTerm)) {
                const urlParts = p.url.split('/');
                const pokemonId = parseInt(urlParts[urlParts.length - 2]);
                return pokemonId === parseInt(searchTerm);
            }
            return false;
        });
    }
    
    // Guardar lista filtrada y resetear contador
    filteredPokemonList = filteredList;
    currentDisplayedCount = POKEMON_PER_PAGE;
    
    await renderPokemon(filteredList.slice(0, POKEMON_PER_PAGE));
    toggleLoading(false);
    
    // Mostrar u ocultar botón "Cargar más" según si hay más Pokémon para mostrar
    if (filteredList.length > POKEMON_PER_PAGE) {
        loadMoreBtn.style.display = 'block';
        loadMoreBtn.textContent = `Cargar más Pokémon (${filteredList.length - POKEMON_PER_PAGE} restantes)`;
    } else {
        loadMoreBtn.style.display = 'none';
    }
};

const searchPokemon = () => {
    currentFilter.search = searchInput.value.trim().toLowerCase();
    applyFilters();
};

const showError = (message) => {
    pokemonGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
            <h2 style="color: var(--text-secondary); font-size: 1.5rem;">⚠️ ${message}</h2>
        </div>
    `;
};

const loadMorePokemon = async () => {
    // Si hay filtros activos, cargar desde la lista filtrada
    if (currentFilter.type || currentFilter.generation || currentFilter.search) {
        const nextBatch = filteredPokemonList.slice(currentDisplayedCount, currentDisplayedCount + POKEMON_PER_PAGE);
        await renderPokemon(nextBatch, true);
        currentDisplayedCount += nextBatch.length;
        
        // Actualizar o ocultar botón según lo que quede
        const remaining = filteredPokemonList.length - currentDisplayedCount;
        if (remaining > 0) {
            loadMoreBtn.textContent = `Cargar más Pokémon (${remaining} restantes)`;
        } else {
            loadMoreBtn.style.display = 'none';
        }
    } else {
        // Sin filtros, cargar desde allPokemonList
        currentOffset += POKEMON_PER_PAGE;
        const newPokemon = allPokemonList.slice(currentOffset, currentOffset + POKEMON_PER_PAGE);
        await renderPokemon(newPokemon, true);
        
        // Ocultar botón si ya no hay más
        if (currentOffset + POKEMON_PER_PAGE >= allPokemonList.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.textContent = 'Cargar más Pokémon';
        }
    }
};

// Inicialización: Cargar todos los Pokémon al inicio (1025 total)
const init = async () => {
    toggleLoading(true);
    allPokemonList = await fetchPokemonList(1025, 0);
    filteredPokemonList = [...allPokemonList];
    currentDisplayedCount = POKEMON_PER_PAGE;
    await renderPokemon(allPokemonList.slice(0, POKEMON_PER_PAGE));
    toggleLoading(false);
    
    // Mostrar botón si hay más Pokémon
    if (allPokemonList.length > POKEMON_PER_PAGE) {
        loadMoreBtn.style.display = 'block';
    }
};

// Event Listeners - Interacción del usuario
searchBtn.addEventListener('click', searchPokemon);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchPokemon();
});

searchInput.addEventListener('input', (e) => {
    if (e.target.value === '') {
        currentFilter.search = '';
        applyFilters();
    }
});

typeFilter.addEventListener('change', (e) => {
    currentFilter.type = e.target.value;
    applyFilters();
});

generationFilter.addEventListener('change', async (e) => {
    currentFilter.generation = e.target.value;
    await applyFilters();
});

loadMoreBtn.addEventListener('click', loadMorePokemon);

pokemonModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') || 
        e.target.classList.contains('modal-close')) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pokemonModal.classList.contains('hidden')) {
        closeModal();
    }
});

// Iniciar la aplicación
init();
