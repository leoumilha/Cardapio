//====================================================================\\
//||                                                                   ||
//||   CARDÁPIO SHEETS - V4.0.1  - 09/08/2025 - 21h30                 ||
//||                                                                   ||
//||    Desenvolvido com ❤️ por Dante Testa                            ||
//||    www.dantetesta.com.br | WhatsApp: (19) 99802-9156              ||
//||                                                                   ||
//||    [!] AVISO IMPORTANTE                                           ||
//||    Este código é propriedade intelectual de Dante Testa.          ||
//||    Não utilize de forma pirata. Valorize o trabalho do            ||
//||    desenvolvedor adquirindo uma licença legítima.                 ||
//||                                                                   ||
//||    [$] APOIE O DESENVOLVEDOR                                      ||
//||    Ao comprar o original você apoia um profissional que           ||
//||    também tem família e luta todo dia para pagar as contas.       ||
//||    Não pegue atalhos - um dia a vida manda a conta das            ||
//||    pequenas coisas erradas que fazemos.                           ||
//||                                                                   ||
//||    [$] Se este script te ajudou a ficar rico e quiser me          ||
//||    enviar um presente financeiro: PIX dante.testa@gmail.com       ||
//||                                                                   ||
//||    [*] SUPORTE TÉCNICO [não gratuito]                             ||
//||    Disponível via WhatsApp. Entre em contato para consultar       ||
//||    valores e planos de suporte personalizados.                    ||
//||                                                                   ||
//||    "Código é poesia. Respeite o poeta."                           ||
//||                                                                   ||
//\\====================================================================//

// ====================================================================
// FUNÇÕES DE LOG E DEBUG
// ====================================================================

/**
 * Registra uma mensagem de log no console se o modo de depuração estiver ativado.
 * @param {...any} args - Argumentos a serem registrados.
 */
function debugLog(...args) {
    if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
        console.log('🐞 [DEBUG]', ...args);
    }
}

/**
 * Registra uma mensagem de informação no console.
 * @param {...any} args - Argumentos a serem registrados.
 */
function infoLog(...args) {
    console.log('ℹ️ [INFO]', ...args);
}

/**
 * Registra uma mensagem de aviso no console.
 * @param {...any} args - Argumentos a serem registrados.
 */
function warnLog(...args) {
    console.warn('⚠️ [WARN]', ...args);
}

/**
 * Registra uma mensagem de erro no console.
 * @param {...any} args - Argumentos a serem registrados.
 */
function errorLog(...args) {
    console.error('❌ [ERROR]', ...args);
}

// ====================================================================
// INICIALIZAÇÃO E CARREGAMENTO DE DADOS
// ====================================================================

document.addEventListener('DOMContentLoaded', function() {
    infoLog('🚀 DOM completamente carregado e analisado.');
    
    // Inicializações críticas
    initializeStorageSystem();
    loadCartFromStorage();
    loadCouponFromStorage();
    
    // Carregar dados da planilha
    fetchData();
    
    // Configurar elementos da UI
    setupUI();
});

/**
 * Busca os dados da planilha do Google Sheets.
 */
async function fetchData() {
    debugLog('📥 Buscando todos os dados das planilhas...');
    const urls = {
        items: MENU_CSV_URL,
        categories: CATEGORIES_CSV_URL,
        config: CONFIG_CSV_URL,
        hours: HOURS_CSV_URL,
        neighborhoods: NEIGHBORHOODS_CSV_URL,
        coupons: COUPONS_CSV_URL
    };

    try {
        const responses = await Promise.all(
            Object.entries(urls).map(([key, url]) => {
                if (url) { // Only fetch if the URL is defined
                    return fetch(url).then(res => {
                        if (!res.ok) {
                            throw new Error(`Falha ao carregar ${key}: ${res.statusText}`);
                        }
                        return res.text().then(csv => ({ key, csv }));
                    });
                }
                return Promise.resolve(null); // Return null for undefined URLs
            })
        );

        const allData = responses.filter(Boolean).reduce((acc, { key, csv }) => {
            acc[key] = parseCSV(csv);
            return acc;
        }, {});

        infoLog('✅ Todos os dados das planilhas foram recebidos e processados.');
        debugLog('Dados recebidos:', allData);
        processData(allData.items, allData.categories, allData.config, allData.hours, allData.neighborhoods, allData.coupons);

    } catch (error) {
        errorLog('Falha ao buscar dados de uma das planilhas:', error);
        displayErrorMessage('Não foi possível carregar o cardápio. Verifique as configurações e tente novamente.');
    }
}

