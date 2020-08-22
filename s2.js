const url = "https://cors-anywhere.herokuapp.com/https://www.statecourts.gov.sg/cws/CriminalCase/_api/web/lists/getbytitle('CriminalCase')/items?$top=5000&$select=Location,Time_x0020_Of_x0020_Hearing,Date_x0020_Of_x0020_Hearing";
const resultDiv = document.getElementById("result");
const searchBox = document.getElementById("searchDate");
const searchButton = document.querySelector('button');
let courtsData;

searchButton.disabled = true;

fetch(url)
    .then(response => response.text())
    .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
    .then(data => data.getElementsByTagName("m:properties"))
    .then(nodelist => Array.from(nodelist).map(item => Array.from(item.childNodes).map(p => p.firstChild.textContent)))
    .then(data => {
        courtsData = data;
        searchButton.innerHTML = "Search";
        searchButton.disabled = false;
    });

function timeConvert(str) {
    if (str == "12.00 PM") return 12;
    if (str == "12.30 PM") return 12.5;
    const regex = /(\d{2})\.(\d{2})\s(\w{2})/;
    const matches = str.match(regex);
    const pm = matches[3] == "PM" ? 12 : 0;
    return parseInt(matches[1]) + pm + (parseInt(matches[2]) / 60);
}

function formatDate(str) {
    const s = str.split("-");
    return `${s[1]}/${s[2]}/${s[0]}`;
}

function sortCourts(a, b) {
    if (isNaN(a[0]) && isNaN(b[0])) {
        if (a < b) return -1;
        else if (b < a) return 1;
        else return 0;
    }
    else if (isNaN(a[0])) return 1;
    else if (isNaN(b[0])) return -1;
    const floorA = parseInt(a.match(/(\d+)[A-Z]/)[1]);
    const floorB = parseInt(b.match(/(\d+)[A-Z]/)[1]);
    if (floorA == floorB) return a.charCodeAt(a.length - 1) - b.charCodeAt(b.length - 1);
    else return floorA - floorB;
}

function getIDCount(courts) {
    return courts.length - courts.includes('4A')
                         - courts.includes('4B')
                         - courts.includes('PTC');
}

function search() {
    resultDiv.textContent = "";

    const inp = formatDate(searchBox.value);

    let resultsAM = {}, resultsPM = {};
    
    let filteredData = courtsData.filter(item => {
        const date = item[0].split(" ")[1];
        return date == inp;
    });

    resultDiv.innerHTML = `
        <h2>${filteredData[0][0]}</h2>
    `;
    
    for (let item of filteredData) {
        const date = item[0];
        const time = item[1];
        const timeConverted = timeConvert(time);

        let court = item[2];
        if (court == 'Court 22') court = '18C';
        else if (court.startsWith('Ch')) court = 'PTC';

        // AM
        if (timeConverted < 13) {
            if (court in resultsAM) {
                resultsAM[court].count++;
                if (timeConverted < resultsAM[court].earliestTime) {
                    resultsAM[court].earliestTime = timeConverted;
                    resultsAM[court].earliestTimeString = time;
                }
            } else {
                resultsAM[court] = {
                    count: 1,
                    earliestTime: timeConverted,
                    earliestTimeString: time
                }
            }
        }
        else {
            if (court in resultsPM) {
                resultsPM[court].count++;
                if (timeConverted < resultsPM[court].earliestTime) {
                    resultsPM[court].earliestTime = timeConverted;
                    resultsPM[court].earliestTimeString = time;
                }
            } else {
                resultsPM[court] = {
                    count: 1,
                    earliestTime: timeConverted,
                    earliestTimeString: time
                }
            }
        }
    };

    resultDiv.innerHTML += `<h3>Morning - ${getIDCount(Object.keys(resultsAM))} ID in system</h3>`;
    
    let tableAM = document.createElement('table'), tablePM = document.createElement('table');
    tableAM.className = 'table table-striped';
    tablePM.className = 'table table-striped';
    tableAM.innerHTML = `
    <thead class="thead-dark">
        <tr>
            <th scope="col">Court</th>
            <th scope="col">No. of Cases</th>
            <th scope="col">Earliest Case</th>
        </tr>
    </thead>
    `;
    tablePM.innerHTML = tableAM.innerHTML;
    
    let tableBodyAM = document.createElement('tbody');
    const keysAM = Object.keys(resultsAM).sort(sortCourts);
    tableBodyAM.innerHTML = keysAM.map(key => {
        let ts = resultsAM[key].earliestTimeString;
        if (resultsAM[key].earliestTime < 9.5) ts = `<span class="time-alert">${ts}</span>`;
        else if (resultsAM[key].earliestTime > 9.5) ts = `<span class="time-green">${ts}</span>`;
        return `
        <tr>
            <td scope="row">${key}</td>
            <td>${resultsAM[key].count}</td>
            <td>${ts}</td>
        </tr>
        `;
    }).join("\n");
    
    tableAM.appendChild(tableBodyAM);
    resultDiv.appendChild(tableAM);
    resultDiv.innerHTML += `<h3>Afternoon - ${getIDCount(Object.keys(resultsPM))} ID in system</h3>`;

    let tableBodyPM = document.createElement('tbody');
    const keysPM = Object.keys(resultsPM).sort(sortCourts);
    tableBodyPM.innerHTML = keysPM.map(key => {
        let ts = resultsPM[key].earliestTimeString;
        if (resultsPM[key].earliestTime < 14.5) ts = `<span class="time-alert">${ts}</span>`;
        else if (resultsPM[key].earliestTime > 14.5) ts = `<span class="time-green">${ts}</span>`;
        return `
        <tr>
            <td scope="row">${key}</td>
            <td>${resultsPM[key].count}</td>
            <td>${ts}</td>
        </tr>
        `;
    }).join("\n");
    
    tablePM.appendChild(tableBodyPM);
    resultDiv.appendChild(tablePM);
}
