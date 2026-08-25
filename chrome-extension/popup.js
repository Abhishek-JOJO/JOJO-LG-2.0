const eventsContainer = document.getElementById('events-container');
const emptyState = document.getElementById('empty-state');
const eventTemplate = document.getElementById('event-template');
const clearBtn = document.getElementById('clear-btn');

const PROVIDER_COLORS = {
  'clevertap': 'badge-clevertap',
  'firebase': 'badge-firebase',
  'backend': 'badge-backend',
  'meta_pixel': 'badge-meta_pixel',
  'google_tag': 'badge-google_tag'
};

const PROVIDER_LABELS = {
  'clevertap': 'Clevertap',
  'firebase': 'Firebase',
  'backend': 'Backend API',
  'meta_pixel': 'Meta Pixel',
  'google_tag': 'Google Tag'
};

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
}

function createEventCard(payload) {
  emptyState.style.display = 'none';
  
  const clone = eventTemplate.content.cloneNode(true);
  const card = clone.querySelector('.event-card');
  const nameEl = clone.querySelector('.event-name');
  const timeEl = clone.querySelector('.event-time');
  const providersContainer = clone.querySelector('.providers-container');
  const payloadEl = clone.querySelector('.event-payload');
  const preEl = clone.querySelector('pre');

  nameEl.textContent = payload.event.name;
  timeEl.textContent = formatTime(payload.timestamp);
  
  // Format JSON payload nicely
  preEl.textContent = JSON.stringify(payload.event, null, 2);

  // Add badges for each provider
  const providers = payload.providers || [];
  
  // Store providers as a data attribute on the card for filtering
  card.dataset.providers = JSON.stringify(providers);

  if (providers.length === 0) {
    providersContainer.style.display = 'none';
  } else {
    providers.forEach(provider => {
      const badge = document.createElement('span');
      const colorClass = PROVIDER_COLORS[provider] || 'badge-default';
      const label = PROVIDER_LABELS[provider] || provider;
      
      badge.className = `badge ${colorClass}`;
      badge.textContent = label;
      providersContainer.appendChild(badge);
    });
  }

  // Toggle payload visibility on click
  card.addEventListener('click', () => {
    if (payloadEl.style.display === 'block') {
      payloadEl.style.display = 'none';
    } else {
      payloadEl.style.display = 'block';
    }
  });

  eventsContainer.prepend(clone);
  
  // Apply current filter to the new card
  applyFilters();
}

// Filtering logic
const checkboxes = document.querySelectorAll('#filter-bar input[type="checkbox"]');
checkboxes.forEach(cb => cb.addEventListener('change', applyFilters));

function applyFilters() {
  const activeFilters = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
    
  const cards = eventsContainer.querySelectorAll('.event-card');
  let visibleCount = 0;

  cards.forEach(card => {
    const cardProviders = JSON.parse(card.dataset.providers || '[]');
    
    // Show card if it has ANY provider that is currently checked, or if it has no providers
    const shouldShow = cardProviders.length === 0 || cardProviders.some(p => activeFilters.includes(p));
    
    if (shouldShow) {
      card.style.display = 'block';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });
  
  // Handle empty state
  if (visibleCount === 0 && cards.length > 0) {
    emptyState.querySelector('p').textContent = 'No events match your selected filters.';
    emptyState.style.display = 'block';
  } else if (cards.length === 0) {
    emptyState.querySelector('p').textContent = 'Waiting for analytics events...';
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
  }
}

// Load existing events
chrome.runtime.sendMessage({ type: "GET_EVENTS" }, (response) => {
  if (response && response.length > 0) {
    // Reverse because we prepend them, so we want the oldest first to end up at bottom
    [...response].reverse().forEach(createEventCard);
  }
});

// Listen for new incoming events while popup is open
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "NEW_EVENT") {
    createEventCard(message.payload);
  }
});

// Clear events
clearBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "CLEAR_EVENTS" }, () => {
    eventsContainer.innerHTML = '';
    eventsContainer.appendChild(emptyState);
    emptyState.style.display = 'block';
  });
});
