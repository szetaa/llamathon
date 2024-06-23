document.addEventListener('DOMContentLoaded', async () => {
    const challengeList = document.getElementById('challenge-list');
    const promptForm = document.getElementById('prompt-form');
    const challengeDetailsContainer = document.getElementById('challenge-details');
    const exampleButtonsContainer = document.getElementById('example-buttons');
    const exampleInput = document.getElementById('example-input');
    const exampleExpected = document.getElementById('example-expected');
    const submitPromptForm = document.getElementById('submit-prompt-form');
    const resultDiv = document.getElementById('result');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const finalSubmitButton = document.getElementById('final-submit-button');
    const confirmFinalSubmitButton = document.getElementById('confirm-final-submit');
    let selectedChallenge = null;
    let examples = [];
    let currentHistoryIndex = -1;
    let promptHistories = JSON.parse(localStorage.getItem('promptHistories')) || {};
    let challengeStatuses = JSON.parse(localStorage.getItem('challengeStatuses')) || {};

    // Fetch and parse the YAML file
    async function fetchChallenges() {
        try {
            const response = await fetch('./challenges.yml');
            const yamlText = await response.text();
            const data = jsyaml.load(yamlText);
            return data;
        } catch (error) {
            console.error('Error fetching challenges:', error);
        }
    }

    // Populate the challenge list as a dropdown
    const challengeDropdown = document.getElementById('challengeDropdown');
    const challenges = await fetchChallenges();
    for (const [key, challenge] of Object.entries(challenges)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = challenge.title;
        challengeDropdown.appendChild(option);
    }

    // Handle dropdown change event
    challengeDropdown.addEventListener('change', (event) => {
        const selectedKey = event.target.value;
        const challenge = challenges[selectedKey];
        selectedChallenge = challenge;
        examples = Object.entries(challenge.examples).map(([name, details]) => ({
            name,
            ...details
        }));
        populateChallengeDetails(challenge)
        populateExamples(examples);
        showPromptForm();
        loadHistoryForChallenge(challenge.title);
        updateFinalSubmitButton();
    });

    // Populate challenge details
    function populateChallengeDetails(challenge) {
        challengeDetailsContainer.innerHTML = challenge.description
    }

    // Populate the examples
    function populateExamples(examples) {
        exampleButtonsContainer.innerHTML = '';
        examples.forEach((example, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.classList.add('btn', 'btn-primary', 'm-1'); // Adding 'btn-primary' for blue buttons and 'm-1' for spacing
            button.textContent = example.name;
            button.addEventListener('click', () => {
                displayExampleDetails(example);
                setActiveButton(button);
            });
            exampleButtonsContainer.appendChild(button);

            // Display the first example by default
            if (index === 0) {
                displayExampleDetails(example);
                setActiveButton(button);
            }
        });
    }

    // Set active button
    function setActiveButton(activeButton) {
        Array.from(exampleButtonsContainer.children).forEach(button => {
            button.classList.remove('active');
        });
        activeButton.classList.add('active');
    }

    // Display example details
    function displayExampleDetails(example) {
        exampleInput.innerHTML = marked.parse(example.input);
        exampleExpected.innerHTML = marked.parse(example.expected);
    }

    // Show prompt form for the selected challenge
    function showPromptForm() {
        promptForm.style.display = 'block';
        resultDiv.innerHTML = '';
        currentHistoryIndex = promptHistories[selectedChallenge.title]?.length || 0; // Reset history index when a new challenge is selected
    }

    // Load history for the selected challenge
    function loadHistoryForChallenge(challengeTitle) {
        promptHistory = promptHistories[challengeTitle] || [];
        currentHistoryIndex = promptHistory.length - 1; // Set index to the latest entry
        if (currentHistoryIndex >= 0) {
            displayPromptFromHistory(currentHistoryIndex);
        } else {
            document.getElementById('prompt').value = '';
        }
    }

    // Handle form submission
    submitPromptForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const promptText = document.getElementById('prompt').value;
        const activeExampleIndex = Array.from(exampleButtonsContainer.children).findIndex(button => button.classList.contains('active'));
        const requestData = {
            prompt: promptText,
            example: examples[activeExampleIndex]
        };

        // Store the prompt in local storage
        storePrompt(requestData);

        try {
            const response = await fetch('/api/submit-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            const result = await response.json();
            displayResult(result);
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Store prompt in local storage
    function storePrompt(prompt) {
        if (!promptHistories[selectedChallenge.title]) {
            promptHistories[selectedChallenge.title] = [];
        }
        promptHistories[selectedChallenge.title].push(prompt);
        localStorage.setItem('promptHistories', JSON.stringify(promptHistories));
        currentHistoryIndex = promptHistories[selectedChallenge.title].length - 1; // Set index to the latest entry
    }

    // Display the result from the OpenAI API
    function displayResult(result) {
        resultDiv.innerHTML = `<h3>Result</h3><pre>${JSON.stringify(result, null, 2)}</pre>`;
    }

    // Handle previous button click
    prevButton.addEventListener('click', () => {
        if (currentHistoryIndex > 0) {
            currentHistoryIndex -= 1;
            displayPromptFromHistory(currentHistoryIndex);
        }
    });

    // Handle next button click
    nextButton.addEventListener('click', () => {
        if (currentHistoryIndex < promptHistories[selectedChallenge.title].length - 1) {
            currentHistoryIndex += 1;
            displayPromptFromHistory(currentHistoryIndex);
        }
    });

    // Display prompt from history
    function displayPromptFromHistory(index) {
        const historyItem = promptHistories[selectedChallenge.title][index];
        document.getElementById('prompt').value = historyItem.prompt;
        displayExampleDetails(historyItem.example);
    }

    // Handle final submit button click
    finalSubmitButton.addEventListener('click', () => {
        $('#finalSubmitModal').modal('show');
    });

    // Handle confirm final submit button click
    confirmFinalSubmitButton.addEventListener('click', () => {
        challengeStatuses[selectedChallenge.title] = 'submitted';
        localStorage.setItem('challengeStatuses', JSON.stringify(challengeStatuses));
        $('#finalSubmitModal').modal('hide');
        updateFinalSubmitButton();
    });

    // Update the final submit button based on challenge status
    function updateFinalSubmitButton() {
        if (challengeStatuses[selectedChallenge.title] === 'submitted') {
            finalSubmitButton.disabled = true;
        } else {
            finalSubmitButton.disabled = false;
        }
    }
});