/**
 * Exibe uma mensagem de erro na interface do usuário.
 * @param {string} message - A mensagem de erro a ser exibida.
 */
function displayErrorMessage(message) {
    const menuContent = document.getElementById('menu-content');
    if (menuContent) {
        menuContent.innerHTML = `
            <div class="text-center py-10">
                <p class="text-red-500">${message}</p>
            </div>
        `;
    }
}

// ====================================================================
// PROCESSAMENTO DE DADOS
// ====================================================================

/**
 * Converte o texto CSV em um array de objetos.
 * @param {string} csvText - O texto CSV da planilha.
 * @returns {Array<Object>} - Um array de objetos representando os itens.
 */
function parseCSV(csvText) {
    debugLog('🔄 Analisando dados CSV...');
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim().replace(/^"|"$/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/("[^"]*"|[^,]*)/g).map(value => value.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        data.push(obj);
    }
    infoLog(`📊 ${data.length} itens analisados do CSV.`);
    return data;
}

/**
 * Processa os dados da planilha e renderiza o cardápio.
 * @param {Array<Object>} data - Os dados da planilha.
 */
function processData(items, categoriesData, configData, hoursData, neighborhoodsData, couponsData) {
    debugLog('⚙️ Processando todos os dados para renderização...');

    // 1. Create the main categories structure from categoriesData
    const categories = {};
    if (categoriesData) {
        categoriesData.forEach(cat => {
            categories[cat.ID] = {
                name: cat.NOME,
                description: cat.DESCRICAO,
                products: []
            };
        });
    }

    // 2. Assign products (items) to their respective categories
    if (items) {
        items.forEach(product => {
            if (categories[product.CATEGORIA_ID]) {
                categories[product.CATEGORIA_ID].products.push(product);
            }
        });
    }

    // 3. Render the main parts of the menu
    debugLog('Estrutura de categorias antes de renderizar:', categories);
    renderMenu(categories);
    renderCategoriesNav(categories);

    // 4. Setup additional functionalities with their specific data
    if (items) setupSearch(items, categories);
    // 4. Apply dynamic configurations and check business hours
    if (configData) applyConfig(configData);
    if (hoursData) applyBusinessHours(hoursData);

    // TODO: Implement logic for neighborhoods and coupons if needed
}

// ====================================================================
// APLICAÇÃO DE CONFIGURAÇÕES E LÓGICA DE NEGÓCIO
// ====================================================================

/**
 * Aplica as configurações visuais e de texto da planilha 'Config'.
 * @param {Array<Object>} configData - Os dados da planilha de configuração.
 */
function applyConfig(configData) {
    if (!configData || configData.length === 0) return;
    const config = configData[0]; // All settings are in the first row

    debugLog('🎨 Aplicando configurações da planilha...');

    // Update Header
    document.getElementById('header-company-name').textContent = config.NOME_EMPRESA || 'Cardápio Digital';
    document.getElementById('header-slogan').textContent = config.SLOGAN || '';
    const logo = document.getElementById('header-logo');
    if (config.LOGO_URL) {
        logo.src = config.LOGO_URL;
        logo.style.display = 'block';
    }

    // Update Colors
    const root = document.documentElement;
    if (config.COR_PRIMARIA) root.style.setProperty('--cor-primaria', config.COR_PRIMARIA);
    if (config.COR_FUNDO) root.style.setProperty('--cor-fundo', config.COR_FUNDO);
    // Add other color variables as needed

    infoLog('✅ Configurações da UI aplicadas.');
}

/**
 * Verifica o horário de funcionamento e atualiza o indicador de status.
 * @param {Array<Object>} hoursData - Os dados da planilha de horários.
 */
