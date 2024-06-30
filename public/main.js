const eventForm = document.getElementById('eventForm');
const eventContainer = document.getElementById('eventContainer');
const eventsList = document.getElementById('eventsList');
const searchList = document.getElementById('');

function addEvent() {
    const newEvent = document.createElement('div');
    newEvent.classList.add('event');
    newEvent.innerHTML = `
        <input type="text" name="header" placeholder="Header" required class="mdl-textfield__input">
        <input type="text" name="link" placeholder="Link" class="mdl-textfield__input">
        <input type="text" name="source" placeholder="Source" class="mdl-textfield__input">
        <input type="text" name="keywords" placeholder="Keywords (comma separated)" class="mdl-textfield__input">
    `;
    eventContainer.appendChild(newEvent);
}

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(eventForm);
    const events = [];
    for (let i = 0; i < formData.getAll('header').length; i++) {
        events.push({
            header: formData.getAll('header')[i],
            link: formData.getAll('link')[i],
            source: formData.getAll('source')[i],
            admiralty_reliability: formData.getAll('admiralty_reliability')[i],
            admiralty_accuracy: formData.getAll('admiralty_accuracy')[i],
            event_time: formData.getAll('event_time')[i],
            keywords: formData.getAll('keywords')[i]
        });
    }

    try {
        const response = await fetch('events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events })
        });

        const result = await response.json();
        if (response.ok) {
            alert('Events submitted successfully');
            loadEvents(); // Reload events after submission
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
});

async function loadEvents() {
    try {
        const response = await fetch('events');
        const events = await response.json();
        eventsList.innerHTML = '<input type="text" placeholder="Search" class="mdl-textfield__input search"/>';
        if (events.length > 0) {
            const table = document.createElement('table');
            table.classList.add('mdl-data-table', 'mdl-js-data-table', 'mdl-shadow--2dp');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th class="mdl-data-table__cell--non-numeric">Header</th>
                        <th class="mdl-data-table__cell--non-numeric">Link</th>
                        <th class="mdl-data-table__cell--non-numeric">Source</th>
                        <th class="mdl-data-table__cell--non-numeric">Reliability</th>
                        <th class="mdl-data-table__cell--non-numeric">Accuracy</th>
                        <th class="mdl-data-table__cell--non-numeric">Event time</th>
                        <th class="mdl-data-table__cell--non-numeric">Creation time</th>
                        <th class="mdl-data-table__cell--non-numeric">Keywords</th>
                    </tr>
                </thead>
                <tbody class="list">
                    ${events.map(event => `
                        <tr>
                            <td class="mdl-data-table__cell--non-numeric header">${event.header}</td>
                            <td class="mdl-data-table__cell--non-numeric link"><a href="${event.link}" target="_blank">${event.link}</a></td>
                            <td class="mdl-data-table__cell--non-numeric source">${event.source}</td>
                            <td class="mdl-data-table__cell--non-numeric admiralty_reliability">${event.admiralty_reliability}</td>
                            <td class="mdl-data-table__cell--non-numeric admiralty_accuracy">${event.admiralty_accuracy}</td>
                            <td class="mdl-data-table__cell--non-numeric event_time">${event.event_time}</td>
                            <td class="mdl-data-table__cell--non-numeric creation_time">${event.creation_time}</td>
                            <td class="mdl-data-table__cell--non-numeric keywords">${event.keywords.join(', ')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            eventsList.appendChild(table);
            componentHandler.upgradeElement(table);
            var options = {
                valueNames: [ 'header', 'link', 'source', 'admiralty_reliability', 'admiralty_accuracy', 'event_time', 'creation_time', 'keywords' ]
              };
            
            var userList = new List('eventsList', options);

        } else {
            eventsList.innerHTML = '<p>No events found.</p>';
        }
    } catch (error) {
        eventsList.innerHTML = `<p>Error loading events: ${error.message}</p>`;
    }

}

// Load events on page load
window.onload = loadEvents;

