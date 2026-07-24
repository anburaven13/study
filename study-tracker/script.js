let supabaseClient = null;

if (typeof supabase !== 'undefined') {
    const { createClient } = supabase;
    supabaseClient = createClient(
        "https://gvauqjavaszfdzuhkwuq.supabase.co",
        "sb_publishable_6yhOFp0a_MfJxxTk3YGmhw_ffZtFbuw"
    );
}

// ==================== GOAL SYSTEM ====================
const GOALS = {
    // ========== ICSE (HARDER) ==========
    "ICSE_7": {
        name: "ICSE Class 7",
        targetHours: 10,
        dailyTarget: 5,
        scoreMultiplier: 0.95,
        description: "7th standard ICSE foundation",
        recommendedTime: "1.5-2 hours per subject"
    },
    "ICSE_8": {
        name: "ICSE Class 8",
        targetHours: 12,
        dailyTarget: 6,
        scoreMultiplier: 1.0,
        description: "8th standard ICSE curriculum",
        recommendedTime: "2-2.5 hours per subject"
    },
    "ICSE_9": {
        name: "ICSE Class 9",
        targetHours: 14,
        dailyTarget: 7,
        scoreMultiplier: 1.05,
        description: "9th standard pre-board ICSE",
        recommendedTime: "2.5-3 hours per subject"
    },
    "ICSE_10": {
        name: "ICSE Class 10",
        targetHours: 16,
        dailyTarget: 8,
        scoreMultiplier: 1.10,
        description: "10th standard board ICSE (HARDER)",
        recommendedTime: "3-3.5 hours per subject"
    },

    // ========== CBSE (EASIER) ==========
    "CBSE_7": {
        name: "CBSE Class 7",
        targetHours: 8,
        dailyTarget: 4,
        scoreMultiplier: 0.85,
        description: "7th standard CBSE foundation",
        recommendedTime: "1-1.5 hours per subject"
    },
    "CBSE_8": {
        name: "CBSE Class 8",
        targetHours: 10,
        dailyTarget: 5,
        scoreMultiplier: 0.90,
        description: "8th standard CBSE curriculum",
        recommendedTime: "1.5-2 hours per subject"
    },
    "CBSE_9": {
        name: "CBSE Class 9",
        targetHours: 12,
        dailyTarget: 6,
        scoreMultiplier: 0.95,
        description: "9th standard pre-board CBSE",
        recommendedTime: "2-2.5 hours per subject"
    },
    "CBSE_10": {
        name: "CBSE Class 10",
        targetHours: 14,
        dailyTarget: 7,
        scoreMultiplier: 1.0,
        description: "10th standard board CBSE (EASIER)",
        recommendedTime: "2.5-3 hours per subject"
    },

    // ========== CBSE SENIOR (CLASS 11-12) ==========
    "CBSE_11": {
        name: "CBSE Class 11",
        targetHours: 16,
        dailyTarget: 10,
        scoreMultiplier: 1.15,
        description: "11th standard foundation building",
        recommendedTime: "3-4 hours per subject"
    },
    "CBSE_12": {
        name: "CBSE Class 12",
        targetHours: 18,
        dailyTarget: 12,
        scoreMultiplier: 1.25,
        description: "12th standard final exams",
        recommendedTime: "3.5-4 hours per subject"
    },

    // ========== COMPETITIVE EXAMS ==========
    "JEE_MAINS": {
        name: "JEE Mains",
        targetHours: 20,
        dailyTarget: 14,
        scoreMultiplier: 1.40,
        description: "Engineering entrance exam",
        recommendedTime: "4-5 hours per subject"
    },
    "JEE_ADVANCED": {
        name: "JEE Advanced",
        targetHours: 22,
        dailyTarget: 15,
        scoreMultiplier: 1.60,
        description: "Elite IIT preparation",
        recommendedTime: "5-6 hours per subject"
    }
};

// ==================== USER STATE ====================
async function getCurrentUser() {
    try {
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) return null;
        return data?.user || null;
    } catch (e) {
        console.warn('Auth check failed silently:', e.message);
        return null;
    }
}

async function getCurrentGoal() {
    try {
        let user = await getCurrentUser();
        if (user && user.user_metadata && user.user_metadata.goal) {
            return GOALS[user.user_metadata.goal];
        }
    } catch (e) {
        console.warn('Goal fetch failed silently:', e.message);
    }
    return null;
}

