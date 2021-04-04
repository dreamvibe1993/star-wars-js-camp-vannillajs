const url = new URL(window.location.href);

const mainSearchParams = new URLSearchParams(url.search);

/** 
 * Needed in order to not constantly requesting the data while switching pages 
 * Data is assigned in displayAMovieTable function and in searchAMovie function
 */
let fetchedDataMain = [];

/** 
 * Needed to store found characters and planets from a requested movie and also
 * in order to not constantly requesting the data while opening the sidebar.
 * Data is assigned in displayCharactersOrPlanets function
 */
let setOfPlanetsAndCharacters = {};
let foundPlanetsAndCharacters = {};

const rootContainer = document.querySelector('.root');
const errorDisplay = document.querySelector('.error-modal');
const loadingScreen = document.querySelector('.loadingscreen');

/** Default global variables */
const FIRST_PAGE = 1;
const LAST_PAGE = document.querySelector('.pagination').children.length / 2;
const FAILED_QUERY_STRING = 'nosuchflick';
const DEFAULT_PAGE = 'index.html';


/** Checks if the url has queries or actions */
window.onload = () => {
    if (mainSearchParams.has('q') && mainSearchParams.has('action')) {
        if (mainSearchParams.get('q') === FAILED_QUERY_STRING) {
            const movieTableContainer = document.querySelector('.movietable-container');
            movieTableContainer.innerHTML = `<h3>Sorry there is no such movie</h3><a href='${DEFAULT_PAGE}'>Back</a>`;
            showElements(rootContainer);
        } else {
            handleUserActions(mainSearchParams.get('action'));
        }
    } else {
        displayAMovieTable(FIRST_PAGE);
    }
}

/** 
 * Gets and returns the data showing loading status in process of. 
 * Is able to redirect a user in case of the given item's deletion or abscence. 
 * @param {string} url - The url to call
 * @param {string} method - HTTP request
 * @param {object} data - in case of DELETE or PATCH the data we need to edit
 */
async function sendOrGetData(url, method, data) {
    showElements(loadingScreen);
    let params = null;

    if (method === 'GET' || method === 'DELETE') {
        params = {
            method: method
        }
    } else {
        params = {
            method: method,
            headers: {
                "Content-type": "application/json"
            },
            body: JSON.stringify(data)
        }
    }
    const response = await fetch(url, params).catch(err => {
        showElements(errorDisplay)
        console.error(err)
    })
    if (response.status === 200) {
        if (method === 'DELETE') {
            window.location.href = DEFAULT_PAGE;
            return
        }
        const fetchedData = await response.json();
        if (fetchedData === null) {
            window.location.href = `${DEFAULT_PAGE}?q=${FAILED_QUERY_STRING}&action=display`;
        }
        const fetchedDataKeys = Object.keys(fetchedData);
        let fetchedDataToReturn = Object.values(fetchedData);

        fetchedDataToReturn.forEach((movie, ind) => {
            if (movie.fields) {
                movie.id = fetchedDataKeys[ind];
            } else {
                return fetchedDataToReturn = fetchedData;
            }
        })

        hideElements(loadingScreen);
        showElements(rootContainer);

        return fetchedDataToReturn;
    } else {
        return Promise.reject(response);
    }
}

/** 
 * Switches the pages
 * @param {Object} event - DOM event object
 */
function paginate(event) {
    if (!event.target.classList.contains('pagination-item-label')) {
        return;
    }

    let pageNumber = Number(event.target.innerText);
    if (event.target.innerText === 'First') {
        pageNumber = FIRST_PAGE
    }
    if (event.target.innerText === 'Last') {
        pageNumber = LAST_PAGE
    }

    displayAMovieTable(pageNumber);
}

/** 
 * Reveals the table with data received from a DB 
 * @param {number} pageNumber - the number of a page
 */
