// Define variables at the top level
let currentPage = 1;
const contactsPerPage = 10;
let allContacts = [];
let filteredContacts = [];

document.addEventListener('DOMContentLoaded', function() {
    fetchContacts();


    // Check for contactId in URL
    const urlParams = new URLSearchParams(window.location.search);
    const contactId = urlParams.get('contactId');
    if (contactId) {
        viewContactDetails(contactId);
    }
    
    document.getElementById('search-contacts-btn').addEventListener('click', searchContacts);
    document.getElementById('prev-page-contacts').addEventListener('click', goToPrevPage);
    document.getElementById('next-page-contacts').addEventListener('click', goToNextPage);
    document.getElementById('search-contacts').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchContacts();
    });
    
    // Make sure this element exists in contacts.html
    const closeBtn = document.getElementById('close-message-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeMessageModal);
    }
});

// Rest of your functions remain the same...

function fetchContacts() {
    fetch('http://127.0.0.1:5001/getContacts')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                allContacts = data.contacts;
                filteredContacts = [...allContacts];
                displayContacts();
                updatePagination();
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error fetching contacts:', error);
            alert('Error loading contacts: ' + error.message);
        });
}

function searchContacts() {
    const searchTerm = document.getElementById('search-contacts').value.toLowerCase();
    
    if (searchTerm.trim() === '') {
        filteredContacts = [...allContacts];
    } else {
        filteredContacts = allContacts.filter(contact => 
            contact.name.toLowerCase().includes(searchTerm) ||
            contact.email.toLowerCase().includes(searchTerm) ||
            (contact.phone && contact.phone.toLowerCase().includes(searchTerm)) ||
            contact.subject.toLowerCase().includes(searchTerm) ||
            contact.message.toLowerCase().includes(searchTerm)
        );
    }
    
    currentPage = 1;
    displayContacts();
    updatePagination();
}

function displayContacts() {
    const tableBody = document.querySelector('#contacts-table tbody');
    tableBody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * contactsPerPage;
    const endIndex = Math.min(startIndex + contactsPerPage, filteredContacts.length);
    const contactsToDisplay = filteredContacts.slice(startIndex, endIndex);
    
    if (contactsToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" class="text-center">No messages found</td>`;
        tableBody.appendChild(row);
        return;
    }
    
    contactsToDisplay.forEach(contact => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${contact.name}</td>
            <td>${contact.email}</td>
            <td>${contact.phone || 'N/A'}</td>
            <td>${contact.subject.length > 30 ? contact.subject.substring(0, 30) + '...' : contact.subject}</td>
            <td>${formatDate(contact.date)}</td>
            <td>
                <button class="btn btn-sm btn-primary view-contact" data-id="${contact.id}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-sm btn-danger delete-contact" data-id="${contact.id}">
                    <i class="fas fa-trash"></i> Delete
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
    
    document.querySelectorAll('.delete-contact').forEach(button => {
        button.addEventListener('click', function() {
            const contactId = this.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this message?')) {
                deleteContact(contactId);
            }
        });
    });
}

function viewContactDetails(contactId) {
    const contact = allContacts.find(c => c.id == contactId);
    if (contact) {
        document.getElementById('message-from').textContent = `${contact.name} (${contact.email}) ${contact.phone ? '| ' + contact.phone : ''}`;
        document.getElementById('message-subject').textContent = contact.subject;
        document.getElementById('message-content').textContent = contact.message;
        document.getElementById('message-date').textContent = formatDate(contact.date, true);
        
        document.getElementById('reply-message').onclick = () => {
            window.location.href = `mailto:${contact.email}?subject=Re: ${contact.subject}`;
        };
        
        document.getElementById('delete-message').onclick = () => {
            if (confirm('Are you sure you want to delete this message?')) {
                deleteContact(contactId);
                closeMessageModal();
            }
        };
        
        document.getElementById('message-modal').style.display = 'flex';
    }
}

function deleteContact(contactId) {
    // In a real app, you would call an API to delete the contact
    // For now, we'll just remove it from the local array
    allContacts = allContacts.filter(c => c.id != contactId);
    filteredContacts = filteredContacts.filter(c => c.id != contactId);
    
    displayContacts();
    updatePagination();
    alert('Message deleted successfully');
}

function closeMessageModal() {
    document.getElementById('message-modal').style.display = 'none';
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayContacts();
        updatePagination();
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayContacts();
        updatePagination();
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);
    document.getElementById('contacts-count').textContent = filteredContacts.length;
    document.getElementById('page-info-contacts').textContent = `Page ${currentPage} of ${totalPages}`;
    
    document.getElementById('prev-page-contacts').disabled = currentPage === 1;
    document.getElementById('next-page-contacts').disabled = currentPage === totalPages || totalPages === 0;
}

function formatDate(dateString, includeTime = false) {
    const date = new Date(dateString);
    if (includeTime) {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    return date.toLocaleDateString();
}