function applyBusinessHours(hoursData) {
    if (!hoursData) return;
    debugLog('🕒 Verificando horário de funcionamento...');

    try {
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
        const dayOfWeek = now.getDay(); // 0=Domingo, 1=Segunda, ...
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const todayHours = hoursData.find(h => h.DIA_SEMANA_NUM == dayOfWeek);

        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        const hoursText = document.getElementById('hours-text');

        if (todayHours && todayHours.STATUS.toLowerCase() === 'aberto') {
            const openTime = parseTime(todayHours.ABERTURA);
            const closeTime = parseTime(todayHours.FECHAMENTO);

            if (currentTime >= openTime && currentTime < closeTime) {
                statusDot.style.backgroundColor = 'var(--cor-sucesso, #22c55e)';
                statusText.textContent = 'Aberto';
                hoursText.textContent = `até ${todayHours.FECHAMENTO}`;
            } else {
                statusDot.style.backgroundColor = 'var(--cor-erro, #ef4444)';
                statusText.textContent = 'Fechado';
                hoursText.textContent = `abre às ${todayHours.ABERTURA}`;
            }
        } else {
            statusDot.style.backgroundColor = 'var(--cor-erro, #ef4444)';
            statusText.textContent = 'Fechado Hoje';
            hoursText.textContent = '';
        }
        infoLog('✅ Status de funcionamento atualizado.');
    } catch (error) {
        errorLog('Falha ao verificar horário de funcionamento:', error);
    }
}

/**
 * Converte uma string de tempo (HH:mm) para minutos desde a meia-noite.
 * @param {string} timeString - A string de tempo.
 * @returns {number} - O total de minutos.
 */
function parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;

}

// ====================================================================
// RENDERIZAÇÃO DA UI
// ====================================================================

/**
 * Renderiza a navegação de categorias.
 * @param {Object} categories - As categorias do cardápio.
 */
function renderCategoriesNav(categories) {
    debugLog('🎨 Renderizando navegação de categorias...');
    const navContainer = document.getElementById('category-buttons');
    if (!navContainer) return;

    navContainer.innerHTML = ''; // Limpar navegação existente

    for (const id in categories) {
        const category = categories[id];
        const button = document.createElement('button');
        button.className = 'category-button';
        button.textContent = category.name;
        button.onclick = () => scrollToCategory(id);
        navContainer.appendChild(button);
    }
    infoLog(`🧭 ${Object.keys(categories).length} categorias adicionadas à navegação.`);
    setupCategoryNavScroll();
}

/**
 * Renderiza o cardápio completo.
 * @param {Object} categories - As categorias com seus produtos.
 */
function renderMenu(categories) {
    debugLog('🍴 Renderizando o cardápio...');
    const menuContent = document.getElementById('menu-content');
    if (!menuContent) return;

    menuContent.innerHTML = ''; // Limpar conteúdo existente

    for (const id in categories) {
        const category = categories[id];
        const section = document.createElement('div');
        section.id = `category-${id}`;
        section.className = 'menu-section';

        section.innerHTML = `
            <h2 class="category-title">${category.name}</h2>
            <p class="category-description">${category.description}</p>
            <div class="products-grid">
                ${category.products.map(product => renderProduct(product)).join('')}
            </div>
        `;
        menuContent.appendChild(section);
    }
    infoLog('✅ Cardápio renderizado com sucesso.');
}

/**
 * Gera o HTML para um único produto.
 * @param {Object} product - O objeto do produto.
 * @returns {string} - O HTML do card do produto.
 */
function renderProduct(product) {
    const price = parseFloat(product.PRECO.replace(',', '.'));
    const isUnavailable = product.DISPONIVEL.toLowerCase() === 'nao';
    const hasImage = product.IMAGEM && product.IMAGEM.trim() !== '';

    return `
        <div class="product-card ${isUnavailable ? 'unavailable' : ''}" onclick="openModal(this)" 
             data-id="${product.ID}" 
             data-name="${product.NOME}" 
             data-description="${product.DESCRICAO}" 
             data-price="${price}" 
             data-image="${product.IMAGEM}" 
             data-options='${JSON.stringify(parseOptions(product))}'
             data-unavailable="${isUnavailable}">
            
            <div class="product-info">
                <h3 class="product-name">${product.NOME}</h3>
                <p class="product-description">${product.DESCRICAO}</p>
                <div class="product-price">R$ ${price.toFixed(2).replace('.', ',')}</div>
            </div>
            ${hasImage ? `<img src="${product.IMAGEM}" alt="${product.NOME}" class="product-image">` : ''}
        </div>
    `;
}

