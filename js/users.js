// Define variables at the top level
let currentPage = 1;
const usersPerPage = 10;
let allUsers = [];
let filteredUsers = [];

document.addEventListener('DOMContentLoaded', function() {
    fetchUsers();
    
    document.getElementById('search-users-btn').addEventListener('click', searchUsers);
    document.getElementById('status-filter').addEventListener('change', filterUsers);
    document.getElementById('prev-page-users').addEventListener('click', goToPrevPage);
    document.getElementById('next-page-users').addEventListener('click', goToNextPage);
    document.getElementById('search-users').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchUsers();
    });
    
    // Close user modal
    document.getElementById('close-user-modal')?.addEventListener('click', closeUserModal);
});

function fetchUsers() {
    fetch('http://127.0.0.1:5001/getRegisteredUsers')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                allUsers = data.users;
                filteredUsers = [...allUsers];
                displayUsers();
                updatePagination();
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error fetching users:', error);
            alert('Error loading users: ' + error.message);
        });
}

function searchUsers() {
    const searchTerm = document.getElementById('search-users').value.toLowerCase();
    
    if (searchTerm.trim() === '') {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(user => 
            user.full_name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.phone.toLowerCase().includes(searchTerm)
        );
    }
    
    currentPage = 1;
    displayUsers();
    updatePagination();
}

function filterUsers() {
    const statusFilter = document.getElementById('status-filter').value;
    
    if (statusFilter === 'all') {
        filteredUsers = [...allUsers];
    } else if (statusFilter === 'active') {
        filteredUsers = allUsers.filter(user => user.status === 'Active');
    } else if (statusFilter === 'inactive') {
        filteredUsers = allUsers.filter(user => user.status !== 'Active');
    }
    
    currentPage = 1;
    displayUsers();
    updatePagination();
}

function displayUsers() {
    const tableBody = document.querySelector('#users-table tbody');
    tableBody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = Math.min(startIndex + usersPerPage, filteredUsers.length);
    const usersToDisplay = filteredUsers.slice(startIndex, endIndex);
    
    if (usersToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="7" class="text-center">No users found</td>`;
        tableBody.appendChild(row);
        return;
    }
    
    usersToDisplay.forEach(user => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${user.full_name}</td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>${formatDate(user.join_date)}</td>
            <td>${user.last_login ? formatDate(user.last_login) : 'Never'}</td>
            <td><span class="status ${user.status === 'Active' ? 'completed' : 'cancelled'}">${user.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary view-user" data-id="${user.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    document.querySelectorAll('.view-user').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            viewUserDetails(userId);
        });
    });
}

function viewUserDetails(userId) {
    const user = allUsers.find(u => u.id == userId);
    if (user) {
        document.getElementById('user-name').textContent = user.full_name;
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('user-phone').textContent = user.phone;
        document.getElementById('user-dob').textContent = user.date_of_birth || 'Not specified';
        document.getElementById('user-join-date').textContent = formatDate(user.join_date);
        document.getElementById('user-last-login').textContent = user.last_login ? formatDate(user.last_login) : 'Never logged in';
        document.getElementById('user-status').textContent = user.status;
        
        // Remove existing password field if it exists
        const existingPasswordField = document.getElementById('user-password-container');
        if (existingPasswordField) {
            existingPasswordField.remove();
        }
        
        // Create new password field
        const passwordField = document.createElement('div');
        passwordField.id = 'user-password-container';
        passwordField.style.margin = '15px 0';
        passwordField.innerHTML = `
            <div style="margin-bottom: 8px;">
                <strong>Password:</strong>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="password" id="user-password" value="${user.password || ''}" readonly 
                    style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace;">
                <button class="btn btn-sm" id="toggle-password" style="white-space: nowrap;">
                    <i class="fas fa-eye"></i> Show
                </button>
                <button class="btn btn-sm btn-primary" id="reset-password" style="white-space: nowrap;">
                    <i class="fas fa-sync-alt"></i> Reset
                </button>
            </div>
        `;
        
        // Insert after status field
        const statusField = document.querySelector('#user-status').parentElement;
        statusField.parentNode.insertBefore(passwordField, statusField.nextSibling);
        
        // Toggle password visibility
        document.getElementById('toggle-password').addEventListener('click', function() {
            const passwordInput = document.getElementById('user-password');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
                this.innerHTML = '<i class="fas fa-eye-slash"></i> Hide';
            } else {
                passwordInput.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
                this.innerHTML = '<i class="fas fa-eye"></i> Show';
            }
        });
        
        // Reset password functionality
        document.getElementById('reset-password').addEventListener('click', function() {
            const newPassword = prompt('Enter new password for this user:');
            if (newPassword && newPassword.trim() !== '') {
                if (confirm(`Are you sure you want to reset password for ${user.full_name}?`)) {
                    fetch('http://127.0.0.1:5001/updateUserPassword', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: userId,
                            newPassword: newPassword
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            alert('Password reset successfully!');
                            document.getElementById('user-password').value = newPassword;
                            // Update the local array
                            const userIndex = allUsers.findIndex(u => u.id == userId);
                            if (userIndex !== -1) {
                                allUsers[userIndex].password = newPassword;
                            }
                        } else {
                            throw new Error(data.error || 'Failed to reset password');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Error resetting password: ' + error.message);
                    });
                }
            }
        });
        
        // Fetch user orders
        fetchUserOrders(user.email);
        
        document.getElementById('user-modal').style.display = 'flex';
    }
}

function editUser(userId) {
    const user = allUsers.find(u => u.id == userId);
    if (user) {
        // In a real app, you would show an edit form or redirect to an edit page
        alert(`Editing user: ${user.full_name}\n\nThis would open an edit form in a real application.`);
    }
}

function toggleUserStatus(userId) {
    const user = allUsers.find(u => u.id == userId);
    if (user) {
        const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
        if (confirm(`Are you sure you want to ${newStatus === 'Inactive' ? 'deactivate' : 'activate'} this user?`)) {
            // In a real app, you would make an API call here
            fetch('http://127.0.0.1:5001/updateUserStatus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    status: newStatus
                })
            })
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    alert(`User status updated to ${newStatus}`);
                    closeUserModal();
                    fetchUsers(); // Refresh the user list
                } else {
                    throw new Error(data.error || 'Failed to update user status');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error updating user: ' + error.message);
            });
        }
    }
}

function fetchUserOrders(email) {
    fetch('http://127.0.0.1:5001/getOrders')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                const userOrders = data.orders.filter(order => order.email === email);
                displayUserOrders(userOrders);
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error fetching user orders:', error);
        });
}

function displayUserOrders(orders) {
    const ordersContainer = document.getElementById('user-orders');
    ordersContainer.innerHTML = '';
    
    if (orders.length === 0) {
        ordersContainer.innerHTML = '<p>No orders found for this user.</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Order ID</th>
            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Date</th>
            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Total</th>
            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Status</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order.id}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${formatDate(order.date)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${order.grandTotal.toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                <span class="status ${order.orderStatus}">${order.orderStatus}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    ordersContainer.appendChild(table);
}

function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayUsers();
        updatePagination();
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayUsers();
        updatePagination();
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    document.getElementById('users-count').textContent = filteredUsers.length;
    document.getElementById('page-info-users').textContent = `Page ${currentPage} of ${totalPages}`;
    
    document.getElementById('prev-page-users').disabled = currentPage === 1;
    document.getElementById('next-page-users').disabled = currentPage === totalPages || totalPages === 0;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}