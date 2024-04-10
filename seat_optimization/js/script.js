class Person {
    constructor(name, department, career) {
        this.name = name;
        this.department = department;
        this.career = career;
    }
}
class Table {
    constructor(capacity, seats = []) {
        this.capacity = capacity;
        this.seats = seats;
    }

    addPerson(person) {
        if (this.seats.length < this.capacity) {
            this.seats.push(person);
        } else {
            console.log("Table is full");
        }
    }
}
function updateParticipantCount() {
    const participantCount = document.querySelectorAll('.participant-input').length;
    document.getElementById("participantCount").textContent = `合計: ${participantCount}人`;
}

function addParticipant() {
    const participantsDiv = document.getElementById("participants");
    const newIndex = document.querySelectorAll('.participant-input').length + 1;
    const participantHTML = `
    <div class="participant-input input-group">
        名前: <input type="text" name="name${newIndex}" required>
        所属: <input type="text" name="department${newIndex}" required>
        年次: <input type="number" name="career${newIndex}" min="0" required>
        <button type="button" class="delete-button" onclick="this.parentNode.remove(); updateParticipantCount();">✕</button>
    </div>
    `;
    participantsDiv.insertAdjacentHTML('beforeend', participantHTML);
    updateParticipantCount();
}

function addPair(pairType) { // pairTypeは 'good' または 'bad' の文字列
    const pairsDiv = document.getElementById(`${pairType}Pairs`);
    const newIndex = document.querySelectorAll(`.${pairType}-pair-input`).length + 1;
    const pairHTML = `
        <div class="${pairType}-pair-input pair-group">
            名前1: <input type="text" name="${pairType}Name1_${newIndex}">
            名前2: <input type="text" name="${pairType}Name2_${newIndex}">
            <button type="button" class="delete-button" onclick="this.parentNode.remove();">✕</button>
        </div>
    `;
    pairsDiv.insertAdjacentHTML('beforeend', pairHTML);
}

// 親和性行列の生成
function generateAffinityMatrix(people, goodPairs, badPairs, mode) {
    const size = people.length;
    const matrix = Array.from({ length: size }, () => Array(size).fill(0));

    if (mode == "minimize_department") {
        department_cost = 10000;
        career_cost = 10;
    } else if (mode == "minimize_career") {
        department_cost = 10;
        career_cost = 10000;
    } else if (mode == "maximize") {
        department_cost = 60;
        career_cost = 60;
    }

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (i === j) continue; // 同一人物の比較をスキップ
            const person1 = people[i];
            const person2 = people[j];

            // 所属が異なる場合のスコア
            if (person1.department !== person2.department) {
                matrix[i][j] += department_cost;
            }

            // キャリアの差に応じたスコア
            const careerDiff = Math.abs(person1.career - person2.career);
            if (careerDiff >= 30) {
                matrix[i][j] += career_cost*1.0;
            } else if (careerDiff >= 20) {
                matrix[i][j] += career_cost*0.8;
            } else if (careerDiff >= 10) {
                matrix[i][j] += career_cost*0.6;
            } else if (careerDiff >= 5) {
                matrix[i][j] += career_cost*0.4;
            } else if (careerDiff >= 3) {
                matrix[i][j] += career_cost*0.2;
            } else if (careerDiff >= 1) {
                matrix[i][j] += career_cost*0.1;
            }
        }
    }
    // 仲の良いペアと仲の悪いペアに基づいてaffinity_matrixを更新
    goodPairs.forEach(pair => {
        const index1 = people.findIndex(person => person.name === pair[0]);
        const index2 = people.findIndex(person => person.name === pair[1]);
        if (index1 !== -1 && index2 !== -1) {
            matrix[index1][index2] = matrix[index2][index1] = -100; // 仲の良いペア
        }
    });

    badPairs.forEach(pair => {
        const index1 = people.findIndex(person => person.name === pair[0]);
        const index2 = people.findIndex(person => person.name === pair[1]);
        if (index1 !== -1 && index2 !== -1) {
            matrix[index1][index2] = matrix[index2][index1] = 100; // 仲の悪いペア
        }
    });

    return matrix;
}