async function setGoal(goalId) {
    try {
        const { data, error } = await supabaseClient.auth.updateUser({
            data: { goal: goalId }
        });
        if (error) console.warn("Error setting goal:", error.message);
    } catch (e) {
        console.warn('setGoal failed silently:', e.message);
    }
}

// ==================== DATA SAVING ====================
async function saveData(study, insta, other, score, subject) {
    const user = await getCurrentUser();
    if (!user) return;

    const { error } = await supabaseClient
        .from("log")
        .insert([{
            study: study,
            insta: insta,
            other: other,
            score: score,
            subject: subject,
            user_id: user.id
        }]);

    if (error) {
        console.error("Error saving data:", error);
        alert("Error saving data!");
    } else {
        alert("Saved!");
    }
}

// ==================== SCORING SYSTEM ====================
async function calculate() {
    let study = parseFloat(document.getElementById("study").value) || 0;
    let insta = parseFloat(document.getElementById("insta").value) || 0;
    let other = parseFloat(document.getElementById("other").value) || 0;
    let subject = document.getElementById("subject").value;

    let total = study + insta + other;
    let baseScore = total > 0 ? (study / total) * 100 : 0;
    
    let goal = await getCurrentGoal();
    let multiplier = goal ? goal.scoreMultiplier : 1.0;
    let finalScore = Math.min(baseScore * multiplier, 100);

    await saveData(study, insta, other, finalScore, subject);

    let suggestions = getSuggestion({
        study, insta, other, subject, score: finalScore, goal: goal
    });

    let logsData = [];
    const user = await getCurrentUser();
    if (user) {
        const { data } = await supabaseClient
            .from("log")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5);
        logsData = data || [];
    }

    // Get AI tips from backend
    let aiTips = [];
    try {
        const response = await fetch("https://study-yxi5.onrender.com/ai", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                study: study,
                insta: insta,
                other: other,
                score: finalScore,
                subject: subject,
                goal: goal ? goal.name : 'General',
                logs: logsData || []
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.tips && Array.isArray(data.tips)) {
                aiTips = data.tips.slice(0, 5);
            } else {
                throw new Error('Invalid response format');
            }
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('AI API error:', error);
        aiTips = [`⚠️ AI Service Error: ${error.message}`, "Please try again in a few moments or check if the backend is running."];
    }

    let output = '<div class="result-box">';
    output += '<p class="score-display">SCORE: ' + finalScore.toFixed(1) + '%</p>';
    
    suggestions.forEach(s => {
        output += '<p class="suggestion">' + s + '</p>';
    });
    
    output += '<div class="ai-tips"><h3>AI STUDY TIPS:</h3>';
    aiTips.forEach(tip => {
        output += '<p class="ai-tip">' + tip + '</p>';
    });
    output += '</div></div>';

    document.getElementById("result").innerHTML = output;
}

