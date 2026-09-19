let currentTab = 'chaos';
const canvas = document.getElementById('physicsCanvas');
const ctx = canvas.getContext('2d');

let state = {};
let animationId = null;

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.mod-controls').forEach(ctrl => ctrl.classList.add('hidden'));
    document.getElementById(`${tabName}Controls`).classList.remove('hidden');
    
    resetSimulation();
}

function resetSimulation() {
    if (animationId) cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (currentTab === 'chaos') {
        state = {
            theta1: Math.PI / 2, theta2: Math.PI / 2,
            omega1: 0, omega2: 0,
            trail: []
        };
    } else if (currentTab === 'epidemic') {
        state = { particles: [], history: [], day: 0 };
        for (let i = 0; i < 150; i++) {
            state.particles.push({
                x: Math.random() * (canvas.width - 20) + 10,
                y: Math.random() * (canvas.height - 150) + 10,
                vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
                status: i < 3 ? 'I' : 'S', timer: 0
            });
        }
    } else if (currentTab === 'orbital') {
        state = {
            r1: {x: cx - 80, y: cy}, v1: {x: 0, y: 1.5},
            r2: {x: cx + 80, y: cy}, v2: {x: 0, y: -1.5},
            r3: {x: cx, y: cy - 60}, v3: {x: 1.2, y: 0},
            trail1: [], trail2: [], trail3: []
        };
    }
    animate();
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (currentTab === 'chaos') {
        const l1 = parseFloat(document.getElementById('len1').value);
        const l2 = parseFloat(document.getElementById('len2').value);
        const g = parseFloat(document.getElementById('grav').value) * 0.05;

        state.omega1 += (-g * Math.sin(state.theta1));
        state.omega2 += (-g * Math.sin(state.theta2));
        state.theta1 += state.omega1;
        state.theta2 += state.omega2;
        state.omega1 *= 0.999; state.omega2 *= 0.999; 

        let x1 = cx + l1 * Math.sin(state.theta1);
        let y1 = cy + l1 * Math.cos(state.theta1);
        let x2 = x1 + l2 * Math.sin(state.theta2);
        let y2 = y1 + l2 * Math.cos(state.theta2);

        state.trail.push({x: x2, y: y2});
        if (state.trail.length > 80) state.trail.shift();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        state.trail.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(x1, y1, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(x2, y2, 8, 0, Math.PI*2); ctx.fill();

    } else if (currentTab === 'epidemic') {
        const beta = parseFloat(document.getElementById('beta').value);
        const gamma = parseFloat(document.getElementById('gamma').value);
        let counts = { S: 0, I: 0, R: 0 };

        state.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 5 || p.x > canvas.width - 5) p.vx *= -1;
            if (p.y < 5 || p.y > canvas.height - 125) p.vy *= -1;

            if (p.status === 'I') {
                p.timer += 0.01;
                if (Math.random() < gamma * 0.1) p.status = 'R';
            }
            counts[p.status]++;

            ctx.fillStyle = p.status === 'S' ? '#38bdf8' : p.status === 'I' ? '#f43f5e' : '#10b981';
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
        });

        for (let i = 0; i < state.particles.length; i++) {
            for (let j = i + 1; j < state.particles.length; j++) {
                let p1 = state.particles[i]; let p2 = state.particles[j];
                let dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                if (dist < 12) {
                    if (p1.status === 'I' && p2.status === 'S' && Math.random() < beta) p2.status = 'I';
                    if (p2.status === 'I' && p1.status === 'S' && Math.random() < beta) p1.status = 'I';
                }
            }
        }

        state.history.push({...counts});
        if (state.history.length > canvas.width) state.history.shift();

        ctx.fillStyle = '#1e293b'; ctx.fillRect(0, canvas.height - 110, canvas.width, 110);
        state.history.forEach((h, x) => {
            let total = h.S + h.I + h.R;
            let yS = canvas.height - 10 - (h.S / total) * 90;
            let yI = yS - (h.I / total) * 90;
            
            ctx.fillStyle = '#f43f5e'; ctx.fillRect(x, yI, 1, (h.I / total) * 90);
            ctx.fillStyle = '#38bdf8'; ctx.fillRect(x, yS, 1, (h.S / total) * 90);
        });

    } else if (currentTab === 'orbital') {
        const m1 = parseFloat(document.getElementById('m1').value) * 10;
        const m2 = parseFloat(document.getElementById('m2').value) * 10;
        const m3 = parseFloat(document.getElementById('m3').value) * 10;

        function gravityPull(p1, p2, m2) {
            let dx = p2.x - p1.x; let dy = p2.y - p1.y;
            let dist = Math.hypot(dx, dy) + 15; 
            let force = (m2) / (dist * dist);
            return { x: force * (dx / dist), y: force * (dy / dist) };
        }

        let f12 = gravityPull(state.r1, state.r2, m2); let f13 = gravityPull(state.r1, state.r3, m3);
        let f21 = gravityPull(state.r2, state.r1, m1); let f23 = gravityPull(state.r2, state.r3, m3);
        let f31 = gravityPull(state.r3, state.r1, m1); let f32 = gravityPull(state.r3, state.r2, m2);

        state.v1.x += f12.x + f13.x; state.v1.y += f12.y + f13.y;
        state.v2.x += f21.x + f23.x; state.v2.y += f21.y + f23.y;
        state.v3.x += f31.x + f32.x; state.v3.y += f31.y + f32.y;

        state.r1.x += state.v1.x; state.r1.y += state.v1.y;
        state.r2.x += state.v2.x; state.r2.y += state.v2.y;
        state.r3.x += state.v3.x; state.r3.y += state.v3.y;

        state.trail1.push({...state.r1}); state.trail2.push({...state.r2}); state.trail3.push({...state.r3});
        if (state.trail1.length > 120) { state.trail1.shift(); state.trail2.shift(); state.trail3.shift(); }

        const renderTrail = (t, col) => {
            ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath();
            t.forEach((p, i) => { if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
            ctx.stroke();
        };
        renderTrail(state.trail1, '#38bdf8'); renderTrail(state.trail2, '#fb923c'); renderTrail(state.trail3, '#f43f5e');

        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(state.r1.x, state.r1.y, m1/2+2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(state.r2.x, state.r2.y, m2/2+2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(state.r3.x, state.r3.y, m3/2+2, 0, Math.PI*2); ctx.fill();
    }

    animationId = requestAnimationFrame(animate);
}

resetSimulation();
