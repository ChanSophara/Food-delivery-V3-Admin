// Define variables at the top level
let currentPage = 1;
const loginsPerPage = 10;
let allLogins = [];
let filteredLogins = [];

document.addEventListener('DOMContentLoaded', function() {
    fetchLogins();
    
    document.getElementById('search-logins-btn').addEventListener('click', searchLogins);
    document.getElementById('date-filter').addEventListener('change', filterByDate);
    document.getElementById('prev-page-logins').addEventListener('click', goToPrevPage);
    document.getElementById('next-page-logins').addEventListener('click', goToNextPage);
    document.getElementById('search-logins').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchLogins();
    });
});


function fetchLogins() {
    fetch('http://127.0.0.1:5001/getLogins')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                allLogins = data.logins;
                filteredLogins = [...allLogins];
                displayLogins();
                updatePagination();
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error fetching logins:', error);
            alert('Error loading logins: ' + error.message);
        });
}

function searchLogins() {
    const searchTerm = document.getElementById('search-logins').value.toLowerCase();
    
    if (searchTerm.trim() === '') {
        filteredLogins = [...allLogins];
    } else {
        filteredLogins = allLogins.filter(login => 
            login.email.toLowerCase().includes(searchTerm))
        ;
    }
    
    currentPage = 1;
    displayLogins();
    updatePagination();
}

function filterByDate() {
    const dateFilter = document.getElementById('date-filter').value;
    
    if (!dateFilter) {
        filteredLogins = [...allLogins];
    } else {
        const filterDate = new Date(dateFilter);
        filteredLogins = allLogins.filter(login => {
            const loginDate = new Date(login.date);
            return loginDate.toDateString() === filterDate.toDateString();
        });
    }
    
    currentPage = 1;
    displayLogins();
    updatePagination();
}

// Add this function to handle viewing login details
function viewLoginDetails(loginId) {
    const login = allLogins.find(l => l.id == loginId);
    if (login) {
        // Create a simple modal or use alert for now
        alert(`Login Details:\n\nEmail: ${login.email}\nDate: ${new Date(login.date).toLocaleString()}\nIP: 192.168.1.1`);
        
        // For a better solution, you could implement a modal like in other pages
        // document.getElementById('login-email').textContent = login.email;
        // document.getElementById('login-date').textContent = new Date(login.date).toLocaleString();
        // document.getElementById('login-modal').style.display = 'flex';
    }
}

// Update the displayLogins function
function displayLogins() {
    const tableBody = document.querySelector('#logins-table tbody');
    tableBody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * loginsPerPage;
    const endIndex = Math.min(startIndex + loginsPerPage, filteredLogins.length);
    const loginsToDisplay = filteredLogins.slice(startIndex, endIndex);
    
    if (loginsToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" class="text-center">No logins found</td>`;
        tableBody.appendChild(row);
        return;
    }
    
    loginsToDisplay.forEach(login => {
        const row = document.createElement('tr');
        const loginDate = new Date(login.date);
        
        row.innerHTML = `
            <td>${login.email}</td>
            <td>${loginDate.toLocaleDateString()}</td>
            <td>${loginDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
            <td>192.168.1.1</td>
            <td>
                <button class="btn btn-sm btn-primary view-login-details" data-id="${login.id}">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to all details buttons
    document.querySelectorAll('.view-login-details').forEach(button => {
        button.addEventListener('click', function() {
            const loginId = this.getAttribute('data-id');
            viewLoginDetails(loginId);
        });
    });
}
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayLogins();
        updatePagination();
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(filteredLogins.length / loginsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayLogins();
        updatePagination();
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredLogins.length / loginsPerPage);
    document.getElementById('logins-count').textContent = filteredLogins.length;
    document.getElementById('page-info-logins').textContent = `Page ${currentPage} of ${totalPages}`;
    
    document.getElementById('prev-page-logins').disabled = currentPage === 1;
    document.getElementById('next-page-logins').disabled = currentPage === totalPages || totalPages === 0;
}