function displayAMovieTable(pageNumber) {
    if (!fetchedDataMain[0]) {
        sendOrGetData('https://star-wars-all-stars-default-rtdb.firebaseio.com/swapi/films.json', 'GET')
            .then(res => {
                fetchedDataMain = res
                displayAMovieTable(pageNumber);
            })
    } else {
        const table = `<table class="movie-table"></table>`
        const buttons = `
            <div class="sorting-buttons-container">
                <button type="button" class="sort-button" title="Sorts the table by newest" onclick='sortTableByDate("new")'>Sort by newest</button>
                <button type="button" class="sort-button" title="Sorts the table by oldest" onclick='sortTableByDate("old")'>Sort by oldest</button>
            </div>`

        const targetSection = document.querySelector('.table-display-container');
        targetSection.innerHTML = table + buttons;

        const maxNumberOfItems = fetchedDataMain.length;
        const numberOfItemsToShow = maxNumberOfItems / LAST_PAGE;
        const cutRangeStartNumber = maxNumberOfItems - (maxNumberOfItems / pageNumber);
        const cutRangeEndNumber = numberOfItemsToShow * pageNumber;

        const restrictedMovieRange = fetchedDataMain.slice(cutRangeStartNumber, cutRangeEndNumber);

        const tableElements = restrictedMovieRange.map((movie, index) => {
            return `<tr>
                        <td 
                        class='episode-title ${index}'>
                        <h3>${movie.fields.title}</h3>
                        <a href='?q=${movie.id}&action=display'>Details</a>
                        <a href='?q=${movie.id}&action=edit'>Edit</a>
                        </td>
                        <td 
                        class='episode-date ${index}'>
                        ${formatDate(movie.fields.release_date)}
                        </td>
                    </tr>`
        }).join('')

        const titles = `<tbody><tr><th>Flicks</th><th>Premiere</th></tr>
            ${tableElements}
            </tbody>`;

        const movieTable = document.querySelector('.movie-table');
        movieTable.innerHTML = titles;
    }
}

/** 
 * Converts the date
 * @param {string} valueFromDB - the date to convert
 */
function formatDate(valueFromDB) {
    return new Date(valueFromDB).toDateString();
}

/**
 * Sorts the table
 * @param {string} sortingType - defines how we want our table to be sorted: by the oldest or the newest 
 */
function sortTableByDate(sortingType) {
    const tableBody = document.querySelector(".movie-table tbody");
    const tableRows = Array.from(tableBody.querySelectorAll("tr")).slice(1);
    tableRows.sort((firstElem, nextElement) => {
        if (sortingType === 'old') {
            return new Date(firstElem.cells[1].innerText) - new Date(nextElement.cells[1].innerText);
        } else {
            return new Date(nextElement.cells[1].innerText) - new Date(firstElem.cells[1].innerText);
        }
    });

    tableRows.forEach(rowToAppend => {
        tableBody.appendChild(rowToAppend);
    });
}

/** 
 * Drives the interface according the stated action
 * @param {string} action - the action from the URL
 */
function handleUserActions(action) {
    const movieDisplayPage = document.querySelector('.movie-detailscontainer');
    const query = mainSearchParams.get('q');
    const url = 'https://star-wars-all-stars-default-rtdb.firebaseio.com/swapi/films/' + query + '.json'
    if (action === 'delete') {
        sendOrGetData(url, 'DELETE').catch(err => console.error(err))
    }
    const movieTableContainer = document.querySelector('.movietable-container');
    const mainTitle = document.querySelector('.maintitle');
    const saveButton = document.querySelector('.movie-detailsform-submitbutton');
    const editLink = document.querySelector('.movie-detailsform-editlink');
    const cancelLink = document.querySelector('.movie-detailsform-cancellink');
    const backLink = document.querySelector('.movie-detailsfrom-backlink');
    const deleteLink = document.querySelector('.movie-detailsform-deletelink');
    const confirmDeletionButton = document.querySelector('.deletion-modal-deletelink');
    const detailsTogglerButton = document.querySelector('.movie-detailsform-toggler');
    const deletionModal = document.querySelector('.deletion-modal');

    editLink.href = `?q=${query}&action=edit`;
    cancelLink.href = `?q=${query}&action=display`;
    confirmDeletionButton.href = `?q=${query}&action=delete`;
    backLink.href = DEFAULT_PAGE;

    if (action === 'create') {
        return showElements(rootContainer, movieTableContainer, movieDisplayPage, backLink, saveButton);
    }

    deleteLink.onclick = () => showElements(deletionModal);

    showElements(mainTitle, movieTableContainer, backLink);
    if (action === 'display') {
        sendOrGetData(url, 'GET').then(fetchedData => {
            showElements(movieDisplayPage, editLink);
            const { planets, characters } = fetchedData.fields
            if (planets && characters) {
                setOfPlanetsAndCharacters.planets = planets;
                setOfPlanetsAndCharacters.characters = characters;
                showElements(detailsTogglerButton);
            }
            handleInputsData(fetchedData, true);
        }).catch(err => {
            showElements(errorDisplay)
            console.error(err)
        })
    }
    if (action === 'edit') {
        sendOrGetData(url, 'GET').then(fetchedData => {
            showElements(movieDisplayPage, saveButton, cancelLink, deleteLink);
            handleInputsData(fetchedData, false);
        }).catch(err => {
            showElements(errorDisplay)
            console.error(err)
        })

    }
}

