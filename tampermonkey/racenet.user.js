// ==UserScript==
// @name         EA WRC Racenet Data Export
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Downloads results data from Racenet EA WRC Championship.
// @author       Ivan Tishchenko, Yandulov Andrey, Zatenatskiy Denis
// @match        https://racenet.com/ea_sports_wrc/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    function round(num) {
        return Math.round(num);
    }

    function roundToOneDecimal(num) {
        return Math.round(10 * num) / 10.0;
    }

    function showLongText(text) {
        const longText = text.replace(/\n/g, '<br>');

        // Create modal window
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.4)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';

        // Container for the text
        const box = document.createElement('div');
        box.style.background = 'white';
        box.style.padding = '20px';
        box.style.borderRadius = '8px';
        box.style.maxWidth = '90vw';
        box.style.maxHeight = '80vh';
        box.style.overflowY = 'auto';
        box.innerHTML = `<div style="white-space:pre-line; font-family:monospace;">${longText}</div>
            <button id="closeModalBtn" style="margin-top:20px;">Закрыть</button>`;

        modal.appendChild(box);
        document.body.appendChild(modal);

        // Close button
        document.getElementById('closeModalBtn').onclick = function() {
            modal.remove();
        };
    }


    function parseTimeToSeconds(timeString) {
        // Regular expression to match [HH:]MM:SS.ddd format
        const timeRegex = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})\.(\d{3})$/;

        const match = timeString.match(timeRegex);

        if (match) {
            const hours = match[1] ? parseInt(match[1], 10) : 0; // Hours are optional
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);
            const milliseconds = parseInt(match[4], 10);

            // Calculate total seconds as a float
            const totalSeconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;

            return totalSeconds;
        } else {
            // return NaN;
            throw new Error("Invalid time format");
        }
    }

    function current_stage() {
        let stages = document.getElementsByClassName('swiper-horizontal')[1].getElementsByClassName('swiper-slide')
        let name = '';
        for (let s of stages) {
            let style = s.children[0].style['background-color'];
            if (style == 'rgb(52, 113, 233)') {
                name = s.innerText;
                break;
            }
        }

        if (!name) {
            return 'S'
        }

        let n = parseInt(name.slice(1));
        if (isNaN(n)) {
            return ''
        }

        let prefix = 'S';
        if (n < 10) {
            prefix += '0';
        }

        return prefix + n.toString()
    }

    function toggleStageOverall(what) {
        if (what != "STAGE" && what != 'OVERALL') {
            throw new Error("Invalid parameters");
        }
        let stage_btn = document.evaluate("//*[text()='Stage' and contains(@class,'MuiTypography-root')]",
            document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        let overall_btn = document.evaluate("//*[text()='Overall' and contains(@class,'MuiTypography-root')]",
            document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        const isOverallTransparent = (overall_btn.parentNode.style.backgroundColor == "transparent");
        const isStageTransparent   = (stage_btn  .parentNode.style.backgroundColor == "transparent");

        if (isOverallTransparent == isStageTransparent) {
            return "FAIL";
        }

        const curr = ( isStageTransparent ? "OVERALL" : "STAGE" );

        if (what == "OVERALL") {
            if (curr != "OVERALL") {
                overall_btn.click();
                return "DONE";
            }
            return "ALREADY";
        }
        if (what == "STAGE") {
            if (curr != "STAGE") {
                stage_btn.click();
                return "DONE";
            }
            return "ALREADY";
        }
        return "FAIL";
    }

    function save_as_json(data) {
        const blob = new Blob([JSON.stringify(data, null, 4)], {type: "application/json"})
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'wrc_data.json'
        a.click()
        URL.revokeObjectURL(url)
    }

    function save_stage_as_csv(stage_data) {
        let csvContent = "Rank,DisplayName,Vehicle,Time,TimePenalty,DifferenceToFirst\n";

        stage_data.forEach((row) => {
            csvContent += [row.position, row.name, row.car, row.time,
                           row.penalty, row.timeDiff].join(",") + "\n"
        });

        const blob = new Blob([csvContent], {type: "text/csv;charset=utf-16;"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stage.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function save_round_as_csv(data) {
        let csvContent = "Stage,Rank,DisplayName,Vehicle,Time,TimePenalty,DifferenceToFirst,Distance,Speed\n";

        data.stages.forEach((stage) => {
            stage.results.forEach((row) => {
                csvContent += [stage.name,row.position, row.name, row.car,
                               row.time, row.penalty, row.timeDiff,
                               stage.length, row.speed
                               ].join(",") + "\n"
            })
        });

        const blob = new Blob([csvContent], {type: "text/csv;charset=utf-16;"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'round.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function show_event_summary(data) {
        let stagesText = "";
        let stagesHTML = "<table> <thead> <tr> <th>SS</th> <th>Name</th> <th>Length</th> <th>Weather</th> <th>Time of Day</th> <th>Service area</th> </tr> </thead> <tbody> ";
        // <tr> <td>Данные строки 1, ячейка 1</td> <td>Данные строки 1, ячейка 2</td> <td>Данные строки 1, ячейка 3</td> <td>Данные строки 1, ячейка 4</td> </tr> <tr> <td>Данные строки 2, ячейка 1</td> <td>Данные строки 2, ячейка 2</td> <td>Данные строки 2, ячейка 3</td> <td>Данные строки 2, ячейка 4</td> </tr> <tr> <td>Данные строки 3, ячейка 1</td> <td>Данные строки 3, ячейка 2</td> <td>Данные строки 3, ячейка 3</td> <td>Данные строки 3, ячейка 4</td> </tr> </tbody> </table>
        let serviceMap = '';

        let interimLen = 0;
        data.stages.slice(0, -1).forEach((stage) => {
            if (stage.serviceArea != 'None') {
                if (interimLen != 0) {
                    serviceMap += `${round(interimLen)}-`;
                }
                serviceMap += `${stage.serviceArea[0]}-`;
                interimLen = 0;
            }
            interimLen += stage.length;
            stagesText += `${stage.name}: ${stage.nameLabel}, ${stage.length}km, ${stage.weather}, ${stage.timeOfDay}`;
            if (stage.serviceArea != 'None') {
                stagesText += `, ${stage.serviceArea} service`;
            }
            stagesText += `\n`;
            stagesHTML += `<tr> <td>${stage.name} </td> <td>/ ${stage.nameLabel}</td> <td> / ${stage.length}km</td> <td>/ ${stage.weather}</td> <td>/ ${stage.timeOfDay}</td> <td>/ ${ stage.serviceArea == 'None' ? '-' : stage.serviceArea }</tr> `;
        });
        serviceMap += `${round(interimLen)}`;

        stagesHTML += " </tbody> </table>";

        showLongText(`
            Event summary:

            ${data.stages.length - 1} stages, total length ${data.stages.at(-1).length}km.

            Service Map: ${serviceMap}

            ${stagesHTML}
        `);
    }

    function parseRow(row) {
        const cells = row.querySelectorAll("td");

        return {
            'position': parseInt(cells[0].querySelector("p").innerText.trim().split('.')[0]),
            'name': cells[1].querySelector("p").innerText.trim().replace(/\*$/, ''),
            'car': cells[2].querySelector("p").innerText.trim(),
            'penalty': cells[4].querySelector("p").innerText.trim(),
            'time': cells[5].querySelector("p").innerText.trim(),
            'timeDiff': cells[6].querySelector("p").innerText.trim(),
        }
    }

    function getResultsTableElement() {
        return document.querySelector("table");
    }

    function getResultsTablePaginationButton(which) { // "PREV" or "NEXT"
        if (which != "NEXT" && which != "PREV") {
            throw new Error("Invalid parameters");
        }
        const n = ( which == "NEXT" ? 1 : 0 );
        const container = getResultsTableElement().parentNode.parentNode;
        const footer = ( container.children.length == 5 ? container.children[4] : container.children[2] );
        if (footer.children.length == 3) { // means we have buttons
            return footer.children[1].children[0].children[n];
        }
        return null;
    }

    function downloadData(format) {

        if (   format != 'round_json' && format != 'stage_csv'
            && format != 'round_csv'  && format != 'event_summary') {
            throw new Error("Invalid parameters");
        }

        const data = {
            type: 'wrc_exporter',
            stages: [{
                name: '',
                results: [],
            }],
        }
        let stages = document.getElementsByClassName('swiper-horizontal')[1].getElementsByClassName('swiper-slide');
        let limit = stages.length;

        if (format != 'stage_csv') {
            // go to first stage and from overall to per-stage display

            // make sure we re on STAGE not OVERALL mode
            const res1 = toggleStageOverall("STAGE");
            if (res1 == "FAIL") {
                alert("Racenet поменял структуру страницы, скрипт требуется обновить.");
                return;
            }
            if (res1 == "DONE") {
                setTimeout(function(){
                    downloadData(format);
                }, 1000);
                return;
            }

            // make sure we're on first stage
            const firstStageButtonBG = stages[0].children[0].style.backgroundColor;
            if (firstStageButtonBG == "rgb(29, 32, 51)") {
                // not yet selected -- click it
                stages[0].click();
                setTimeout(function(){
                    downloadData(format);
                }, 1000);
                return;
            } else if (firstStageButtonBG == "rgb(52, 113, 233)") {
                // pass through -- already selected
            } else {
                alert("Racenet поменял структуру страницы, скрипт требуется обновить.");
                return;
            }
        }

        if (format != "event_summary") {
            // make sure we're on first page in results table
            const btn = getResultsTablePaginationButton("PREV");
            if (btn) {
                if (btn.style.opacity == 1) {
                    btn.click(); // Go to previous page, till we hit first
                    setTimeout(function(){
                        downloadData(format);
                    }, 1000);
                    return;
                }
            }
        }

        function parseTable(stage_id, is_totals) {
            if (!data.stages[stage_id].name) {
                data.stages[stage_id].name = current_stage();
            }

            const table = getResultsTableElement();
            const rows = table.querySelectorAll("tr");

            let len = 0;
            if (!is_totals) {
                // stage details
                // find stage length on the page
                const lengthLabel = document.evaluate('//p[text()="Length:"]',
                        document, null, XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null).singleNodeValue;
                const lengthP = lengthLabel.nextElementSibling.nextElementSibling;
                len = lengthP.innerHTML.trim().split('\n')[0].trim();
                if (!len.endsWith('km')) {
                    alert("Racenet поменял структуру страницы, скрипт требуется обновить. Длина допов и скорость не будет включена в экспорт.")
                    len = 0;
                } else {
                    len = len.slice(0, -2).trim();
                    len = parseFloat(len);
                    data.stages[stage_id].length = len;
                }
                const stageName = lengthLabel.parentNode.parentNode.previousElementSibling.previousElementSibling;
                data.stages[stage_id].nameLabel = stageName.innerText.replace(/^\d+\s*-\s*/, '');

                const weatherP = lengthP.parentNode.nextElementSibling.nextElementSibling.children[2];
                data.stages[stage_id].weather = weatherP.innerText;

                const timeOfDayP = weatherP.parentNode.nextElementSibling.nextElementSibling.children[2];
                data.stages[stage_id].timeOfDay = timeOfDayP.innerText;

                const serviceAreaP = timeOfDayP.parentNode.nextElementSibling.nextElementSibling.children[2];
                data.stages[stage_id].serviceArea = serviceAreaP.innerText;
            } else {
                // calculate total length sum over all stages
                for (let i = 0; i < data.stages.length - 1; i++) {
                    len += data.stages[i].length;
                }
                data.stages[stage_id].length = roundToOneDecimal(len);
            }

            if (format != 'event_summary') {
                rows.forEach((row, index) => {
                    if (index % 2 === 0) {
                        return
                    }

                    let go_to_position_btn = document.evaluate(".//button[text()='Go To Position']",
                        row, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (go_to_position_btn == null) {
                        const cells = row.querySelectorAll("td");
                        if (cells.length === 8) {
                            let d = parseRow(row);
                            d.speed = roundToOneDecimal(len / (parseTimeToSeconds(d.time)/3600.0));
                            data.stages[stage_id].results.push(d);
                        } else {
                            if (index == 1) {
                                if (!parseTable.screenSizeWarningShownOnce) {
                                    alert("Размер окна недостаточен для отображения всех данных в таблице");
                                    parseTable.screenSizeWarningShownOnce = true;
                                }
                            }
                        }
                    }
                });
            }

            if (format != 'event_summary') {
                // see if we have next page with results
                const btn = getResultsTablePaginationButton("NEXT");
                if (btn) { // means we have buttons
                    if (btn.style.opacity == 1) {
                        btn.click(); // Go to next page
                        setTimeout(function(){
                            parseTable(stage_id, is_totals)
                        }, 1000);
                        return;
                    }
                }
            }

            if (stage_id+1 < limit) {
                if (format == 'round_json' || format == 'round_csv' || format == 'event_summary') {
                    // Go to next stage
                    stages[stage_id+1].click()
                    data.stages.push({
                        name: '',
                        results: [],
                    })
                    setTimeout(function(){
                        parseTable(stage_id+1, false);
                    }, 1000)
                    return
                } else if (format == 'stage_csv') {
                    // just dump the current data as csv
                    save_stage_as_csv(data.stages[0].results);
                    return;
                } else {
                    throw new Error("Invalid parameters");
                }
            } else {
                // download totals
                const res = toggleStageOverall("OVERALL");
                if (res == "DONE") {
                    data.stages.push({
                        name: 'overall',
                        results: [],
                    });
                    setTimeout(function(){
                        parseTable(stage_id+1, true);
                    }, 1000);
                    return;
                } else if (res == "FAIL") {
                    alert("Racenet поменял структуру страницы, скрипт требуется обновить. Overall не будет включён в экспорт.");
                } else if (res == "ALREADY") {
                    // pass through
                }
            }

            if (format == 'round_json') {
                save_as_json(data);
            } else if (format == 'round_csv') {
                save_round_as_csv(data);
            } else if (format == 'event_summary') {
                show_event_summary(data);
            } else {
                throw new Error("Invalid parameters");
            }
        }

        console.log(current_stage());
        parseTable(0, false);
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    // UI

    // Create the overlay panel
    const panel = document.createElement('div');
    panel.id = 'myOverlayPanel';
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    panel.style.padding = '10px';
    panel.style.border = '1px solid #ccc';
    panel.style.zIndex = '9999';

    // Create the buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'none'; // Initially hidden

    const button1 = document.createElement('button');
    button1.textContent = 'JSON of all Stages';
    button1.style.marginRight = '10px';
    button1.addEventListener('click', () => {
        downloadData('round_json');
    });

    const button2 = document.createElement('button');
    button2.textContent = 'Event Summary';
    button2.style.marginRight = '10px';
    button2.addEventListener('click', () => {
        downloadData('event_summary');
    });

    const button3 = document.createElement('button');
    button3.textContent = 'CSV of Current Stage';
    button3.style.marginRight = '10px';
    button3.addEventListener('click', () => {
        downloadData('stage_csv');
    });

    const button4 = document.createElement('button');
    button4.textContent = 'CSV of All Stages';
    button4.style.marginRight = '10px';
    button4.addEventListener('click', () => {
        downloadData('round_csv');
    });

    const button_hide = document.createElement('button');
    button_hide.textContent = 'Hide';

    // Create the unminimize button
    const unminimizeButton = document.createElement('button');
    unminimizeButton.textContent = 'DL';
    unminimizeButton.addEventListener('click', () => {
        panel.style.width = 'auto';
        panel.style.height = 'auto';
        buttonsContainer.style.display = 'flex';
        unminimizeButton.style.display = 'none';
    });

    // Append buttons to the container
    buttonsContainer.appendChild(button1);
    buttonsContainer.appendChild(button2);
    buttonsContainer.appendChild(button3);
    buttonsContainer.appendChild(button4);
    buttonsContainer.appendChild(button_hide);

    // Append the container and unminimize button to the panel
    panel.appendChild(buttonsContainer);
    panel.appendChild(unminimizeButton);

    // Append the panel to the body
    document.body.appendChild(panel);

    // Minimize the panel by default
    panel.style.width = '50px';
    panel.style.height = '20px';

    // Add minimize functionality
    function hide_panel(event) {
        if (event.target !== unminimizeButton && buttonsContainer.style.display !== 'none') {
            panel.style.width = '50px'; // Minimize width
            panel.style.height = '20px'; // Minimize height
            buttonsContainer.style.display = 'none';
            unminimizeButton.style.display = 'block';
        }
    }

    panel.addEventListener('click', hide_panel);
    button_hide.addEventListener('click', hide_panel);

    // Add some styling using GM_addStyle
    GM_addStyle(`
        #myOverlayPanel button {
            padding: 8px 12px;
            background-color: #4CAF50;
            color: white;
            border: none;
            cursor: pointer;
        }

        #myOverlayPanel button:hover {
            background-color: #3e8e41;
        }
    `);
})();