// コスト計算関数の実装
function calculateCost(tables, affinityMatrix, people) {
    let totalCost = 0;

    tables.forEach(table => {
        table.seats.forEach((person, i) => {
            const nextIndex = (i + 1) % table.seats.length;
            const nextPerson = table.seats[nextIndex];
            const personIndex = people.indexOf(person);
            const nextPersonIndex = people.indexOf(nextPerson);

            // 隣同士の人物に対するコスト
            totalCost += 2 * affinityMatrix[personIndex][nextPersonIndex];

            // テーブル内の他の全員とのコスト
            for (let j = i + 1; j < table.seats.length; j++) {
                const otherPerson = table.seats[j];
                const otherPersonIndex = people.indexOf(otherPerson);
                totalCost += affinityMatrix[personIndex][otherPersonIndex];
            }
        });
    });

    return totalCost;
}

function createInitialSolution(people, tables) {
    // テーブルの新しいインスタンスを作成して、席をクリア
    let newTables = tables.map(table => new Table(table.capacity));

    // people配列のコピーをシャッフルする
    let shuffledPeople = [...people];
    for (let i = shuffledPeople.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPeople[i], shuffledPeople[j]] = [shuffledPeople[j], shuffledPeople[i]];
    }

    // シャッフルされたpeopleを新しいテーブルに割り当てる
    shuffledPeople.forEach(person => {
        const availableTable = newTables.find(table => table.seats.length < table.capacity);
        if (availableTable) {
            availableTable.addPerson(person);
        } else {
            console.error('All tables are full. Cannot add more people.');
        }
    });

    return newTables; // 修正されたテーブルの配列を返す
}

function simulatedAnnealing(initialSolution, affinityMatrix, people, iterations, initialTemp, coolingRate, mode) {
    let currentSolution = initialSolution.slice();
    let currentCost = calculateCost(currentSolution, affinityMatrix, people);
    let bestSolution = currentSolution.slice();
    let bestCost = currentCost;
    let temp = initialTemp;
    const startTime = Date.now(); // 計算開始時刻を記録

    for (let i = 0; i < iterations; i++) {
        // 現在時刻と開始時刻の差が10秒を超えたか確認
        if (Date.now() - startTime > 10000) {
            console.log('Time limit exceeded. Returning best solution found so far.');
            break; // ループを中断し、最良解を返す
        }

        let newSolution = generateNewSolution(currentSolution);
        let newCost = calculateCost(newSolution, affinityMatrix, people);

        if (mode === "random") {
            // ランダムモードの場合、最初に生成したランダム解をそのまま最適解として返す
            return { bestSolution: initialSolution, bestCost: calculateCost(initialSolution, affinityMatrix, people) };
        }

        let costDifference = newCost - currentCost;
        if (mode === "maximize") {
            costDifference = -costDifference; // コスト最大化の場合、コスト差の符号を反転
        }

        if (costDifference < 0 || Math.exp(-costDifference / temp) > Math.random()) {
            currentSolution = newSolution.slice();
            currentCost = newCost;

            // モードに応じて最適な解を更新
            if ((mode === ("minimize_department" || "minimize_career") && newCost < bestCost) || (mode === "maximize" && newCost > bestCost)) {
                bestSolution = newSolution.slice();
                bestCost = newCost;
            }
        }

        temp *= coolingRate;

    }
    if (mode === "maximize") {
        bestCost = -bestCost; // コスト最大化の場合、コストを正の値に変換
    }
    return { bestSolution, bestCost };
}

