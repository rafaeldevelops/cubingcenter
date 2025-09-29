// Elements
const scrambleEl = document.getElementById("scramble");
const timerEl = document.getElementById("timer");
const manualInput = document.getElementById("manualTimeInput");
const timesListEl = document.getElementById("times-list");
const ao5El = document.getElementById("ao5");
const ao12El = document.getElementById("ao12");
const bestAo5El = document.getElementById("bestAo5");
const bestAo12El = document.getElementById("bestAo12");
const bestSolveEl = document.getElementById("bestSolve");
const nextScrambleBtn = document.getElementById("nextScrambleBtn");
const inspectionBtn = document.getElementById("inspectionBtn");
const modeTimerBtn = document.getElementById("modeTimer");
const modeTypingBtn = document.getElementById("modeTyping");

// Tabs
document.querySelectorAll(".tab-button").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
    });
});

// Timer variables
let startTime = null, interval = null;
let running = false, holding = false, readyToStart = false, holdTimeout = null;
let times = JSON.parse(localStorage.getItem("cubingTimes") || "[]");
let inspectionMode = false, inspectionActive = false, inspectionInterval = null, inspectionTime = 0;
let typingMode = false;

// Scramble function
function generateScramble(len = 20){
    const faces = ["R","L","U","D","F","B"], suffix=["","'","2"];
    let scramble=[], last=null;
    for(let i=0;i<len;i++){
        let face;
        do { face = faces[Math.floor(Math.random()*faces.length)]; } while(face===last);
        last = face;
        scramble.push(face+suffix[Math.floor(Math.random()*suffix.length)]);
    }
    return scramble.join(" ");
}
scrambleEl.textContent = generateScramble();
nextScrambleBtn.addEventListener("click", ()=>{ scrambleEl.textContent = generateScramble(); });

// Formatting
function formatTime(t){
    if(t===null) return '-';
    if(t>=60){
        const m=Math.floor(t/60);
        const s=(t%60).toFixed(2).padStart(5,'0');
        return `${m}:${s}`;
    }
    return t.toFixed(2);
}
function parseTime(str){
    if(typeof str !== 'string') return Number(str);
    if(str.includes(":")){
        const parts = str.split(":");
        return parseFloat(parts[0])*60 + parseFloat(parts[1]);
    }
    return parseFloat(str);
}

// Times list
function saveTimes(){ localStorage.setItem('cubingTimes', JSON.stringify(times)); }
function updateTimesList(){
    timesListEl.innerHTML='';
    const reversed = [...times].reverse();
    reversed.forEach((t,i)=>{
        const div=document.createElement('div');
        div.className='time-item';
        const display = t.type==='dnf'?'DNF':formatTime(t.modified);
        div.innerHTML=`<span>${times.length-i}: ${display}</span>
            <div class="time-buttons">
                <button onclick="togglePlus2(${times.length-i-1})">+2</button>
                <button onclick="toggleDNF(${times.length-i-1})">DNF</button>
                <button onclick="deleteTime(${times.length-i-1})">🗑️</button>
            </div>`;
        timesListEl.appendChild(div);
    });
}
window.togglePlus2 = function(idx){
    const t = times[idx];
    if(t.type==='plus2'){ t.type='normal'; t.modified=t.original; }
    else { t.type='plus2'; t.modified=t.original+2; }
    saveTimes(); updateTimesList(); updateAverages(); updateGraph();
}
window.toggleDNF = function(idx){
    const t = times[idx];
    if(t.type==='dnf'){ t.type='normal'; t.modified=t.original; }
    else { t.type='dnf'; t.modified=t.original; }
    saveTimes(); updateTimesList(); updateAverages(); updateGraph();
}
window.deleteTime = function(idx){ times.splice(idx,1); saveTimes(); updateTimesList(); updateAverages(); updateGraph(); }