// ==================== LOADING DATA ====================
async function loadHistory() {
    const user = await getCurrentUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from("log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    let html = "";

    if (!data || data.length === 0) {
        document.getElementById("history").innerHTML = "<p class='empty-msg'>No data yet. Start tracking!</p>";
        return;
    }

    data.forEach(d => {
        const bar = createBar(d.score);
        const dateStr = new Date(d.created_at).toISOString().split('T')[0];
        html += '<div class="history-item"><strong>' + dateStr + ' | ' + (d.subject || 'N/A') + '</strong><span class="score-badge">' + d.score.toFixed(1) + '%</span>' + bar + '</div>';
    });

    document.getElementById("history").innerHTML = html;
}

function createBar(score) {
    const color = score >= 85 ? '#10b981' : score >= 70 ? '#eab308' : '#ef4444';
    return '<div class="mini-bar"><div style="width: ' + Math.min(score, 100) + '%; height: 100%; background: ' + color + '; border-radius: 2px;"></div></div>';
}

async function loadDashboard() {
    let user = await getCurrentUser();
    let goal = await getCurrentGoal();

    if (!user) return;

    const { data, error } = await supabaseClient
        .from("log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

    if (goal) {
        document.getElementById("currentGoal").innerText = "GOAL: " + goal.name + " | " + goal.recommendedTime;
    }

    if (!data || data.length === 0) {
        document.getElementById("todayScore").innerText = "Today's Score: No data";
        return;
    }

    let last = data[data.length - 1];
    document.getElementById("todayScore").innerText = "Today's Score: " + last.score.toFixed(1) + "%";

    document.getElementById("progressBar").style.width = Math.min(last.score, 100) + "%";
    
    const color = last.score >= 85 ? '#10b981' : last.score >= 70 ? '#eab308' : '#ef4444';
    document.getElementById("progressBar").style.background = color;

    let goalMsg = "";
    if (goal) {
        let goalTarget = goal.dailyTarget * goal.scoreMultiplier;
        if (last.score >= 90) {
            goalMsg = "EXCELLENT: Exceeded target!";
        } else if (last.score >= goalTarget) {
            goalMsg = "TARGET MET: Great job!";
        } else {
            goalMsg = "Daily Target: " + goalTarget.toFixed(0) + "% | Need " + (goalTarget - last.score).toFixed(1) + "% more";
        }
    }
    document.getElementById("goalMsg").innerText = goalMsg;

    let streak = 1;
    for (let i = data.length - 2; i >= 0; i--) {
        if (data[i].score >= 70) streak++;
        else break;
    }
    document.getElementById("streak").innerText = "STREAK: " + streak + " days";

    let last7 = data.slice(-7);
    let avgScore = last7.reduce((a, b) => a + b.score, 0) / last7.length;
    document.getElementById("weeklyAvg").innerText = "Weekly Avg: " + avgScore.toFixed(1) + "%";

    // Load Tasks
    loadTasks();
}

// ==================== TASK MANAGER ====================
let tasks = [];

function loadTasks() {
    const savedTasks = localStorage.getItem('studyTasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
    renderTasks();
}

function saveTasks() {
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    if (!taskList) return; // Only render if on dashboard

    taskList.innerHTML = '';

    tasks.forEach((task, index) => {
        const li = document.createElement('li');

        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.onchange = () => toggleTask(index);

        const taskText = document.createElement('span');
        taskText.className = 'task-text' + (task.completed ? ' completed' : '');
        taskText.textContent = task.text; // Safe from XSS

        taskContent.appendChild(checkbox);
        taskContent.appendChild(taskText);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-task-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = () => deleteTask(index);

        li.appendChild(taskContent);
        li.appendChild(deleteBtn);

        taskList.appendChild(li);
    });
}

function addTask() {
    const input = document.getElementById('taskInput');
    const text = input.value.trim();

    if (text) {
        tasks.push({ text: text, completed: false });
        input.value = '';
        saveTasks();
        renderTasks();
    }
}

function toggleTask(index) {
    tasks[index].completed = !tasks[index].completed;
    saveTasks();
    renderTasks();
}

function deleteTask(index) {
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
}

// Allow pressing Enter to add task
document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTask();
            }
        });
    }
});

async function loadChart() {
    let user = await getCurrentUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from("log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

    if (!data || data.length === 0) return;

    let labels = data.map(d => new Date(d.created_at).toISOString().split('T')[0]);
    let scores = data.map(d => d.score);

    const ctx = document.getElementById('myChart');
    
    if (ctx && typeof Chart !== 'undefined') {
        try {
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Daily Score %',
                        data: scores,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: '#fff',
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            labels: { color: '#fff', font: { size: 14, weight: 'bold' } }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { color: '#fff', font: { size: 12 } },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                        },
                        x: {
                            ticks: { color: '#fff', font: { size: 12 } },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                        }
                    }
                }
            });
        } catch(e) {
            console.error('Chart error:', e);
        }
    }
}

// ==================== AUTH FUNCTIONS ====================
async function login() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) alert(error.message);
    else window.location.href = "dashboard.html";
}

async function signup() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Fill in all fields!");
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        alert(error.message);
    } else {
        alert("Account created!");
        window.location.href = "goals.html";
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
}

async function checkAuth() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            window.location.href = "index.html";
        }
    } catch (e) {
        window.location.href = "index.html";
    }
}

async function selectGoal(goalId) {
    await setGoal(goalId);
    window.location.href = "dashboard.html";
}