function generateNewSolution(currentSolution) {
    // 新しい解のスケルトンを作成
    let newSolution = currentSolution.map(table => new Table(table.capacity, table.seats.slice()));

    // 全席を平坦化した配列を作成
    let allSeats = [];
    newSolution.forEach((table, tableIndex) => {
        table.seats.forEach((seat, seatIndex) => {
            allSeats.push({tableIndex, seatIndex, person: seat});
        });
    });

    // 全席からランダムに2つの席を選ぶ
    if (allSeats.length > 1) {
        let index1 = Math.floor(Math.random() * allSeats.length);
        let index2 = Math.floor(Math.random() * allSeats.length);
        while (index1 === index2) {
            // 異なる席が選ばれるまで選び直し
            index2 = Math.floor(Math.random() * allSeats.length);
        }

        // 選んだ2つの席の人物を交換
        let seat1 = allSeats[index1];
        let seat2 = allSeats[index2];
        [newSolution[seat1.tableIndex].seats[seat1.seatIndex], newSolution[seat2.tableIndex].seats[seat2.seatIndex]] = [seat2.person, seat1.person];
    }

    return newSolution;
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("addParticipant").addEventListener("click", addParticipant);
    document.getElementById("addGoodPair").addEventListener("click", () => addPair('good'));
    document.getElementById("addBadPair").addEventListener("click", () => addPair('bad'));
    document.getElementById('clearResults').addEventListener('click', function(event) {
        event.preventDefault(); // ページ遷移を防止
        document.getElementById('result').innerHTML = ''; // 結果欄のみクリア
        this.style.display = 'none'; // クリアボタンを非表示にする
    });

    function collectPeopleData() {
        const people = [];
        document.querySelectorAll('.participant-input').forEach((participantDiv, index) => {
            const name = participantDiv.querySelector(`input[name="name${index + 1}"]`).value;
            const department = participantDiv.querySelector(`input[name="department${index + 1}"]`).value;
            const career = parseInt(participantDiv.querySelector(`input[name="career${index + 1}"]`).value, 10);
            people.push(new Person(name, department, career));
        });
        return people;
    }
    function collectGoodPairs() {
        const pairs = [];
        document.querySelectorAll('.good-pair-input').forEach(pairDiv => {
            const name1 = pairDiv.querySelector(`input[name^="goodName1"]`).value;
            const name2 = pairDiv.querySelector(`input[name^="goodName2"]`).value;
            if (name1 && name2) {
                pairs.push([name1, name2]);
            }
        });
        return pairs;
    }

    function collectBadPairs() {
        const pairs = [];
        document.querySelectorAll('.bad-pair-input').forEach(pairDiv => {
            const name1 = pairDiv.querySelector(`input[name^="badName1"]`).value;
            const name2 = pairDiv.querySelector(`input[name^="badName2"]`).value;
            if (name1 && name2) {
                pairs.push([name1, name2]);
            }
        });
        return pairs;
    }

    function collectTableData() {
        const numTables = parseInt(document.querySelector('input[name="num_tables"]').value, 10);
        const tableCapacities = document.querySelector('input[name="table_capacities"]').value.split(',').map(capacity => parseInt(capacity, 10));
        const tables = tableCapacities.map(capacity => new Table(capacity));
        return { tables, tableCapacities };
    }
    function displayResults(bestSolution, bestCost) {
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = ''; // Clear previous results

        bestSolution.forEach((table, index) => {
            const names = table.seats.map(person => person.name).join(', ');
            const tableDiv = document.createElement('div');
            tableDiv.textContent = `グループ ${index + 1}: ${names}`;
            resultDiv.appendChild(tableDiv);
        });

        const costDiv = document.createElement('div');
        costDiv.textContent = `仲良し度: ${-1*bestCost}`;
        resultDiv.appendChild(costDiv);

        // 結果が表示されたので、クリアボタンを表示
        document.getElementById('clearResults').style.display = 'inline-block';
    }

    document.getElementById('seatingForm').addEventListener('submit', function(event) {
        event.preventDefault();
        // フォーム送信時の処理
        const mode = document.getElementById('modeSelect').value; // モードの選択状態を取得
        const people = collectPeopleData();
        const goodPairs = collectGoodPairs();
        const badPairs = collectBadPairs();
        const { tables, tableCapacities } = collectTableData();
        // テーブルキャパシティの合計が参加者数より小さい場合、エラーメッセージを表示
        const totalCapacity = tableCapacities.reduce((acc, val) => acc + val, 0);

        if (totalCapacity < people.length) {
            resultDiv.innerHTML = 'エラー: グループの合計人数が参加者数より少ないです';
            return;
        }

        // 参加者の名前が重複しているときにエラーメッセージを表示
        const nameSet = new Set();
        people.forEach(person => nameSet.add(person.name));
        if (nameSet.size !== people.length) {
            resultDiv.innerHTML = 'エラー: 参加者の名前が重複しています';
            return;
        }

        // グループ数と各グループの人数の長さが一致しない場合、エラーメッセージを表示
        if (tables.length !== tableCapacities.length) {
            resultDiv.innerHTML = 'エラー: 各グループの人数を適切に指定してください';
            return;
        }
        const affinityMatrix = generateAffinityMatrix(people, goodPairs, badPairs, mode);
        // 結果欄に「計算中...」を表示
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = '';
        resultDiv.innerHTML = '計算中...';
        // 計算処理を非同期で実行する場合（例: setTimeoutを使用して非同期処理のシミュレート）
        setTimeout(() => {
            const initialSolution = createInitialSolution(people, tables);
            const { bestSolution, bestCost } = simulatedAnnealing(initialSolution, affinityMatrix, people, 5000000, 30.0, 0.999999, mode);
            // 結果の表示
            displayResults(bestSolution, bestCost);
        }, 0); // setTimeoutを使用する場合、実際のアプリケーションでは適切な非同期処理に置き換える
    });
});