// Averages
function calculateAo(arr,n){
    if(arr.length<n) return '-';
    const lastN = arr.slice(-n);
    const dnfs = lastN.filter(t=>t.type==='dnf').length;
    if(dnfs>=2) return 'DNF';
    let vals = lastN.map(t=>t.type==='dnf'?1e9:t.modified);
    const sorted = [...vals].sort((a,b)=>a-b);
    let sum;
    if(n===5) sum = sorted.slice(1,4).reduce((a,b)=>a+b,0)/3;
    if(n===12) sum = sorted.slice(1,11).reduce((a,b)=>a+b,0)/10;
    return sum?formatTime(sum):'-';
}
function bestAoValue(arr,n){
    let best='-';
    for(let i=0;i<=arr.length-n;i++){
        const candidate = calculateAo(arr.slice(i,i+n), n);
        if(candidate!=='DNF' && (best==='-' || parseTime(candidate)<parseTime(best))) best=candidate;
    }
    return best;
}
function bestSolveValue(arr){
    if(arr.length===0) return '-';
    const nonDNF = arr.filter(t=>t.type!=='dnf');
    if(nonDNF.length===0) return 'DNF';
    const best = nonDNF.reduce((min,t)=>t.modified<min.modified?t:min, nonDNF[0]);
    return formatTime(best.modified);
}
function updateAverages(){
    ao5El.textContent=calculateAo(times,5);
    ao12El.textContent=calculateAo(times,12);
    bestAo5El.textContent=bestAoValue(times,5);
    bestAo12El.textContent=bestAoValue(times,12);
    bestSolveEl.textContent=bestSolveValue(times);
}

// Graph
const ctx = document.getElementById('timesGraph').getContext('2d');
let timesChart = new Chart(ctx,{
    type:'line',
    data:{ labels:[], datasets:[{data:[], borderColor:'#00ffcc', backgroundColor:'rgba(0,255,204,0.2)', fill:true, tension:0.3, pointRadius:0}]},
    options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ ticks:{display:false}, grid:{color:'rgba(255,255,255,0.1)'} }, y:{ beginAtZero:false, ticks:{color:'#fff'} }}}
});
function updateGraph(){
    timesChart.data.labels = times.map(_=>'');
    timesChart.data.datasets[0].data = times.map(t=>t.type==='dnf'?null:t.modified);
    timesChart.update();
}

// Initial
updateTimesList(); updateAverages(); updateGraph();

// Hide/Show Helpers
function hideEverythingElse(){
    document.querySelectorAll('#times-section, #averages-grid, .center-box, #scramble, #tabs, #graph-container').forEach(el=>el.style.display='none');
}
function showEverythingElse(){
    document.querySelectorAll('#times-section, #averages-grid, .center-box, #scramble, #tabs, #graph-container').forEach(el=>el.style.display='');
}
function resetTimerStyle(){
    timerEl.style.fontSize='5rem';
    timerEl.style.padding='20px 40px';
    timerEl.style.display='block';
    timerEl.style.justifyContent='';
    timerEl.style.alignItems='';
    timerEl.style.width='';
    timerEl.style.textAlign='';
    timerEl.className='white';
}

// Inspection
inspectionBtn.addEventListener("click", ()=>{
    inspectionMode = !inspectionMode;
    inspectionBtn.textContent = "Inspection: " + (inspectionMode ? "ON" : "OFF");
    if(inspectionMode) inspectionBtn.classList.add("active");
    else inspectionBtn.classList.remove("active");
});

function startInspectionOnce(){
    if(!inspectionMode || inspectionActive) return;
    inspectionActive = true;
    inspectionTime = 0;
    hideEverythingElse();
    timerEl.style.fontSize='14rem';
    timerEl.style.padding='80px 0';
    timerEl.style.display='flex';
    timerEl.style.justifyContent='center';
    timerEl.style.alignItems='center';
    timerEl.style.width='100%';
    timerEl.style.textAlign='center';
    timerEl.className='inspectionNumber';
    timerEl.style.background='none';
    timerEl.textContent='0';
    inspectionInterval = setInterval(()=>{
        inspectionTime++;
        timerEl.textContent = inspectionTime;
        if(inspectionTime===8 || inspectionTime===12) timerEl.style.color='red';
        else timerEl.style.color='yellow';
        if(inspectionTime>=15){
            clearInterval(inspectionInterval);
            inspectionActive=false;
            timerEl.style.color='white';
        }
    },1000);
}

