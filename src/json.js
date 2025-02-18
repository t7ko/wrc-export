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

function save_as_json(data) {
    const blob = new Blob([JSON.stringify(data, null, 4)], {type: "application/json"})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'wrc_data.json'
    a.click()
    URL.revokeObjectURL(url)
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

if (window.location.href.startsWith("https://racenet.com/ea_sports_wrc/")) {
    const data = {
        type: 'wrc_exporter',
        stages: [{
            name: '',
            results: [],
        }],
    }
    let stages = document.getElementsByClassName('swiper-horizontal')[1].getElementsByClassName('swiper-slide');
    let limit = stages.length;

    function parseTable(stage_id) {
        // console.log('parseTable', stage_id);
        if (!data.stages[stage_id].name) {
            data.stages[stage_id].name = current_stage();
        }

        const table = document.querySelector("table");
        const rows = table.querySelectorAll("tr");

        rows.forEach((row, index) => {
            if (index % 2 === 0) {
                return
            }

            const cells = row.querySelectorAll("td");
            if (cells.length === 8) {
                let d = parseRow(row);
                data.stages[stage_id].results.push(d);
            } else {
                if (index == 1) {
                    alert("Размер окна недостаточен для отображения всех данных в таблице");
                }
            }
        })

        const container = table.parentNode.parentNode;
        const footer = ( container.children.length == 5 ? container.children[4] : container.children[2] );
        if (footer.children.length == 3) { // means we have buttons
            const btn = footer.children[1].children[0].children[1];
            if (btn.style.opacity == 1) {
                btn.click(); // Go to next page
                setTimeout(function(){
                    parseTable(stage_id)
                }, 1000);
                return;
            } 
        }

        if (stage_id+1 < limit) {
            stages[stage_id+1].click() // Go to next stage
            data.stages.push({
                name: '',
                results: [],
            })
            setTimeout(function(){
                parseTable(stage_id+1);
            }, 1000)
            return
        }

        save_as_json(data);
    }

    console.log(current_stage());
    parseTable(0);
    
} else {
    console.error("Расширение работает только на сайте https://racenet.com/ea_sports_wrc/")
}
