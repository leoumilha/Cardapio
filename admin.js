document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
});

async function loadOrders() {
    const main = document.querySelector('main');
    const loadingMessage = document.createElement('p');
    loadingMessage.textContent = 'Carregando pedidos...';
    main.appendChild(loadingMessage);

    try {
        Papa.parse(REQUESTS_CSV_URL, {
            download: true,
            header: true,
            complete: function(results) {
                main.removeChild(loadingMessage);
                displayOrders(results.data);
            },
            error: function(error) {
                console.error('Falha ao carregar ou analisar pedidos:', error);
                loadingMessage.textContent = 'Erro ao carregar os pedidos. Verifique o console para mais detalhes.';
                loadingMessage.style.color = 'red';
            }
        });
    } catch (error) {
        console.error('Falha ao iniciar o carregamento de pedidos:', error);
        loadingMessage.textContent = 'Erro ao iniciar o carregamento dos pedidos.';
        loadingMessage.style.color = 'red';
    }
}

function displayOrders(orders) {
    const main = document.querySelector('main');
    const existingTable = main.querySelector('table');
    if(existingTable) {
        existingTable.remove();
    }

    if (!orders || orders.length === 0) {
        const noOrdersMessage = document.createElement('p');
        noOrdersMessage.textContent = 'Nenhum pedido encontrado.';
        main.appendChild(noOrdersMessage);
        return;
    }

    const table = document.createElement('table');
    table.className = 'min-w-full bg-white divide-y divide-gray-200 shadow-md rounded-lg';

    const thead = document.createElement('thead');
    thead.className = 'bg-gray-50';
    const headerRow = document.createElement('tr');
    const headers = Object.keys(orders[0]);
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-gray-200';
    orders.forEach(order => {
        const row = document.createElement('tr');
        headers.forEach(header => {
            const cell = document.createElement('td');
            cell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-700';
            cell.textContent = order[header];
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    main.appendChild(table);
}