// ==================== SUGGESTIONS ====================
function getSuggestion(data) {
    let { study, insta, other, subject, score, goal } = data;
    let suggestions = [];

    if (insta + other > study) {
        suggestions.push("ALERT: Distraction > Study. Cut phone usage!");
    }

    let minStudy = goal ? goal.dailyTarget : 6;
    if (study < minStudy) {
        suggestions.push("NOTICE: Study " + minStudy + "+ hours for your goal.");
    }

    if (score >= 85) {
        suggestions.push("EXCELLENT: Outstanding performance!");
    } else if (score >= 70) {
        suggestions.push("GOOD: Keep pushing!");
    } else {
        suggestions.push("WARNING: Increase focus, reduce distractions.");
    }

    if (subject === "Math") {
        suggestions.push("MATH: Practice 15+ problems daily.");
    }
    if (subject === "Physics") {
        suggestions.push("PHYSICS: Numericals + concepts equally.");
    }
    if (subject === "Chemistry") {
        suggestions.push("CHEMISTRY: Reactions & formulas mastery.");
    }
    if (subject === "Biology") {
        suggestions.push("BIOLOGY: Diagrams + theory balance.");
    }
    if (subject === "English") {
        suggestions.push("ENGLISH: Read daily, write essays.");
    }
    if (subject === "History") {
        suggestions.push("HISTORY: Timeline + context important.");
    }
    if (subject === "Geography") {
        suggestions.push("GEOGRAPHY: Maps + data analysis key.");
    }

    return suggestions;
}

function getAISuggestions(data) {
    let { study, insta, other, subject, score, goal } = data;
    let aiTips = [];
    
    if (study === 0) {
        aiTips.push("START: Begin with 30-min Pomodoro session!");
        aiTips.push("FOCUS: Use Pomodoro. 25min work, 5min break.");
    } else if (study < 3) {
        aiTips.push("INCREASE: Study longer today. Build momentum!");
        aiTips.push("BREAK: Take 5min breaks every 50 mins.");
    } else if (study < 6) {
        aiTips.push("GOOD: Active recall + spaced repetition.");
        aiTips.push("HYDRATE: Drink water every hour!");
    } else {
        aiTips.push("AMAZING: You're crushing it! Keep going!");
        aiTips.push("LEVEL UP: Teach concepts to others.");
    }

    if (goal) {
        let goalName = goal.name;
        if (goalName.includes("ICSE")) {
            aiTips.push("ICSE: Concept clarity crucial. Practice variations!");
            aiTips.push("TIME: " + goal.recommendedTime + " per subject recommended.");
        } else if (goalName.includes("CBSE")) {
            if (goalName.includes("10")) {
                aiTips.push("CBSE: Focus on NCERT. Board exam patterns.");
            } else if (goalName.includes("11") || goalName.includes("12")) {
                aiTips.push("BOARD: Revision + past papers essential.");
                aiTips.push("TIME: " + goal.recommendedTime + " per subject.");
            } else {
                aiTips.push("CBSE: Strong fundamentals foundation.");
            }
        } else if (goalName.includes("JEE")) {
            if (goalName.includes("Mains")) {
                aiTips.push("JEE: Previous year papers daily practice!");
            } else {
                aiTips.push("JEE ADVANCED: Elite level. Problem solving!");
            }
            aiTips.push("TIME: " + goal.recommendedTime + " per subject.");
        }
    }

    if (insta + other > 2) {
        aiTips.push("DISTRACTION: App blockers during study hours!");
    }

    if (score >= 85) {
        aiTips.push("MOMENTUM: Maintain this streak!");
    } else if (score < 50) {
        aiTips.push("RESET: Small daily progress wins!");
    }

    return aiTips.slice(0, 5);
}



// Auto-load on page load
window.addEventListener('DOMContentLoaded', function() {
    let path = window.location.pathname;
    if (path.includes('dashboard.html')) {
        loadDashboard();
        setTimeout(loadChart, 100);
    } else if (path.includes('history.html')) {
        loadHistory();
        setTimeout(loadChart, 100);
    }
    
    // Temporarily disable auth check
    // let user = getCurrentUser();
    // if (!user && !path.includes('index.html') && !path.includes('goals.html')) {
    //     window.location.href = 'index.html';
    // }
});