/**
 * Analisa as opções do produto a partir das colunas OPCIONAL.
 * @param {Object} product - O objeto do produto.
 * @returns {Array<Object>} - Um array de grupos de opções.
 */
function parseOptions(product) {
    const options = {};
    for (const key in product) {
        if (key.startsWith('OPCIONAL_')) {
            const parts = key.split('_');
            const group = parts[1];
            const type = parts[2];
            if (!options[group]) {
                options[group] = { name: '', type: 'unico', items: [] };
            }
            if (type === 'NOME') options[group].name = product[key];
            if (type === 'TIPO') options[group].type = product[key].toLowerCase();
            if (type.startsWith('ITEM')) {
                const itemName = product[key];
                const priceKey = `OPCIONAL_${group}_PRECO${type.replace('ITEM', '')}`;
                const itemPrice = parseFloat(product[priceKey]?.replace(',', '.') || 0);
                if (itemName) {
                    options[group].items.push({ name: itemName, price: itemPrice });
                }
            }
        }
    }
    return Object.values(options).filter(group => group.name && group.items.length > 0);
}


// ====================================================================
// FUNCIONALIDADE DO MODAL DE PRODUTO
// ====================================================================

/**
 * Abre o modal de um produto.
 * @param {HTMLElement} element - O elemento do card do produto que foi clicado.
 */
