document.addEventListener('DOMContentLoaded', function() {
    fetchDashboardData();
    setInterval(fetchDashboardData, 30000);
    
    // Modal event listeners
    document.getElementById('close-modal')?.addEventListener('click', closeModal);
    document.getElementById('close-message-modal')?.addEventListener('click', closeMessageModal);
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                if (modal.id === 'order-modal') closeModal();
                if (modal.id === 'message-modal') closeMessageModal();
            }
        });
    });
});

let topItemsChart, customerSpendingChart;

function fetchDashboardData() {
    fetch('http://127.0.0.1:5001/getData')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                updateDashboardCards(data);
                populateRecentOrders(data.orders);
                populateRecentContacts(data.contacts);
                createCharts(data.orders);
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error fetching dashboard data:', error);
            alert('Error loading dashboard: ' + error.message);
        });
}

function updateDashboardCards(data) {
    document.getElementById('total-orders').textContent = data.orders.length;
    const pendingOrders = data.orders.filter(order => order.orderStatus === 'pending').length;
    document.getElementById('pending-orders').textContent = pendingOrders;
    document.getElementById('total-contacts').textContent = data.contacts.length;
    document.getElementById('total-logins').textContent = data.logins.length;
    
    // Calculate net sales (sum of all completed orders)
    const netSales = data.orders
        .filter(order => order.orderStatus === 'completed')
        .reduce((sum, order) => sum + parseFloat(order.grandTotal), 0);
    
    document.getElementById('net-sales').textContent = `$${netSales.toFixed(2)}`;
}

function createCharts(orders) {
    // Destroy existing charts if they exist
    if (topItemsChart) topItemsChart.destroy();
    if (customerSpendingChart) customerSpendingChart.destroy();
    
    // Process data for top items chart
    const itemsData = {};
    orders.forEach(order => {
        order.items.split(',').forEach(item => {
            const itemName = item.split('(')[0].trim();
            const quantityMatch = item.match(/\((\d+)x/);
            const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
            
            if (itemsData[itemName]) {
                itemsData[itemName] += quantity;
            } else {
                itemsData[itemName] = quantity;
            }
        });
    });
    
    const sortedItems = Object.entries(itemsData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const itemNames = sortedItems.map(item => item[0]);
    const itemQuantities = sortedItems.map(item => item[1]);
    
    // Top Items Chart (Doughnut)
    const topItemsCtx = document.getElementById('topItemsChart').getContext('2d');
    topItemsChart = new Chart(topItemsCtx, {
        type: 'doughnut',
        data: {
            labels: itemNames,
            datasets: [{
                data: itemQuantities,
                backgroundColor: [
                    '#ff6b6b',
                    '#4ecdc4',
                    '#ff9f1c',
                    '#a64ac9',
                    '#17bebb'
                ],
                borderWidth: 1,
                cutout: '60%' // Larger cutout for smaller donut
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    align: 'center',
                    labels: {
                        boxWidth: 12,
                        padding: 16,
                        font: {
                            size: 12
                        },
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20
                }
            }
        }
    });
    
    // Process data for customer spending chart
    const customerData = {};
    orders.forEach(order => {
        if (order.orderStatus === 'completed') {
            if (customerData[order.fullName]) {
                customerData[order.fullName] += parseFloat(order.grandTotal);
            } else {
                customerData[order.fullName] = parseFloat(order.grandTotal);
            }
        }
    });
    
    const sortedCustomers = Object.entries(customerData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7);
    
    const customerNames = sortedCustomers.map(customer => customer[0]);
    const customerTotals = sortedCustomers.map(customer => customer[1]);
    
    // Customer Spending Chart (Bar)
    const customerSpendingCtx = document.getElementById('customerSpendingChart').getContext('2d');
    customerSpendingChart = new Chart(customerSpendingCtx, {
        type: 'bar',
        data: {
            labels: customerNames,
            datasets: [{
                label: 'Total Spending ($)',
                data: customerTotals,
                backgroundColor: '#4ecdc4',
                borderColor: '#3dbeb4',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 2, // Add fixed aspect ratio
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                },
                x: {
                    ticks: {
                        autoSkip: true,
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + context.raw.toFixed(2);
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                onComplete: function() {
                    // Fix for chart resizing
                    const chart = this.chart;
                    setTimeout(function() {
                        chart.resize();
                    }, 0);
                }
            }
        }
    });
}

function populateRecentOrders(orders) {
    const tableBody = document.querySelector('#recent-orders tbody');
    tableBody.innerHTML = '';
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.fullName}</td>
            <td>${order.items.split(',').slice(0, 2).join(', ')}${order.items.split(',').length > 2 ? '...' : ''}</td>
            <td>$${order.grandTotal.toFixed(2)}</td>
            <td>${formatDate(order.date)}</td>
            <td><span class="status ${order.orderStatus}">${order.orderStatus}</span></td>
            <td>
                <button class="btn btn-sm btn-primary view-order" data-id="${order.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    document.querySelectorAll('.view-order').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-id');
            viewOrderDetails(orderId);
        });
    });
}