/**
 * Pastes or returns the needed data
 * @param {object} data - data we need to display in inputs of the html markup 
 * @param {boolean} disability - defines if the inputs are disabled or enabled to edit
 * @param {string} method - defines the action: paste or return the data
 */
function handleInputsData(data, disability, method) {
    const currentDate = new Date();
    const editForm = document.forms.editDetails;
    const [newButton, newTitle, newReleaseDate, newDirector, newCrawl, newProducer] = editForm;
    if (method === 'getTheValues') {
        return {
            fields: {
                director: editForm.director.value,
                edited: currentDate.toISOString(),
                opening_crawl: editForm.crawl.value,
                producer: editForm.producer.value,
                release_date: editForm.date.value,
                title: editForm.title.value,
            }
        }
    } else {
        const openingCrawl = data.fields.opening_crawl.replace(/[\n\r]+/gm, ' ');

        newTitle.value = data.fields.title;
        newTitle.disabled = disability;

        newReleaseDate.value = data.fields.release_date;
        newReleaseDate.disabled = disability;

        newDirector.value = data.fields.director;
        newDirector.disabled = disability;

        newCrawl.value = openingCrawl;
        newCrawl.disabled = disability;

        newProducer.value = data.fields.producer;
        newProducer.disabled = disability;
    }
}

/**
 * Sends the data to db to edit the data there
 * @param {Object} event - DOM event object
 */
function sendDetailsToDB(event) {
    event.preventDefault();
    const data = handleInputsData(null, null, 'getTheValues');
    const movieDetailsContainer = document.querySelector('.movie-detailscontainer');
    const editionNotification = document.querySelector('.movieedited-modal');
    const additionNotification = document.querySelector('.movieadded-modal');

    const query = mainSearchParams.get('q');
    showElements(movieDetailsContainer);
    if (mainSearchParams.get('action') === 'edit') {
        const urlToFetch = 'https://star-wars-all-stars-default-rtdb.firebaseio.com/swapi/films/' + query + '/.json';
        sendOrGetData(urlToFetch, "PATCH", data).then(() => {
            showElements(editionNotification);
        }).catch(err => {
            showElements(errorDisplay);
            console.error(err)
        });
    }
    if (mainSearchParams.get('action') === 'create') {
        const urlToFetch = 'https://star-wars-all-stars-default-rtdb.firebaseio.com/swapi/films.json'
        sendOrGetData(urlToFetch, "POST", data).then(() => {
            showElements(additionNotification);
        }).catch(err => {
            showElements(errorDisplay);
            console.error(err)
        });
    }
}