function openModal(element) {
    const isUnavailable = element.dataset.unavailable === 'true';
    if (isUnavailable) {
        infoLog(`🚫 Tentativa de abrir modal para item indisponível: ${element.dataset.name}`);
        // Opcional: Adicionar um feedback visual de que o item não está disponível
        // Ex: element.classList.add('shake-animation');
        // setTimeout(() => element.classList.remove('shake-animation'), 500);
        return;
    }

    debugLog(`📦 Abrindo modal para: ${element.dataset.name}`);
    const modal = document.getElementById('product-modal');
    const modalContent = document.getElementById('modal-content');
    if (!modal || !modalContent) return;

    const options = JSON.parse(element.dataset.options);
    const price = parseFloat(element.dataset.price);

    modalContent.innerHTML = `
        ${element.dataset.image ? `<img src="${element.dataset.image}" alt="${element.dataset.name}" class="modal-image">` : ''}
        <div class="modal-body">
            <h2 class="modal-title">${element.dataset.name}</h2>
            <p class="modal-description">${element.dataset.description}</p>
            <div id="options-container">
                ${options.map(renderOptionGroup).join('')}
            </div>
            <div class="modal-footer">
                <div class="quantity-selector">
                    <button onclick="changeQuantity(-1)">－</button>
                    <input type="number" id="quantity" value="1" min="1">
                    <button onclick="changeQuantity(1)">＋</button>
                </div>
                <button class="add-to-cart-button" onclick="addToCart('${element.dataset.id}')">
                    Adicionar <span id="total-price">R$ ${price.toFixed(2).replace('.', ',')}</span>
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    updateTotalPrice(); // Calcular preço inicial
}

/**
 * Fecha o modal de produto.
 */
function closeModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Renderiza um grupo de opções no modal.
 * @param {Object} group - O grupo de opções.
 * @returns {string} - O HTML do grupo de opções.
 */
function renderOptionGroup(group) {
    const inputType = group.type === 'multiplo' ? 'checkbox' : 'radio';
    return `
        <div class="option-group">
            <h3 class="option-group-title">${group.name}</h3>
            ${group.items.map(item => `
                <label class="option-item">
                    <input type="${inputType}" name="${group.name}" value="${item.name}" data-price="${item.price}" onchange="updateTotalPrice()">
                    <span>${item.name}</span>
                    <span class="option-price">+ R$ ${item.price.toFixed(2).replace('.', ',')}</span>
                </label>
            `).join('')}
        </div>
    `;
}

/**
 * Altera a quantidade do item no modal.
 * @param {number} amount - A quantidade a ser adicionada ou subtraída.
 */
function changeQuantity(amount) {
    const quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        let currentValue = parseInt(quantityInput.value);
        currentValue += amount;
        if (currentValue < 1) currentValue = 1;
        quantityInput.value = currentValue;
        updateTotalPrice();
    }
}

/**
 * Atualiza o preço total no modal com base nas opções selecionadas.
 */
function updateTotalPrice() {
    const modal = document.getElementById('product-modal');
    if (!modal || modal.style.display === 'none') return;

    const basePrice = parseFloat(document.querySelector('.add-to-cart-button').textContent.match(/\d+,\d+/)[0].replace(',', '.'));
    let optionsPrice = 0;

    document.querySelectorAll('#options-container input:checked').forEach(input => {
        optionsPrice += parseFloat(input.dataset.price);
    });

    const quantity = parseInt(document.getElementById('quantity').value);
    const totalPrice = (basePrice + optionsPrice) * quantity;

    document.getElementById('total-price').textContent = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
}

// ====================================================================
// FUNCIONALIDADE DO CARRINHO
// ====================================================================

let cart = [];

/**
 * Adiciona um item ao carrinho.
 * @param {string} productId - O ID do produto a ser adicionado.
 */
function addToCart(productId) {
    const productCard = document.querySelector(`.product-card[data-id='${productId}']`);
    const quantity = parseInt(document.getElementById('quantity').value);
    const selectedOptions = [];
    let optionsPrice = 0;

    document.querySelectorAll('#options-container input:checked').forEach(input => {
        selectedOptions.push({ name: input.value, price: parseFloat(input.dataset.price) });
        optionsPrice += parseFloat(input.dataset.price);
    });

    const item = {
        id: productId,
        name: productCard.dataset.name,
        price: parseFloat(productCard.dataset.price),
        quantity: quantity,
        options: selectedOptions,
        totalPrice: (parseFloat(productCard.dataset.price) + optionsPrice) * quantity
    };

    cart.push(item);
    infoLog(`🛒 Item adicionado ao carrinho: ${item.name} (x${item.quantity})`);
    updateCartUI();
    closeModal();
    saveCartToStorage();
}

/**
 * Atualiza a interface do carrinho (FAB e modal).
 */
function updateCartUI() {
    const cartFab = document.getElementById('cart-fab');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    
    if (cart.length > 0) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);

        cartCount.textContent = totalItems;
        cartTotal.textContent = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
        cartFab.classList.remove('hidden');
    } else {
        cartFab.classList.add('hidden');
    }

    renderCartModal();
}

/**
 * Abre o modal do carrinho.
 */
function openCart() {
    debugLog('🛒 Abrindo modal do carrinho.');
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) {
        cartModal.style.display = 'flex';
        renderCartModal();
    }
}

/**
 * Fecha o modal do carrinho.
 */
function closeCart() {
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) {
        cartModal.style.display = 'none';
    }
}

/**
 * Renderiza os itens no modal do carrinho.
 */
function renderCartModal() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartModalTotal = document.getElementById('cart-modal-total');
    const cartModalItemsCount = document.getElementById('cart-modal-items-count');

    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-gray-500">Seu carrinho está vazio.</p>';
        cartModalTotal.textContent = 'R$ 0,00';
        cartModalItemsCount.textContent = '0 itens';
        return;
    }

    cartItemsContainer.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <p class="cart-item-name">${item.quantity}x ${item.name}</p>
                ${item.options.length > 0 ? `<p class="cart-item-options">${item.options.map(opt => opt.name).join(', ')}</p>` : ''}
            </div>
            <div class="cart-item-details">
                <p class="cart-item-price">R$ ${item.totalPrice.toFixed(2).replace('.', ',')}</p>
                <button class="cart-item-remove" onclick="removeFromCart(${index})">🗑️</button>
            </div>
        </div>
    `).join('');

    const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartModalTotal.textContent = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;
    cartModalItemsCount.textContent = `${totalItems} ${totalItems > 1 ? 'itens' : 'item'}`;
}

/**
 * Remove um item do carrinho.
 * @param {number} index - O índice do item a ser removido.
 */
function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        const removedItem = cart.splice(index, 1)[0];
        infoLog(`🗑️ Item removido do carrinho: ${removedItem.name}`);
        updateCartUI();
        saveCartToStorage();
    }
}

/**
 * Limpa todos os itens do carrinho.
 */
function clearCart() {
    cart = [];
    infoLog('🗑️ Carrinho limpo.');
    updateCartUI();
    saveCartToStorage();
}

// ====================================================================
// LOCAL STORAGE
// ====================================================================

/**
 * Inicializa o sistema de armazenamento local.
 */
