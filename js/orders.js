// Define variables at the top level
let currentPage = 1;
const ordersPerPage = 10;
let allOrders = [];
let filteredOrders = [];

//add on te
function closeModal() {
    document.getElementById('order-modal').style.display = 'none';
}
//end add on

document.addEventListener('DOMContentLoaded', function() {
    fetchOrders();

    // Check for orderId in URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    if (orderId) {
        viewOrderDetails(orderId);
    }
    
    document.getElementById('status-filter').addEventListener('change', filterOrders);
    document.getElementById('search-btn').addEventListener('click', searchOrders);
    document.getElementById('prev-page').addEventListener('click', goToPrevPage);
    document.getElementById('next-page').addEventListener('click', goToNextPage);
    document.getElementById('search-orders').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchOrders();
    });
    
    



    // Close modal button
    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Also add event listener for Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});

// Rest of your functions remain the same...

function fetchOrders() {
    fetch('http://127.0.0.1:5001/getOrders')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                allOrders = data.orders;
                filteredOrders = [...allOrders];
                displayOrders();
                updatePagination();
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error fetching orders:', error);
            alert('Error loading orders: ' + error.message);
        });
}

function filterOrders() {
    const statusFilter = document.getElementById('status-filter').value;
    
    if (statusFilter === 'all') {
        filteredOrders = [...allOrders];
    } else {
        filteredOrders = allOrders.filter(order => order.orderStatus === statusFilter);
    }
    
    currentPage = 1;
    displayOrders();
    updatePagination();
}

function searchOrders() {
    const searchTerm = document.getElementById('search-orders').value.toLowerCase();
    
    if (searchTerm.trim() === '') {
        filterOrders();
        return;
    }
    
    filteredOrders = allOrders.filter(order => 
        order.fullName.toLowerCase().includes(searchTerm) ||
        order.email.toLowerCase().includes(searchTerm) ||
        order.phone.toLowerCase().includes(searchTerm) ||
        order.id.toString().includes(searchTerm))
    ;
    
    currentPage = 1;
    displayOrders();
    updatePagination()
    ;
}

function displayOrders() {
    const tableBody = document.querySelector('#orders-table tbody');
    tableBody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = Math.min(startIndex + ordersPerPage, filteredOrders.length);
    const ordersToDisplay = filteredOrders.slice(startIndex, endIndex);
    
    if (ordersToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="8" class="text-center">No orders found</td>`;
        tableBody.appendChild(row);
        return;
    }
    
    ordersToDisplay.forEach(order => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.fullName}</td>
            <td>
                <div>${order.phone}</div>
                <div class="text-small">${order.email}</div>
            </td>
            <td>${order.items.split(',').slice(0, 2).join(', ')}${order.items.split(',').length > 2 ? '...' : ''}</td>
            <td>$${order.grandTotal.toFixed(2)}</td>
            <td>${formatDate(order.date)}</td>
            <td><span class="status ${order.orderStatus}">${order.orderStatus}</span></td>
            <td>
                <button class="btn btn-sm btn-primary view-order" data-id="${order.id}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-sm ${order.orderStatus === 'pending' ? 'btn-danger' : 'btn-secondary'}" 
                    data-id="${order.id}" ${order.orderStatus !== 'pending' ? 'disabled' : ''}>
                    <i class="fas fa-times"></i> Cancel
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-order').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-id');
            viewOrderDetails(orderId);
        });
    });
    
    // Add event listeners to cancel buttons
    document.querySelectorAll('.btn-danger').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-id');
            if (confirm('Are you sure you want to cancel this order?')) {
                updateOrderStatus(orderId, 'cancelled');
            }
        });
    });
}

function updateOrderStatus(orderId, status) {
    fetch('http://127.0.0.1:5001/updateOrderStatus', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            orderId: orderId,
            status: status,
            updateItems: true
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            alert(`Order #${orderId} has been ${status}`);
            fetchOrders();
        } else {
            throw new Error(data.error || 'Failed to update order status');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error updating order: ' + error.message);
    });
}

function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id == orderId);
    if (order) {
        document.getElementById('modal-order-id').textContent = `#${order.id}`;
        
        const customerInfo = `
            <div><strong>Name:</strong> ${order.fullName}</div>
            <div><strong>Email:</strong> ${order.email}</div>
            <div><strong>Phone:</strong> ${order.phone}</div>
            <div><strong>Address:</strong> ${order.address}</div>
        `;
        document.getElementById('customer-info').innerHTML = customerInfo;
        
        const itemsList = document.getElementById('order-items-list');
        itemsList.innerHTML = '';
        
        order.items.split(',').forEach(item => {
            const itemRow = document.createElement('tr');
            
            // Parse the item string with price (format: "Item Name (2x @ $15.00)")
            const priceStart = item.lastIndexOf('@ $');
            const qtyStart = item.lastIndexOf('(');
            const qtyEnd = item.lastIndexOf('x');
            
            const name = item.substring(0, qtyStart).trim();
            const quantity = item.substring(qtyStart + 1, qtyEnd).trim();
            const price = item.substring(priceStart + 3, item.length - 1).trim();
            const total = (parseFloat(price) * parseInt(quantity)).toFixed(2);
            
            itemRow.innerHTML = `
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${price}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${total}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                    <span class="status ${order.orderStatus}">${order.orderStatus}</span>
                </td>
            `;
            itemsList.appendChild(itemRow);
        });
        
        document.getElementById('order-notes').textContent = order.notes || 'No special instructions';
        document.getElementById('order-grand-total').textContent = `$${order.grandTotal.toFixed(2)}`;
        
        document.getElementById('complete-order').onclick = () => {
            updateOrderStatus(orderId, 'completed');
            document.getElementById('order-modal').style.display = 'none';
        };
        document.getElementById('cancel-order').onclick = () => {
            updateOrderStatus(orderId, 'cancelled');
            document.getElementById('order-modal').style.display = 'none';
        };
        document.getElementById('print-order').onclick = printOrder;
        
        document.getElementById('order-modal').style.display = 'flex';
    }
}

function printOrder() {
    window.print();
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayOrders();
        updatePagination();
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayOrders();
        updatePagination();
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    document.getElementById('orders-count').textContent = filteredOrders.length;
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
    
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages || totalPages === 0;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}