function populateRecentContacts(contacts) {
    const tableBody = document.querySelector('#recent-contacts tbody');
    tableBody.innerHTML = '';
    
    contacts.forEach(contact => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${contact.name}</td>
            <td>${contact.email}</td>
            <td>${contact.subject.length > 30 ? contact.subject.substring(0, 30) + '...' : contact.subject}</td>
            <td>${formatDate(contact.date)}</td>
            <td>
                <button class="btn btn-sm btn-primary view-contact" data-id="${contact.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    document.querySelectorAll('.view-contact').forEach(button => {
        button.addEventListener('click', function() {
            const contactId = this.getAttribute('data-id');
            viewContactDetails(contactId);
        });
    });
}




function updateDashboardCards(data) {
    document.getElementById('total-orders').textContent = data.orders.length;
    const pendingOrders = data.orders.filter(order => order.orderStatus === 'pending').length;
    document.getElementById('pending-orders').textContent = pendingOrders;
    document.getElementById('total-contacts').textContent = data.contacts.length;
    document.getElementById('total-logins').textContent = data.logins.length;
    
    // Calculate net sales (sum of all completed orders)
    const netSales = data.orders
        .filter(order => order.orderStatus === 'completed')
        .reduce((sum, order) => sum + parseFloat(order.grandTotal), 0);
    
    document.getElementById('net-sales').textContent = `$${netSales.toFixed(2)}`;
}

function viewOrderDetails(orderId) {
    fetch('http://127.0.0.1:5001/getOrders')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                const order = data.orders.find(o => o.id == orderId);
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
                        const [name, qty] = item.split(' (');
                        const quantity = qty ? qty.replace('x)', '') : '1';
                        
                        itemRow.innerHTML = `
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${name}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">$10.00</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${quantity}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${(10 * quantity).toFixed(2)}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                                <span class="status ${order.orderStatus}">${order.orderStatus}</span>
                            </td>
                        `;
                        itemsList.appendChild(itemRow);
                    });
                    
                    document.getElementById('order-notes').textContent = order.notes || 'No special instructions';
                    document.getElementById('order-grand-total').textContent = `$${order.grandTotal.toFixed(2)}`;
                    
                    document.getElementById('complete-order').onclick = () => updateOrderStatus(orderId, 'completed');
                    document.getElementById('cancel-order').onclick = () => updateOrderStatus(orderId, 'cancelled');
                    document.getElementById('print-order').onclick = printOrder;
                    
                    document.getElementById('order-modal').style.display = 'flex';
                }
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        
        
        
        // Redirect to orders page with the order ID
    window.location.href = `orders.html?orderId=${orderId}`;
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
            alert(`Order #${orderId} has been marked as ${status}`);
            closeModal();
            fetchDashboardData();
        } else {
            throw new Error(data.error || 'Failed to update order status');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error updating order: ' + error.message);
    });
}

function viewContactDetails(contactId) {
    fetch('http://127.0.0.1:5001/getContacts')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                const contact = data.contacts.find(c => c.id == contactId);
                if (contact) {
                    document.getElementById('message-from').textContent = `${contact.name} (${contact.email}) ${contact.phone ? '| ' + contact.phone : ''}`;
                    document.getElementById('message-subject').textContent = contact.subject;
                    document.getElementById('message-content').textContent = contact.message;
                    document.getElementById('message-date').textContent = formatDate(contact.date);
                    
                    document.getElementById('reply-message').onclick = () => {
                        window.location.href = `mailto:${contact.email}?subject=Re: ${contact.subject}`;
                    };
                    
                    document.getElementById('delete-message').onclick = () => {
                        if (confirm('Are you sure you want to delete this message?')) {
                            alert('Message deleted (simulated)');
                            closeMessageModal();
                        }
                    };
                    
                    document.getElementById('message-modal').style.display = 'flex';
                }
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        

        // Redirect to contacts page with the contact ID
    window.location.href = `contacts.html?contactId=${contactId}`;
}

function printOrder() {
    window.print();
}

function closeModal() {
    document.getElementById('order-modal').style.display = 'none';
}

function closeMessageModal() {
    document.getElementById('message-modal').style.display = 'none';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}