function initializeStorageSystem() {
    try {
        localStorage.setItem('storage_test', 'test');
        localStorage.removeItem('storage_test');
        infoLog('✅ Sistema de localStorage funcional.');
    } catch (e) {
        errorLog('❌ Sistema de localStorage não está disponível.', e);
        // Adicionar um aviso na UI para o usuário
    }
}

/**
 * Salva o carrinho no localStorage.
 */
function saveCartToStorage() {
    try {
        localStorage.setItem('userCart', JSON.stringify(cart));
        debugLog('💾 Carrinho salvo no localStorage.');
    } catch (e) {
        errorLog('Falha ao salvar carrinho no localStorage.', e);
    }
}

/**
 * Carrega o carrinho do localStorage.
 */
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('userCart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            infoLog(`🛒 Carrinho carregado do localStorage com ${cart.length} itens.`);
            updateCartUI();
        }
    } catch (e) {
        errorLog('Falha ao carregar carrinho do localStorage.', e);
        cart = []; // Reseta o carrinho em caso de erro
    }
}

// ====================================================================
// CHECKOUT
// ====================================================================

/**
 * Inicia o processo de checkout.
 */
function proceedToCheckout() {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }
    closeCart();
    openCheckout();
}

/**
 * Abre o modal de checkout.
 */
function openCheckout() {
    debugLog('💳 Abrindo modal de checkout.');
    const checkoutModal = document.getElementById('checkout-modal');
    if (checkoutModal) {
        checkoutModal.style.display = 'flex';
        showCheckoutStep(2); // Começa no passo 2 (Tipo de Recebimento)
        updateOrderSummary();
    }
}

/**
 * Fecha o modal de checkout.
 */
function closeCheckout() {
    const checkoutModal = document.getElementById('checkout-modal');
    if (checkoutModal) {
        checkoutModal.style.display = 'none';
    }
}

/**
 * Mostra um passo específico do checkout.
 * @param {number} stepNumber - O número do passo a ser exibido.
 */
function showCheckoutStep(stepNumber) {
    document.querySelectorAll('.checkout-step').forEach(step => {
        step.classList.add('hidden');
    });
    const currentStep = document.getElementById(`checkout-step-${stepNumber}`);
    if (currentStep) {
        currentStep.classList.remove('hidden');
    }
}

/**
 * Avança para o próximo passo do checkout.
 * @param {number} nextStepNumber - O número do próximo passo.
 */
function nextStep(nextStepNumber) {
    // Adicionar validação aqui se necessário
    showCheckoutStep(nextStepNumber);
}

/**
 * Volta para o carrinho a partir do checkout.
 */
function backToCart() {
    closeCheckout();
    openCart();
}

/**
 * Atualiza o resumo do pedido no modal de checkout.
 */
function updateOrderSummary() {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    // Lógica de frete e desconto a ser implementada
    const deliveryFee = 0; 
    const discount = 0;
    const total = subtotal + deliveryFee - discount;

    document.getElementById('order-subtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('checkout-order-total').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

/**
 * Lida com a mudança do tipo de entrega.
 */
function handleDeliveryTypeChange() {
    const selectedType = document.querySelector('input[name="delivery-type"]:checked').value;
    const deliveryFields = document.getElementById('delivery-fields');
    deliveryFields.innerHTML = ''; // Limpa campos anteriores

    if (selectedType === 'delivery') {
        deliveryFields.innerHTML = `
            <div class="mb-3">
                <label for="address" class="block text-sm font-medium mb-1">Endereço de Entrega</label>
                <input type="text" id="address" name="address" class="w-full p-2 border rounded">
            </div>
        `;
    } else if (selectedType === 'local') {
        deliveryFields.innerHTML = `
            <div class="mb-3">
                <label for="table-number" class="block text-sm font-medium mb-1">Número da Mesa</label>
                <input type="text" id="table-number" name="table-number" class="w-full p-2 border rounded">
            </div>
        `;
    }
}


/**
 * Finaliza o pedido e envia para o WhatsApp.
 */
function finalizeOrder() {
    const customerName = document.getElementById('customer-name').value;
    const deliveryType = document.querySelector('input[name="delivery-type"]:checked')?.value;
    let details = '';

    if (deliveryType === 'delivery') {
        details = `Endereço: ${document.getElementById('address').value}`;
    } else if (deliveryType === 'local') {
        details = `Mesa: ${document.getElementById('table-number').value}`;
    }

    let message = `Olá, gostaria de fazer um pedido!\n\n`;
    message += `*Cliente:* ${customerName}\n`;
    message += `*Tipo:* ${deliveryType}\n`;
    if (details) message += `${details}\n`;
    message += `\n*Itens:*\n`;

    cart.forEach(item => {
        message += `- ${item.quantity}x ${item.name}`;
        if (item.options.length > 0) {
            message += ` (${item.options.map(o => o.name).join(', ')})`;
        }
        message += ` - R$ ${item.totalPrice.toFixed(2).replace('.', ',')}\n`;
    });

    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    message += `\n*Total:* R$ ${total.toFixed(2).replace('.', ',')}`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${PHONE_NUMBER}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    infoLog('🚀 Pedido enviado para o WhatsApp.');
    clearCart();
    closeCheckout();
}


// ====================================================================
// BUSCA
// ====================================================================

/**
 * Configura a funcionalidade de busca.
 * @param {Array<Object>} products - A lista de todos os produtos.
 * @param {Object} categories - As categorias do cardápio.
 */
function setupSearch(products, categories) {
    const searchInput = document.getElementById('search');
    const clearSearchBtn = document.getElementById('clear-search');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        if (query.length > 0) {
            clearSearchBtn.classList.remove('hidden');
            performSearch(query, products, categories);
        } else {
            clearSearchBtn.classList.add('hidden');
            renderMenu(categories); // Mostra o menu completo se a busca estiver vazia
        }
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        renderMenu(categories);
    });
}