// Hold Start/End
function holdStart(e){
    if(running || typingMode) return;
    if(!holding){
        holding = true;
        readyToStart = false;
        timerEl.className='redHold';
        holdTimeout = setTimeout(()=>{
            readyToStart = true;
            timerEl.className='greenHold';
        }, 550);
        if(inspectionMode && !inspectionActive) startInspectionOnce();
    }
    e.preventDefault();
}

function holdEnd(e){
    if(!running && holding){
        clearTimeout(holdTimeout);
        holding=false;
        if(readyToStart){
            readyToStart=false;
            if(inspectionActive){
                clearInterval(inspectionInterval);
                inspectionActive=false;
            }
            startTime = Date.now();
            interval = setInterval(()=>{
                const elapsed = (Date.now()-startTime)/1000;
                timerEl.textContent = formatTime(elapsed);
            },10);
            running=true;
            hideEverythingElse();
            timerEl.style.fontSize='14rem';
            timerEl.style.padding='80px 0';
            timerEl.style.display='flex';
            timerEl.style.justifyContent='center';
            timerEl.style.alignItems='center';
            timerEl.style.width='100%';
            timerEl.style.textAlign='center';
            timerEl.className='white';
        }
    }
    e.preventDefault();
}

// Stop timer without extra delay
function stopTimer(){
    if(running){
        // Calculate exact elapsed immediately
        const elapsed = (Date.now() - startTime)/1000;
        clearInterval(interval);
        running=false;

        times.push({original:elapsed, modified:elapsed, type:'normal'});
        saveTimes(); updateTimesList(); updateAverages(); updateGraph();

        resetTimerStyle();
        showEverythingElse();
    }
}

// Key/Mouse Events
document.addEventListener("keydown", e=>{ if(e.code==="Space") holdStart(e); });
document.addEventListener("keyup", e=>{
    if(e.code==="Space"){ 
        if(running) stopTimer();
        else holdEnd(e);
    }
});
timerEl.addEventListener("mousedown", holdStart);
timerEl.addEventListener("mouseup", e=>{
    if(running) stopTimer();
    else holdEnd(e);
});

// Typing Mode
modeTypingBtn.addEventListener("click",()=>{
    typingMode=true;
    modeTypingBtn.classList.add("active");
    modeTimerBtn.classList.remove("active");
    manualInput.style.display='block';
    timerEl.style.display='none';
    manualInput.focus();
});
modeTimerBtn.addEventListener("click",()=>{
    typingMode=false;
    modeTypingBtn.classList.remove("active");
    modeTimerBtn.classList.add("active");
    manualInput.style.display='none';
    timerEl.style.display='block';
});

// Manual typing input
manualInput.addEventListener("keypress", e=>{
    if(e.key==="Enter"){
        const val = manualInput.value.trim();
        if(!val) return;
        let timeVal;
        if(val.includes(".")) timeVal = parseFloat(val);
        else if(val.length<=2) timeVal = parseFloat(val)/100;
        else if(val.length>2){
            if(val.length<=4){
                const s = val.slice(-2);
                const sec = val.slice(0,-2);
                timeVal = parseFloat(sec)+parseFloat(s)/100;
            } else {
                const mins = val.slice(0,-4);
                const sec = val.slice(-4,-2);
                const hund = val.slice(-2);
                timeVal = parseFloat(mins)*60 + parseFloat(sec) + parseFloat(hund)/100;
            }
        }
        times.push({original:timeVal, modified:timeVal, type:'normal'});
        saveTimes(); updateTimesList(); updateAverages(); updateGraph();
        manualInput.value='';
    }
});