/** Shows characters or planets participated in the given movie */
function displayCharactersOrPlanets() {
    const detailsDisplaySection = document.querySelector('.movie-detailssidebar');
    const togglerButton = document.querySelector('.movie-detailsform-toggler');
    if (foundPlanetsAndCharacters.characters === undefined) {
        const urls = ['https://star-wars-all-stars-default-rtdb.firebaseio.com/swapi/people.json', 'https://star-wars-all-stars-default-rtdb.firebaseio.com/swapi/planets.json'];
        const requests = urls.map(url => sendOrGetData(url, 'GET'));
        Promise.all(requests)
            .then(responses => {
                togglerButton.innerHTML = 'Hide the list of characters and planets';
                const characters = setOfPlanetsAndCharacters.characters
                    .map(character_pk => responses[0].find(newCharacter => newCharacter.pk === character_pk));
                const planets = setOfPlanetsAndCharacters.planets
                    .map(planet_pk => responses[1].find(newPlanet => newPlanet.pk === planet_pk));
                return {
                    characters: characters,
                    planets: planets
                }
            })
            .then(charactersAndPlanetsFetchedHere => {
                foundPlanetsAndCharacters = charactersAndPlanetsFetchedHere;
                displayCharactersOrPlanets();
            })
    } else {
        if (detailsDisplaySection.classList.contains('hidden')) {
            togglerButton.innerText = '✖';
        } else {
            togglerButton.innerText = '►';
        }
        const charactersSectionElement = document.querySelector('.movie-detailssidebar-characters-block');
        const planetsSectionElement = document.querySelector('.movie-detailssidebar-planets-block');
        const characters = foundPlanetsAndCharacters.characters;
        const planets = foundPlanetsAndCharacters.planets;
        const charactersKeysArray = ['birth_year', 'eye_color', 'gender', 'hair_color', 'height', 'mass', 'skin_color'];
        const planetsKeysArray = ['climate', 'diameter', 'gravity', 'orbital_period', 'population', 'surface_water', 'terrain'];
        const paragraphs = ['<p>', '<p>', '<p>', '<p>', '<p>', '<p>', '<p>'];
        const charElemArray = paragraphs.map((paragraphOpenTag, currentIndex) => {
            return paragraphOpenTag + charactersKeysArray[currentIndex].replace('_', ' ') + ': '
        });
        const planElemArray = paragraphs.map((paragraphOpenTag, currentIndex) => {
            return paragraphOpenTag + planetsKeysArray[currentIndex].replace('_', ' ') + ': '
        });

        const characterList = characters.map(character => {
            return `<div class="characters__character">
                <button type="button" title="click to see comprehensive info about this character" class="character__button_expand" onclick="showElements('character_${character.fields.name.replace(' ', '')}__info')"><h4>${character.fields.name}</h4></button>
                <div class="character_${character.fields.name.replace(' ', '')}__info hidden" >
                ${charElemArray.map((firstHalfHTMLTag, currentIndex) => {
                return firstHalfHTMLTag + character.fields[charactersKeysArray[currentIndex]] + '</p>'
            }).join('')}
                </div>
            </div>`
        }).join('');

        const planetList = planets.map(planet => {
            return `<div class="planets__planet">
                <button type="button" title="click to see comprehensive info about this planet" class="planet__button_expand" onclick="showElements('planet_${planet.fields.name.replace(' ', '')}__info')"><h4>${planet.fields.name}</h4></button>
                <div class="planet_${planet.fields.name.replace(' ', '')}__info hidden" >
                ${planElemArray.map((firstHalfHTMLTag, currentIndex) => {
                return firstHalfHTMLTag + planet.fields[planetsKeysArray[currentIndex]] + '</p>'
            }).join('')}
                </div>
            </div>`
        }).join('');
        charactersSectionElement.innerHTML = characterList;
        planetsSectionElement.innerHTML = planetList;

        showElements(detailsDisplaySection);
    }
}

/**
 * Searches and displays a found movie if there's been one
 * @param {Object} event - DOM event object
 */
function searchAMovie(event) {
    event.preventDefault();
    const inputData = document.querySelector('.searchform-input').value
        .toLowerCase()
        .replace(/\s*/g, '');
    const movieFound = fetchedDataMain.findIndex(i => i.fields.title.toLowerCase().replace(/\s*/g, '') === inputData);

    const queryParam = fetchedDataMain[movieFound] || FAILED_QUERY_STRING
    query = `?q=${queryParam.id}&action=display`;

    window.location.href = DEFAULT_PAGE + query;
}

/**
 * Disables an interface's element's visibility
 * @param  {...any} args - classnames or dom nodes to toggle visibility of
 */
function hideElements(...args) {
    args.forEach(classOrElemToToggle => {
        if (typeof classOrElemToToggle === 'string') {
            classOrElemToToggle = document.querySelector(`.${classOrElemToToggle}`);
        }
        classOrElemToToggle.classList.toggle('hidden');
    })
};

/**
 * Enables an interface's element's visibility
 * @param  {...any} args - classnames or dom nodes to toggle visibility of
 */
function showElements(...args) {
    args.forEach(classOrElemToToggle => {
        if (typeof classOrElemToToggle === 'string') {
            classOrElemToToggle = document.querySelector(`.${classOrElemToToggle}`);
        }
        classOrElemToToggle.classList.toggle('hidden');
    })
};

/**
 * Toggles 'about' modal window open.
 */
function toggleAboutWindow() {
    const modalAboutWindow = document.querySelector('.about-modal-container');
    const shadow = document.querySelector('.about-modal-shadow')
    modalAboutWindow.classList.toggle('hidden');
    shadow.classList.toggle('hidden')
}