/**
 * Realiza a busca e renderiza os resultados.
 * @param {string} query - O termo de busca.
 * @param {Array<Object>} products - A lista de todos os produtos.
 * @param {Object} categories - As categorias do cardápio.
 */
function performSearch(query, products, categories) {
    const filteredProducts = products.filter(p => 
        p.NOME.toLowerCase().includes(query) || 
        p.DESCRICAO.toLowerCase().includes(query)
    );

    const menuContent = document.getElementById('menu-content');
    menuContent.innerHTML = '';

    if (filteredProducts.length > 0) {
        const resultsGrid = document.createElement('div');
        resultsGrid.className = 'products-grid';
        resultsGrid.innerHTML = filteredProducts.map(p => renderProduct(p)).join('');
        menuContent.appendChild(resultsGrid);
    } else {
        menuContent.innerHTML = `<p class="text-center py-10">Nenhum produto encontrado para "${query}".</p>`;
    }
}

// ====================================================================
// NAVEGAÇÃO E SCROLL
// ====================================================================

/**
 * Rola a página até a categoria selecionada.
 * @param {string} categoryId - O ID da categoria.
 */
function scrollToCategory(categoryId) {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
        const offset = 150; // Ajuste para o header fixo e a navegação
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

/**
 * Configura o scroll horizontal da navegação de categorias.
 */
function setupCategoryNavScroll() {
    const nav = document.querySelector('.category-nav-scroll');
    const leftArrow = document.getElementById('scroll-left');
    const rightArrow = document.getElementById('scroll-right');

    if (!nav || !leftArrow || !rightArrow) return;

    const checkArrows = () => {
        leftArrow.style.display = nav.scrollLeft > 0 ? 'flex' : 'none';
        rightArrow.style.display = nav.scrollWidth > nav.clientWidth + nav.scrollLeft ? 'flex' : 'none';
    };

    leftArrow.addEventListener('click', () => {
        nav.scrollBy({ left: -200, behavior: 'smooth' });
    });

    rightArrow.addEventListener('click', () => {
        nav.scrollBy({ left: 200, behavior: 'smooth' });
    });

    nav.addEventListener('scroll', checkArrows);
    window.addEventListener('resize', checkArrows);
    checkArrows(); // Checagem inicial
}

// ====================================================================
// CONFIGURAÇÕES DA UI E HORÁRIO DE FUNCIONAMENTO
// ====================================================================

/**
 * Atualiza a UI com base nas configurações do arquivo config.js.
 */
function updateUIFromConfig() {
    // Cores
    document.documentElement.style.setProperty('--cor-primaria', COR_PRIMARIA);
    document.documentElement.style.setProperty('--cor-secundaria', COR_SECUNDARIA);
    // ...outras cores

    // Textos e Links
    document.getElementById('header-logo').src = LOGO_URL;
    document.getElementById('header-slogan').textContent = SLOGAN;
    // ...outros elementos

    // Google Reviews
    if (GOOGLE_REVIEWS_LINK) {
        document.getElementById('google-reviews-section').style.display = 'block';
        document.getElementById('google-reviews-link').href = GOOGLE_REVIEWS_LINK;
    }
    
    infoLog('🎨 UI atualizada com as configurações do config.js.');
}

/**
 * Verifica o horário de funcionamento e atualiza o indicador.
 */
function checkBusinessHours() {
    // Lógica para verificar se o estabelecimento está aberto
    // com base na variável HORARIOS do config.js
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, ...
    const currentTime = now.getHours() * 100 + now.getMinutes();

    const todayHours = HORARIOS.find(h => h.dia.includes(dayOfWeek));

    const indicator = document.getElementById('hours-indicator');
    const dot = indicator.querySelector('div:first-child');
    const text = document.getElementById('hours-text');

    if (todayHours && todayHours.aberto) {
        const openTime = parseInt(todayHours.inicio.replace(':', ''));
        const closeTime = parseInt(todayHours.fim.replace(':', ''));
        if (currentTime >= openTime && currentTime <= closeTime) {
            dot.style.backgroundColor = '#10B981'; // Verde
            text.textContent = `Aberto até ${todayHours.fim}`;
        } else {
            dot.style.backgroundColor = '#EF4444'; // Vermelho
            text.textContent = 'Fechado agora';
        }
    } else {
        dot.style.backgroundColor = '#EF4444'; // Vermelho
        text.textContent = 'Fechado hoje';
    }
}

// ====================================================================
// MODAIS ADICIONAIS (Horários, QR Code, etc.)
// ====================================================================

/**
 * Abre o modal de horários de funcionamento.
 */
function openHoursModal() {
    // Implementação do modal de horários
    alert('Modal de horários a ser implementado.');
}

/**
 * Abre o modal com o QR Code do cardápio.
 */
function openQRCodeModal() {
    // Implementação do modal de QR Code
    alert('Modal de QR Code a ser implementado.');
}

// ====================================================================
// TRADUÇÃO (GTranslate)
// ====================================================================

if (typeof TRADUCAO !== 'undefined' && TRADUCAO === true) {
    infoLog('🌐 Habilitando sistema de tradução...');
    const gtranslateScript = document.createElement('script');
    gtranslateScript.src = 'https://cdn.gtranslate.net/widgets/latest/dwf.js';
    gtranslateScript.async = true;
    gtranslateScript.onload = () => {
        infoLog('✅ Script GTranslate carregado com sucesso.');
    };
    gtranslateScript.onerror = () => {
        errorLog('❌ Erro ao carregar script GTranslate.');
    };
    document.head.appendChild(gtranslateScript);

    window.gtranslateSettings = {
        default_language: LANGS[0] || 'pt',
        languages: LANGS || ['pt', 'en', 'es'],
        wrapper_selector: '#gtranslate_wrapper',
        // ...outras configurações do GTranslate
    };
} else {
    infoLog('🚫 Sistema de tradução desabilitado.');
}

// ====================================================================
// COMPARTILHAMENTO
// ====================================================================

/**
 * Aciona a funcionalidade de compartilhamento nativa do navegador.
 */
function shareGeneral() {
    if (navigator.share) {
        navigator.share({
            title: document.title,
            text: `Confira o cardápio: ${NOME_EMPRESA}`,
            url: window.location.href
        }).then(() => {
            infoLog('🔗 Conteúdo compartilhado com sucesso!');
        }).catch(error => {
            errorLog('Falha no compartilhamento:', error);
        });
    } else {
        // Fallback para desktops ou navegadores sem suporte
        alert('Use o botão de compartilhamento do seu navegador ou copie a URL.');
    }
}

// ====================================================================
// INICIALIZAÇÃO GERAL DA UI
// ====================================================================

/**
 * Configura os elementos iniciais da UI.
 */
function setupUI() {
    // Adiciona listeners de eventos globais, etc.
    window.addEventListener('scroll', () => {
        // Lógica de scroll, como destacar categoria ativa na navegação
    });
    
    // Fechar modais com a tecla 'Escape'
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal();
            closeCart();
            closeCheckout();
        }
    });
}
