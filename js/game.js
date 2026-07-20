
    let scene, camera, renderer;
    let player, playerHP = 100, maxHP = 100, score = 0;
    let bullets = [];
    let enemies = [];
    let items = []; 
    let particles = []; 
    let keys = {};

    // 長時間プレイ時のメモリ・描画負荷を一定に保つ安全上限
    const MAX_BULLETS = 240;
    const MAX_ENEMIES = 64;
    const MAX_ITEMS = 16;
    const MAX_PARTICLES = 140;
    
    let isGameStarted = false; 
    let isGameOver = false;
    let isPaused = false;

    // 矢印キーで連続調整するカメラ視点
    // 上下: -1（低い視点）〜 1（俯瞰） / 左右: -1（左）〜 1（右）
    let cameraViewLevel = 0;
    let cameraHorizontalLevel = 0;
    const CAMERA_VIEW_MIN = -1;
    const CAMERA_VIEW_MAX = 1;
    const CAMERA_VIEW_CHANGE_SPEED = 0.02;
    const CAMERA_HORIZONTAL_MAX_ANGLE = Math.PI * 0.18;

    // 難易度設定
    let currentDifficulty = 'normal'; // easy, normal, hard

    // 耐久モード（Survival Mode）関連の変数
    let isSurvivalMode = false;
    let survivalTimeLimit = 30; // 30, 60, 120
    let survivalTimer = 0.0;

    // スコアボス・一時戦闘アリーナ
    const BOSS_SCORE_INTERVAL = 5000;
    const BOSS_ARENA_HALF_WIDTH = 24;
    const BOSS_ARENA_HALF_DEPTH = 19;
    let nextBossScore = BOSS_SCORE_INTERVAL;
    let bossCount = 0;
    let bossActive = false;
    let bossEntity = null;
    let bossArenaBoundary = null;
    const bossArenaCenter = new THREE.Vector3();

    // キャラクター設定
    let currentSelectedType = 'cobalt';
    let currentSelectedSubWeapon = 'missile';

    // VORTEX手動チャージショット
    let isVortexCharging = false;
    let vortexChargeFrames = 0;
    const VORTEX_MEDIUM_CHARGE = 45;
    const VORTEX_MAX_CHARGE = 120;
    const VORTEX_SHOT_COOLDOWN = 4;

    let activeFighterConfig = {
        color: 0x00ffff,
        bulletColor: 0x00ffff,
        baseCooldown: 28,
        rapidCooldown: 6,
        bulletScale: 1.0,
        damage: 1
    };

    // 操作用
    let isMousePressing = false;       
    let shootCooldown = 0;

    // クイックブースト状態（60fps基準）
    let quickBoostRequested = false;
    let quickBoostFrames = 0;
    let boostEnergy = 100;
    let boostLockoutTimer = 0;
    const quickBoostDirection = new THREE.Vector3();
    const QUICK_BOOST_ENERGY_COST = 25;
    const QUICK_BOOST_DURATION = 9;
    const QUICK_BOOST_SPEED = 0.75;
    const QUICK_BOOST_LOCKOUT = 210;
    const QUICK_BOOST_RECHARGE_PER_FRAME = 0.22;

    // サブウェポン状態（60fps基準）
    let subWeaponCooldown = 0;
    let shieldGauge = 100;
    let shieldOverheatTimer = 0;
    let isSubShieldActive = false;

    // 自機パーツ
    let playerCockpit, playerLeftWing, playerRightWing, playerThruster;
    let barrierVisual = null; 
    let invincibleBarrierVisual = null; 
    let subShieldVisual = null;
    let gridHelper = null;

    // バフ/タイマー
    let invincibleTimer = 0;
    let multishotTimer = 0;
    let rapidfireTimer = 0; 
    let shieldStrength = 0; 

    // ジョイスティック用（DOM生成後に安全に取得するため宣言のみにする）
    let joystick = null;
    let knob = null;
    let joystickActive = false;
    let joystickStart = new THREE.Vector2();
    let moveDirection = new THREE.Vector3();

    // 生成タイマー
    let spawnInterval;
    let itemSpawnInterval;

    const FIGHTER_PRESETS = {
        cobalt: {
            color: 0x00ffff,
            bulletColor: 0x00ffff,
            baseCooldown: 25,
            rapidCooldown: 6,
            bulletScale: 1.2, 
            damage: 1
        },
        redline: {
            color: 0xff3366,
            bulletColor: 0xff3366,
            baseCooldown: 12,
            rapidCooldown: 4,
            bulletScale: 0.9,
            damage: 0.72
        },
        vortex: {
            color: 0x9900ff,
            bulletColor: 0xcc66ff,
            baseCooldown: 26,
            rapidCooldown: 7,
            bulletScale: 1.1,
            damage: 1
        },
        horizon: {
            color: 0xff5500,
            bulletColor: 0xffaa00,
            baseCooldown: 36, 
            rapidCooldown: 10,
            bulletScale: 2.2, 
            damage: 2.2         
        },
        gaia: {
            color: 0xccff00,
            bulletColor: 0xccff00,
            baseCooldown: 24,
            rapidCooldown: 6,
            bulletScale: 1.1,
            damage: 1
        }
    };

    const SUB_WEAPON_PRESETS = {
        missile: {
            name: 'MULTI MISSILE',
            color: 0xff33cc,
            cooldown: 420,
            damage: 2.2
        },
        beam: {
            name: 'NOVA BEAM',
            color: 0x66e0ff,
            cooldown: 300,
            damage: 9
        },
        shield: {
            name: 'HOLD SHIELD',
            color: 0x00ffcc,
            lockout: 240,
            drainPerFrame: 0.56,
            rechargePerFrame: 0.18
        }
    };

    // 🌟 ランキング管理用オブジェクト
    const DEFAULT_LEADERBOARDS = {
        easy: [
            { name: "Cobalt-X", score: 8000 },
            { name: "Fighter-01", score: 5500 },
            { name: "Neo-05", score: 4000 },
            { name: "Striker", score: 2500 },
            { name: "Dodge-Man", score: 1000 }
        ],
        normal: [
            { name: "Z-Striker", score: 12000 },
            { name: "Neon-Pilot", score: 9000 },
            { name: "Star-Lord", score: 6500 },
            { name: "Omega", score: 4500 },
            { name: "Novice", score: 2000 }
        ],
        hard: [
            { name: "Z-Infinity", score: 18000 },
            { name: "Horizon-S", score: 13500 },
            { name: "Redline-X", score: 10000 },
            { name: "Glitch-H", score: 7000 },
            { name: "Overlord", score: 3000 }
        ]
    };

    // セキュリティ制約等に備えるフォールバック用ストレージ
    let backupStorage = {};

    function safeGetItem(key) {
        try { return localStorage.getItem(key); } catch (e) { return backupStorage[key] || null; }
    }

    function safeSetItem(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { backupStorage[key] = value; }
    }

    function disposeObject3D(object) {
        if (!object) return;
        if (object.parent) object.parent.remove(object);

        const geometries = new Set();
        const materials = new Set();
        object.traverse(child => {
            if (child.geometry) geometries.add(child.geometry);
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => materials.add(material));
                } else {
                    materials.add(child.material);
                }
            }
        });

        materials.forEach(material => {
            Object.values(material).forEach(value => {
                if (value && value.isTexture && typeof value.dispose === 'function') value.dispose();
            });
            if (typeof material.dispose === 'function') material.dispose();
        });
        geometries.forEach(geometry => {
            if (typeof geometry.dispose === 'function') geometry.dispose();
        });
    }

    // ランキングデータの読み込み
    function loadLeaderboard(diff) {
        const key = `neon_strike_ranking_${diff}`;
        const data = safeGetItem(key);
        if (data) {
            try { return JSON.parse(data); } catch (e) { return DEFAULT_LEADERBOARDS[diff]; }
        } else {
            safeSetItem(key, JSON.stringify(DEFAULT_LEADERBOARDS[diff]));
            return DEFAULT_LEADERBOARDS[diff];
        }
    }

    // ランキングに登録可能（トップ5以内）か確認
    function checkLeaderboardEligibility(diff, scoreToCheck) {
        if (scoreToCheck <= 0) return false;
        const currentList = loadLeaderboard(diff);
        if (currentList.length < 5) return true;
        return scoreToCheck > currentList[currentList.length - 1].score;
    }

    // スコアの保存
    function saveLeaderboardScore(diff, name, scoreToSave) {
        const list = loadLeaderboard(diff);
        const pilotName = name.trim() || "PILOT";
        list.push({ name: pilotName, score: scoreToSave });
        list.sort((a, b) => b.score - a.score);
        const prunedList = list.slice(0, 5);
        safeSetItem(`neon_strike_ranking_${diff}`, JSON.stringify(prunedList));
    }

    // ランキングUI表示の更新
    let activeLeaderboardTab = 'normal';
    function openLeaderboard() {
        document.getElementById('leaderboard-modal').style.display = 'block';
        switchLeaderboardTab(currentDifficulty);
    }

    // 閉じる
    function closeLeaderboard() {
        document.getElementById('leaderboard-modal').style.display = 'none';
    }

    // 難易度別タブの切り替え
    function switchLeaderboardTab(diff) {
        const tabs = {
            easy: document.getElementById('tab-easy-btn'),
            normal: document.getElementById('tab-normal-btn'),
            hard: document.getElementById('tab-hard-btn')
        };

        for (const [key, btn] of Object.entries(tabs)) {
            if (!btn) continue;
            btn.className = 'leaderboard-tab-btn';
            if (key === diff) {
                btn.classList.add(`active-${diff}`);
            }
        }

        const listData = loadLeaderboard(diff);
        const container = document.getElementById('leaderboard-rows-container');
        if (!container) return;
        container.innerHTML = '';

        listData.forEach((item, index) => {
            const rank = index + 1;
            const row = document.createElement('div');
            row.className = `leaderboard-row rank-${rank}`;
            row.innerHTML = `
                <span class="rank-num">#${rank}</span>
                <span class="rank-name">${escapeHTML(item.name)}</span>
                <span class="rank-score">${item.score.toLocaleString()} PTS</span>
            `;
            container.appendChild(row);
        });
    }

    // スコア送信処理
    function submitScore() {
        const input = document.getElementById('player-name-input');
        if (!input) return;
        const name = input.value.trim() || "PILOT";
        
        saveLeaderboardScore(currentDifficulty, name, score);
        showNotification("RECORD SAVED!", "#00ff55");

        document.getElementById('rank-in-container').style.display = 'none';
        openLeaderboard();
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // 画面中央通知メッセージ
    function showNotification(text, color = "#ffffff") {
        const notif = document.getElementById('notification');
        if (!notif) return;
        notif.innerText = text;
        notif.style.color = color;
        notif.style.textShadow = `0 0 15px ${color}`;
        notif.style.opacity = '1';
        notif.style.transform = 'translate(-50%, -50%) scale(1.1)';

        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transform = 'translate(-50%, -50%) scale(0.9)';
        }, 1500);
    }

    // 初期起動
    window.onload = function() {
        init();
        loadLeaderboard('easy');
        loadLeaderboard('normal');
        loadLeaderboard('hard');
    };

    // 難易度変更処理
    function selectDifficulty(diff) {
        currentDifficulty = diff;
        const easyBtn = document.getElementById('diff-easy-btn');
        const normalBtn = document.getElementById('diff-normal-btn');
        const hardBtn = document.getElementById('diff-hard-btn');

        if (easyBtn) easyBtn.className = 'diff-btn';
        if (normalBtn) normalBtn.className = 'diff-btn';
        if (hardBtn) hardBtn.className = 'diff-btn';

        if (diff === 'easy' && easyBtn) {
            easyBtn.classList.add('selected-easy');
        } else if (diff === 'normal' && normalBtn) {
            normalBtn.classList.add('selected-normal');
        } else if (diff === 'hard' && hardBtn) {
            hardBtn.classList.add('selected-hard');
        }
    }

    // タイトル画面からキャラ選択へ
    function openCharSelectFromTitle() {
        const title = document.getElementById('title-screen');
        const charSelect = document.getElementById('char-select-screen');
        
        if (title) title.style.opacity = '0';
        setTimeout(() => {
            if (title) title.style.display = 'none';
            if (charSelect) {
                charSelect.style.display = 'flex';
                charSelect.style.opacity = '0';
                charSelect.style.transition = 'opacity 0.5s';
                setTimeout(() => charSelect.style.opacity = '1', 50);
            }
        }, 600);
    }

    // キャラ選択からタイトル画面に戻る
    function backToTitleFromChar() {
        const title = document.getElementById('title-screen');
        const charSelect = document.getElementById('char-select-screen');
        
        if (charSelect) charSelect.style.opacity = '0';
        setTimeout(() => {
            if (charSelect) charSelect.style.display = 'none';
            if (title) {
                title.style.display = 'flex';
                title.style.opacity = '0';
                title.style.transition = 'opacity 0.5s';
                setTimeout(() => title.style.opacity = '1', 50);
            }
        }, 400);
    }

    // 説明ページを開く
    function openHowToPlay() {
        document.getElementById('char-select-screen').style.display = 'none';
        document.getElementById('how-to-screen').style.display = 'flex';
    }

    // 説明ページを閉じる
    function closeHowToPlay() {
        document.getElementById('how-to-screen').style.display = 'none';
        document.getElementById('char-select-screen').style.display = 'flex';
    }

    // 耐久モード：時間選択パネルの展開
    function showSurvivalTimeSelect() {
        document.getElementById('main-char-select-btns').style.display = 'none';
        document.getElementById('survival-time-select').style.display = 'flex';
    }

    // 耐久モード：時間選択のキャンセル
    function hideSurvivalTimeSelect() {
        document.getElementById('survival-time-select').style.display = 'none';
        document.getElementById('main-char-select-btns').style.display = 'flex';
    }

    // 耐久モードでゲームを開始する
    function startSurvivalGame(seconds) {
        isSurvivalMode = true;
        survivalTimeLimit = seconds;
        survivalTimer = parseFloat(seconds);
        hideSurvivalTimeSelect();
        startGame();
    }

    function selectCharacter(type, element) {
        currentSelectedType = type;
        const cards = document.querySelectorAll('.char-card');
        cards.forEach(card => card.classList.remove('selected'));
        element.classList.add('selected');
    }

    function selectSubWeapon(type, element) {
        if (!SUB_WEAPON_PRESETS[type]) return;
        currentSelectedSubWeapon = type;
        const cards = document.querySelectorAll('.subweapon-card');
        cards.forEach(card => card.classList.remove('selected'));
        element.classList.add('selected');
        updateSubWeaponUI();
    }

    function openCharSelect() {
        clearInterval(spawnInterval);
        clearInterval(itemSpawnInterval);
        document.getElementById('game-over').style.display = 'none';
        document.getElementById('mission-clear').style.display = 'none';
        document.getElementById('hud').style.display = 'none';
        document.getElementById('controls-layout').style.display = 'none';
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('pause-btn').style.display = 'none';
        document.getElementById('pause-menu').style.display = 'none';
        document.getElementById('leaderboard-modal').style.display = 'none';
        
        document.getElementById('title-screen').style.display = 'none';
        const charSelect = document.getElementById('char-select-screen');
        charSelect.style.display = 'flex';
        charSelect.style.opacity = '1';
        
        isGameStarted = false;
        isGameOver = false;
        isPaused = false;
        isSurvivalMode = false;

        if (player) {
            disposeObject3D(player);
            player = null;
        }

        camera.position.set(0, 15, 18);
        camera.lookAt(0, 0, -2);
    }

    // ゲーム開始リセット（初期化処理）
    function resetGame() {
        playerHP = 100;
        score = 0;
        isGameOver = false;
        isPaused = false;
        shootCooldown = 0;
        isVortexCharging = false;
        vortexChargeFrames = 0;
        keys['KeyN'] = false;
        nextBossScore = BOSS_SCORE_INTERVAL;
        bossCount = 0;
        bossActive = false;
        bossEntity = null;
        bossArenaCenter.set(0, 0, 0);
        if (bossArenaBoundary) {
            disposeObject3D(bossArenaBoundary);
            bossArenaBoundary = null;
        }
        const bossHud = document.getElementById('boss-hud');
        if (bossHud) bossHud.style.display = 'none';

        if (isSurvivalMode) {
            survivalTimer = parseFloat(survivalTimeLimit);
        }

        const scoreText = document.getElementById('score-text');
        if (scoreText) scoreText.innerText = score;
        
        const hpBar = document.getElementById('hp-bar');
        if (hpBar) hpBar.style.width = '100%';
        
        const gameOverDiv = document.getElementById('game-over');
        if (gameOverDiv) gameOverDiv.style.display = 'none';
        
        const missionClearDiv = document.getElementById('mission-clear');
        if (missionClearDiv) missionClearDiv.style.display = 'none';
        
        const pauseMenuDiv = document.getElementById('pause-menu');
        if (pauseMenuDiv) pauseMenuDiv.style.display = 'none';
        
        const rankInDiv = document.getElementById('rank-in-container');
        if (rankInDiv) rankInDiv.style.display = 'none';

        invincibleTimer = 0;
        multishotTimer = 0;
        rapidfireTimer = 0;
        shieldStrength = 0;
        subWeaponCooldown = 0;
        shieldGauge = 100;
        shieldOverheatTimer = 0;
        isSubShieldActive = false;
        boostEnergy = 100;
        boostLockoutTimer = 0;
        quickBoostRequested = false;
        quickBoostFrames = 0;
        quickBoostDirection.set(0, 0, 0);
        keys['Space'] = false;
        keys['ShiftLeft'] = false;
        keys['ArrowUp'] = false;
        keys['ArrowDown'] = false;
        keys['ArrowLeft'] = false;
        keys['ArrowRight'] = false;
        cameraViewLevel = 0;
        cameraHorizontalLevel = 0;

        bullets.forEach(b => { if (b && b.mesh) disposeObject3D(b.mesh); });
        enemies.forEach(e => { if (e && e.mesh) disposeObject3D(e.mesh); });
        items.forEach(i => { if (i && i.mesh) disposeObject3D(i.mesh); });
        particles.forEach(p => { if (p && p.mesh) disposeObject3D(p.mesh); });

        bullets = [];
        enemies = [];
        items = [];
        particles = [];

        if (player) {
            disposeObject3D(player);
            player = null;
        }

        updateSubWeaponUI();
        updateBoostUI();
        updateVortexChargeUI();
    }

    // 3Dシーン初期化
    function init() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020208);
        scene.fog = new THREE.FogExp2(0x020208, 0.02);

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 15, 18);
        camera.lookAt(0, 0, -2);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = false;
        
        const container = document.getElementById('canvas-container');
        if (container) container.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0x00ffff, 0.9);
        dirLight.position.set(20, 45, 20);
        scene.add(dirLight);

        const pointLight = new THREE.PointLight(0xff0055, 1.2, 60);
        pointLight.position.set(-15, 10, -10);
        scene.add(pointLight);

        gridHelper = new THREE.GridHelper(240, 120, 0x00ffff, 0x112244);
        gridHelper.position.y = -0.5;
        scene.add(gridHelper);

        window.addEventListener('keydown', (e) => { 
            if ((e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'KeyN' || e.code.startsWith('Arrow')) && isGameStarted && !isGameOver) {
                e.preventDefault();
            }
            keys[e.code] = true; 
            if (e.code === 'Space' && !e.repeat && currentSelectedSubWeapon !== 'shield') {
                activateSubWeapon();
            }
            if (e.code === 'ShiftLeft' && !e.repeat && isGameStarted && !isGameOver && !isPaused) {
                quickBoostRequested = true;
            }
            if (
                e.code === 'KeyN' &&
                !e.repeat &&
                currentSelectedType === 'vortex' &&
                isGameStarted &&
                !isGameOver &&
                !isPaused &&
                !isSurvivalMode &&
                shootCooldown <= 0
            ) {
                isVortexCharging = true;
                vortexChargeFrames = 0;
                updateVortexChargeUI();
            }
            if (e.code === 'KeyP' || e.code === 'Escape') {
                togglePause();
            }
        });
        window.addEventListener('keyup', (e) => {
            keys[e.code] = false;
            if (e.code === 'Space') isSubShieldActive = false;
            if (e.code === 'KeyN' && isVortexCharging) releaseVortexCharge();
        });
        
        window.addEventListener('mousedown', (e) => {
            if (!isGameStarted || isGameOver || e.button !== 0 || isPaused) return;
            if (e.clientY > window.innerHeight - 180) return; 
            isMousePressing = true;
        });
        window.addEventListener('mouseup', () => { isMousePressing = false; });

        window.addEventListener('blur', () => {
            keys = {};
            isMousePressing = false;
            isSubShieldActive = false;
            quickBoostRequested = false;
            quickBoostFrames = 0;
            quickBoostDirection.set(0, 0, 0);
            cancelVortexCharge();
            joystickActive = false;
            if (knob) {
                knob.style.transform = 'translate(0px, 0px)';
            }
            moveDirection.set(0, 0, 0);
        });

        joystick = document.getElementById('joystick-container');
        knob = document.getElementById('joystick-knob');

        if (joystick && knob) {
            joystick.addEventListener('touchstart', onJoystickStart, { passive: false });
            window.addEventListener('touchmove', onJoystickMove, { passive: false });
            window.addEventListener('touchend', onJoystickEnd, { passive: false });
            window.addEventListener('touchcancel', onJoystickEnd, { passive: false });
        }

        window.addEventListener('resize', onWindowResize);

        animate();
    }

    // ウィンドウリサイズ時のアスペクト比調整
    function onWindowResize() {
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    // ジョイスティック制御
    function onJoystickStart(e) {
        if (!isGameStarted || isGameOver || isPaused) return;
        e.preventDefault();
        joystickActive = true;
        const rect = joystick.getBoundingClientRect();
        joystickStart.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    function onJoystickMove(e) {
        if (!joystickActive || isPaused || isGameOver || !isGameStarted) return;
        e.preventDefault();
        const touch = e.touches[0];
        const deltaX = touch.clientX - joystickStart.x;
        const deltaY = touch.clientY - joystickStart.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 45;

        let angle = Math.atan2(deltaY, deltaX);
        let moveX = deltaX;
        let moveY = deltaY;

        if (distance > maxDistance) {
            moveX = Math.cos(angle) * maxDistance;
            moveY = Math.sin(angle) * maxDistance;
        }

        if (knob) {
            knob.style.transform = `translate(${moveX}px, ${moveY}px)`;
        }

        moveDirection.set(moveX / maxDistance, 0, moveY / maxDistance);
    }

    function onJoystickEnd(e) {
        joystickActive = false;
        if (knob) {
            knob.style.transform = 'translate(0px, 0px)';
        }
        moveDirection.set(0, 0, 0);
    }

    // 自機（3Dモデル）のビルド (元の美しいネオンパルスデザインに完全復元)
    function createPlayerShip(type) {
        const config = FIGHTER_PRESETS[type] || FIGHTER_PRESETS.cobalt;
        activeFighterConfig = config;

        player = new THREE.Group();

        // コックピット（機体色ネオン：BoxGeometry）
        const cockpitGeo = new THREE.BoxGeometry(0.6, 0.5, 1.4);
        const cockpitMat = new THREE.MeshStandardMaterial({ 
            color: config.color, 
            roughness: 0.1, 
            metalness: 0.8,
            emissive: config.color,
            emissiveIntensity: 0.4
        });
        playerCockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        playerCockpit.position.set(0, 0.25, -0.3);
        player.add(playerCockpit);

        // 左右ウイング（鋭いコーンウイング：ConeGeometry 0.35, 1.6, 4）
        const wingGeo = new THREE.ConeGeometry(0.35, 1.6, 4);
        const wingMat = new THREE.MeshStandardMaterial({ 
            color: config.color, 
            roughness: 0.3,
            metalness: 0.6,
            emissive: config.color,
            emissiveIntensity: 0.2
        });
        
        playerLeftWing = new THREE.Mesh(wingGeo, wingMat);
        playerLeftWing.rotation.z = Math.PI / 2.3;
        playerLeftWing.rotation.y = Math.PI / 5;
        playerLeftWing.position.set(-0.95, 0.1, 0.1);
        player.add(playerLeftWing);

        playerRightWing = new THREE.Mesh(wingGeo, wingMat);
        playerRightWing.rotation.z = -Math.PI / 2.3;
        playerRightWing.rotation.y = -Math.PI / 5;
        playerRightWing.position.set(0.95, 0.1, 0.1);
        player.add(playerRightWing);

        // 後部スラスターネオン
        const thrusterGeo = new THREE.ConeGeometry(0.25, 0.7, 8);
        const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        playerThruster = new THREE.Mesh(thrusterGeo, thrusterMat);
        playerThruster.rotation.x = Math.PI / 2;
        playerThruster.position.set(0, 0.1, 0.7);
        player.add(playerThruster);

        // 補助シールドバリアの枠
        const barrierGeo = new THREE.SphereGeometry(1.5, 16, 16);
        const barrierMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.0
        });
        barrierVisual = new THREE.Mesh(barrierGeo, barrierMat);
        player.add(barrierVisual);

        // Space長押しで展開するサブウェポン・シールド
        const subShieldGeo = new THREE.SphereGeometry(2.15, 24, 24);
        const subShieldMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            wireframe: true,
            transparent: true,
            opacity: 0.0
        });
        subShieldVisual = new THREE.Mesh(subShieldGeo, subShieldMat);
        player.add(subShieldVisual);

        // 無敵バリアの枠
        const invincibleGeo = new THREE.SphereGeometry(2.0, 24, 24);
        const invincibleMat = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            wireframe: true,
            transparent: true,
            opacity: 0.0
        });
        invincibleBarrierVisual = new THREE.Mesh(invincibleGeo, invincibleMat);
        player.add(invincibleBarrierVisual);

        player.position.set(0, 0, 8);
        scene.add(player);
    }

    // ショット発射 (レーザーパルス CylinderGeometry に完全復元 ＋ 視認性向上のための少し大きなサイズ調整)
    function createBullet(pos, vel, color, life, scale = 1.0, isEnemy = false, damage = 1, lightweight = false) {
        if (bullets.length >= MAX_BULLETS) return null;

        let bMesh;
        if (isEnemy) {
            const geometry = new THREE.SphereGeometry(0.48, 6, 6);
            const material = new THREE.MeshBasicMaterial({
                color: 0xff2233,
                transparent: true,
                opacity: 0.88
            });
            bMesh = new THREE.Mesh(geometry, material);
        } else if (lightweight) {
            const geometry = new THREE.SphereGeometry(0.24 * scale, 6, 6);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.92
            });
            bMesh = new THREE.Mesh(geometry, material);
        } else {
            const width = 0.22 * scale;
            const length = 1.8 * scale;
            const geometry = new THREE.CylinderGeometry(width, width, length, 5);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.95
            });
            bMesh = new THREE.Mesh(geometry, material);
            bMesh.rotation.x = Math.PI / 2;

            const outer = new THREE.Mesh(
                new THREE.CylinderGeometry(width * 1.65, width * 1.65, length, 4),
                new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.22,
                    wireframe: true
                })
            );
            bMesh.add(outer);
        }

        bMesh.position.copy(pos);
        scene.add(bMesh);

        const bulletData = {
            mesh: bMesh,
            velocity: vel,
            life: life,
            isEnemy: isEnemy,
            damage: damage,
            kind: isEnemy ? 'enemy' : 'main',
            color: isEnemy ? 0xff0000 : color,
            collisionRadius: isEnemy ? 0.4 : 0.3
        };
        bullets.push(bulletData);
        return bulletData;
    }

    function setVortexCockpitCharge(ratio) {
        if (!playerCockpit || !playerCockpit.material) return;
        playerCockpit.material.emissiveIntensity = 0.4 + ratio * 1.8;
        const scale = 1 + ratio * 0.22;
        playerCockpit.scale.set(scale, scale, scale);
    }

    function cancelVortexCharge() {
        isVortexCharging = false;
        vortexChargeFrames = 0;
        setVortexCockpitCharge(0);
        updateVortexChargeUI();
    }

    function updateVortexChargeState() {
        if (currentSelectedType !== 'vortex') {
            if (isVortexCharging) cancelVortexCharge();
            updateVortexChargeUI();
            return;
        }

        if (isVortexCharging) {
            vortexChargeFrames = Math.min(VORTEX_MAX_CHARGE, vortexChargeFrames + 1);
            setVortexCockpitCharge(vortexChargeFrames / VORTEX_MAX_CHARGE);
        }
        updateVortexChargeUI();
    }

    function updateVortexChargeUI() {
        const hud = document.getElementById('vortex-charge-hud');
        const fill = document.getElementById('vortex-charge-fill');
        const status = document.getElementById('vortex-charge-status');
        if (!hud || !fill || !status) return;

        hud.style.display = currentSelectedType === 'vortex' ? 'block' : 'none';
        const ratio = Math.min(1, vortexChargeFrames / VORTEX_MAX_CHARGE);
        fill.style.width = `${ratio * 100}%`;

        if (!isVortexCharging) {
            status.innerText = 'HOLD N TO CHARGE';
            status.style.color = '#ffffff';
        } else if (vortexChargeFrames >= VORTEX_MAX_CHARGE) {
            status.innerText = 'MAX CHARGE — RELEASE N';
            status.style.color = '#ff66ff';
        } else if (vortexChargeFrames >= VORTEX_MEDIUM_CHARGE) {
            status.innerText = `MEDIUM ${Math.ceil(ratio * 100)}%`;
            status.style.color = '#cc88ff';
        } else {
            status.innerText = `NORMAL ${Math.ceil(ratio * 100)}%`;
            status.style.color = '#aaaaff';
        }
    }

    function createVortexChargeProjectile(tier) {
        if (bullets.length >= MAX_BULLETS) return;
        const settings = {
            normal: { damage: 1.0, radius: 0.48, speed: 0.68, life: 115 },
            medium: { damage: 4.0, radius: 0.82, speed: 0.58, life: 130 },
            max: { damage: 12.0, radius: 1.22, speed: 0.48, life: 150 }
        }[tier];

        const color = tier === 'max' ? 0xff33ff : (tier === 'medium' ? 0xcc66ff : 0x9966ff);
        const geometry = new THREE.SphereGeometry(settings.radius, 18, 18);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.95
        });
        const projectile = new THREE.Mesh(geometry, material);

        const glowGeometry = new THREE.SphereGeometry(settings.radius * 1.55, 14, 14);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: tier === 'max' ? 0.38 : 0.22,
            wireframe: true
        });
        projectile.add(new THREE.Mesh(glowGeometry, glowMaterial));
        projectile.position.copy(player.position).add(new THREE.Vector3(0, 0, -1.5));
        scene.add(projectile);

        bullets.push({
            mesh: projectile,
            velocity: new THREE.Vector3(0, 0, -settings.speed),
            life: settings.life,
            isEnemy: false,
            damage: settings.damage,
            kind: tier === 'max' ? 'vortexMax' : 'vortexCharge',
            color: color,
            collisionRadius: settings.radius,
            chargeTier: tier
        });
    }

    function spawnVortexFragments(origin, color, ignoredEnemy) {
        const fragmentCount = 12;
        for (let i = 0; i < fragmentCount && bullets.length < MAX_BULLETS; i++) {
            const angle = (Math.PI * 2 * i) / fragmentCount;
            const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
            const geometry = new THREE.SphereGeometry(0.3, 10, 10);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9
            });
            const fragment = new THREE.Mesh(geometry, material);
            fragment.position.copy(origin).addScaledVector(direction, 0.8);
            scene.add(fragment);

            bullets.push({
                mesh: fragment,
                velocity: direction.multiplyScalar(0.42),
                life: 48,
                isEnemy: false,
                damage: 1.6,
                kind: 'vortexFragment',
                color: color,
                collisionRadius: 0.32,
                ignoreEnemy: ignoredEnemy
            });
        }
    }

    function releaseVortexCharge() {
        if (!isVortexCharging) return;

        if (
            currentSelectedType !== 'vortex' ||
            !isGameStarted ||
            isGameOver ||
            isPaused ||
            isSurvivalMode ||
            !player
        ) {
            cancelVortexCharge();
            return;
        }

        let tier = 'normal';
        if (vortexChargeFrames >= VORTEX_MAX_CHARGE) {
            tier = 'max';
        } else if (vortexChargeFrames >= VORTEX_MEDIUM_CHARGE) {
            tier = 'medium';
        }

        createVortexChargeProjectile(tier);
        if (tier === 'max') {
            showNotification('VORTEX MAXIMUM CHARGE', '#ff33ff');
        } else if (tier === 'medium') {
            showNotification('VORTEX MEDIUM CHARGE', '#cc66ff');
        }

        shootCooldown = VORTEX_SHOT_COOLDOWN;
        cancelVortexCharge();
    }

    function createRedlineSpreadBullet(startPos, direction, scale = 1.0) {
        const spreadBullet = createBullet(
            startPos,
            direction,
            activeFighterConfig.bulletColor,
            22,
            activeFighterConfig.bulletScale * scale,
            false,
            activeFighterConfig.damage,
            true
        );
        if (!spreadBullet) return;
        spreadBullet.kind = 'redlineSpread';
        spreadBullet.life = 22;
        spreadBullet.collisionRadius = 0.3;
    }

    // 武器展開システム（VORTEX以外はオート射撃）
    function fireWeapons() {
        if (currentSelectedType === 'vortex' || shootCooldown > 0) return;

        const isRapid = rapidfireTimer > 0;
        const cooldownVal = isRapid ? activeFighterConfig.rapidCooldown : activeFighterConfig.baseCooldown;
        shootCooldown = cooldownVal;

        const pos = player.position.clone();
        pos.z -= 1.3;

        const isMulti = multishotTimer > 0;
        const isRedline = currentSelectedType === 'redline';
        const isGaia = currentSelectedType === 'gaia';

        // REDLINE: 短射程の5方向スプレッド。近距離で複数弾を重ねるほど高DPSになる。
        if (isRedline) {
            const spreadAngles = [-0.40, -0.20, 0, 0.20, 0.40];
            spreadAngles.forEach(angle => {
                const direction = new THREE.Vector3(
                    Math.sin(angle) * 0.62,
                    0,
                    -Math.cos(angle) * 0.62
                );
                createRedlineSpreadBullet(pos.clone(), direction);
            });

            if (isMulti) {
                [-0.56, 0.56].forEach(angle => {
                    const direction = new THREE.Vector3(
                        Math.sin(angle) * 0.62,
                        0,
                        -Math.cos(angle) * 0.62
                    );
                    createRedlineSpreadBullet(pos.clone(), direction, 0.9);
                });
            }
        }
        // COBALT / HORIZON: 前方へのオート射撃
        else if (currentSelectedType === 'cobalt' || currentSelectedType === 'horizon') {
            createBullet(pos, new THREE.Vector3(0, 0, -0.65), activeFighterConfig.bulletColor, 60, activeFighterConfig.bulletScale, false, activeFighterConfig.damage);
            
            if (isMulti) {
                createBullet(pos, new THREE.Vector3(-0.25, 0, -0.62), activeFighterConfig.bulletColor, 60, activeFighterConfig.bulletScale * 0.9, false, activeFighterConfig.damage);
                createBullet(pos, new THREE.Vector3(0.25, 0, -0.62), activeFighterConfig.bulletColor, 60, activeFighterConfig.bulletScale * 0.9, false, activeFighterConfig.damage);
            }
        }
        // GAIA: T字型3方向拡散
        else if (isGaia) {
            createBullet(pos, new THREE.Vector3(0, 0, -0.65), activeFighterConfig.bulletColor, 60, activeFighterConfig.bulletScale, false, activeFighterConfig.damage);
            createBullet(pos, new THREE.Vector3(-0.62, 0, 0), activeFighterConfig.bulletColor, 60, activeFighterConfig.bulletScale * 0.9, false, activeFighterConfig.damage);
            createBullet(pos, new THREE.Vector3(0.62, 0, 0), activeFighterConfig.bulletColor, 60, activeFighterConfig.bulletScale * 0.9, false, activeFighterConfig.damage);

            if (isMulti) {
                createBullet(pos.clone().add(new THREE.Vector3(-0.15, 0, -0.2)), new THREE.Vector3(0, 0, -0.65), activeFighterConfig.bulletColor, 60, activeFighterConfig.bulletScale, false, activeFighterConfig.damage);
                createBullet(pos.clone().add(new THREE.Vector3(0.15, 0, -0.2)), new THREE.Vector3(0, 0, -0.65), activeFighterConfig.bulletColor, 60, activeFighterConfig.bulletScale, false, activeFighterConfig.damage);
            }
        }
    }

    function getMissileTargets() {
        if (!player) return [];
        return enemies
            .filter(enemy => enemy && enemy.mesh && enemy.mesh.position.z < player.position.z + 6)
            .slice()
            .sort((a, b) => player.position.distanceTo(a.mesh.position) - player.position.distanceTo(b.mesh.position));
    }

    function createHomingMissile(startPos, initialVelocity, target) {
        if (bullets.length >= MAX_BULLETS) return;
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xff33cc,
            emissive: 0xff0088,
            emissiveIntensity: 0.8,
            metalness: 0.75,
            roughness: 0.15
        });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.15, 8), bodyMat);
        body.rotation.x = -Math.PI / 2;
        group.add(body);

        const nose = new THREE.Mesh(
            new THREE.ConeGeometry(0.22, 0.5, 8),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        nose.rotation.x = -Math.PI / 2;
        nose.position.z = -0.78;
        group.add(nose);

        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.28, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff33cc, transparent: true, opacity: 0.5 })
        );
        glow.position.z = 0.62;
        group.add(glow);

        group.position.copy(startPos);
        scene.add(group);
        bullets.push({
            mesh: group,
            velocity: initialVelocity,
            life: 300,
            isEnemy: false,
            damage: SUB_WEAPON_PRESETS.missile.damage,
            kind: 'missile',
            color: SUB_WEAPON_PRESETS.missile.color,
            collisionRadius: 0.75,
            target: target,
            turnRate: 0.085
        });
    }

    function fireMultiMissiles() {
        const targets = getMissileTargets();
        const offsets = [-1.2, -0.6, 0, 0.6, 1.2];
        offsets.forEach((offset, index) => {
            const start = player.position.clone().add(new THREE.Vector3(offset, 0.15, -0.4 - Math.abs(offset) * 0.15));
            const velocity = new THREE.Vector3(offset * 0.045, 0, -0.42).normalize().multiplyScalar(0.42);
            const target = targets.length ? targets[index % targets.length] : null;
            createHomingMissile(start, velocity, target);
        });
        showNotification('MULTI MISSILE — TARGET LOCK', '#ff33cc');
    }

    function fireNovaBeam() {
        if (bullets.length >= MAX_BULLETS) return;
        const beamLength = 34;
        const beamWidth = 2.2;
        const beamLife = 22;
        const beamGroup = new THREE.Group();

        const makeBeamMaterial = (color, opacity) => new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // 白い芯、シアンの内光、青い外光を重ねて棒状に見えないビームにする
        const core = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, beamLength, 8, 1, true),
            makeBeamMaterial(0xffffff, 0.96)
        );
        core.rotation.x = Math.PI / 2;
        core.renderOrder = 6;
        beamGroup.add(core);

        const innerGlow = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.48, beamLength, 10, 1, true),
            makeBeamMaterial(0x79f5ff, 0.54)
        );
        innerGlow.rotation.x = Math.PI / 2;
        innerGlow.renderOrder = 5;
        beamGroup.add(innerGlow);

        const outerGlow = new THREE.Mesh(
            new THREE.CylinderGeometry(0.70, 1.05, beamLength, 12, 1, true),
            makeBeamMaterial(0x168cff, 0.20)
        );
        outerGlow.rotation.x = Math.PI / 2;
        outerGlow.renderOrder = 4;
        beamGroup.add(outerGlow);

        const muzzleFlash = new THREE.Mesh(
            new THREE.SphereGeometry(0.90, 10, 6),
            makeBeamMaterial(0xbffaff, 0.72)
        );
        muzzleFlash.position.z = beamLength / 2;
        muzzleFlash.scale.z = 0.65;
        muzzleFlash.renderOrder = 7;
        beamGroup.add(muzzleFlash);

        const tipFlash = new THREE.Mesh(
            new THREE.SphereGeometry(1.05, 10, 6),
            makeBeamMaterial(0x39caff, 0.45)
        );
        tipFlash.position.z = -beamLength / 2;
        tipFlash.scale.z = 1.45;
        tipFlash.renderOrder = 7;
        beamGroup.add(tipFlash);

        // 発射口から先端へ流れるリングでエネルギーの移動を見せる
        const energyRings = [];
        for (let i = 0; i < 2; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.68, 0.07, 6, 16),
                makeBeamMaterial(i === 0 ? 0xffffff : 0x55ddff, 0.68)
            );
            ring.position.z = beamLength / 2 - i * (beamLength / 2);
            ring.renderOrder = 8;
            beamGroup.add(ring);
            energyRings.push(ring);
        }

        const startZ = player.position.z - 1.2;
        const endZ = startZ - beamLength;
        beamGroup.position.set(player.position.x, 0.15, (startZ + endZ) / 2);
        scene.add(beamGroup);
        bullets.push({
            mesh: beamGroup,
            velocity: new THREE.Vector3(),
            life: beamLife,
            maxLife: beamLife,
            beamAge: 0,
            beamLength,
            isEnemy: false,
            damage: SUB_WEAPON_PRESETS.beam.damage,
            kind: 'beam',
            color: SUB_WEAPON_PRESETS.beam.color,
            collisionRadius: beamWidth / 2,
            beamX: player.position.x,
            beamStartZ: startZ,
            beamEndZ: endZ,
            hitEnemies: new Set(),
            core,
            innerGlow,
            outerGlow,
            muzzleFlash,
            tipFlash,
            energyRings
        });
        showNotification('NOVA BEAM — FULL OUTPUT', '#66e0ff');
    }

    function activateSubWeapon() {
        if (!isGameStarted || isGameOver || isPaused || !player) return;
        if (currentSelectedSubWeapon === 'shield' || subWeaponCooldown > 0) return;

        const config = SUB_WEAPON_PRESETS[currentSelectedSubWeapon];
        if (currentSelectedSubWeapon === 'missile') {
            fireMultiMissiles();
        } else if (currentSelectedSubWeapon === 'beam') {
            fireNovaBeam();
        }
        subWeaponCooldown = config.cooldown;
        updateSubWeaponUI();
    }

    function triggerShieldOverheat() {
        if (shieldOverheatTimer > 0) return;
        shieldGauge = 0;
        shieldOverheatTimer = SUB_WEAPON_PRESETS.shield.lockout;
        isSubShieldActive = false;
        showNotification('SHIELD OVERHEAT — 4.0s LOCKOUT', '#ff3366');
    }

    function drainSubShield(amount) {
        if (shieldOverheatTimer > 0) return;
        shieldGauge = Math.max(0, shieldGauge - amount);
        if (shieldGauge <= 0) triggerShieldOverheat();
    }

    function updateSubWeaponState() {
        if (subWeaponCooldown > 0) subWeaponCooldown--;

        if (currentSelectedSubWeapon === 'shield') {
            if (shieldOverheatTimer > 0) {
                shieldOverheatTimer--;
                isSubShieldActive = false;
                if (shieldOverheatTimer === 0) {
                    shieldGauge = 100;
                    showNotification('SHIELD RECHARGED', '#00ffcc');
                }
            } else if (keys['Space']) {
                isSubShieldActive = shieldGauge > 0;
                if (isSubShieldActive) {
                    drainSubShield(SUB_WEAPON_PRESETS.shield.drainPerFrame);
                }
            } else {
                isSubShieldActive = false;
                shieldGauge = Math.min(100, shieldGauge + SUB_WEAPON_PRESETS.shield.rechargePerFrame);
            }
        } else {
            isSubShieldActive = false;
        }

        if (subShieldVisual) {
            subShieldVisual.material.opacity = isSubShieldActive
                ? 0.34 + Math.sin(Date.now() * 0.018) * 0.12
                : 0.0;
            subShieldVisual.rotation.y += isSubShieldActive ? 0.045 : 0.01;
            subShieldVisual.rotation.z -= isSubShieldActive ? 0.025 : 0.005;
        }

        updateSubWeaponUI();
    }

    function updateSubWeaponUI() {
        const config = SUB_WEAPON_PRESETS[currentSelectedSubWeapon];
        const nameEl = document.getElementById('subweapon-name');
        const fillEl = document.getElementById('subweapon-gauge-fill');
        const statusEl = document.getElementById('subweapon-status');
        if (!config || !nameEl || !fillEl || !statusEl) return;

        nameEl.innerText = config.name;
        const colorHex = '#' + config.color.toString(16).padStart(6, '0');
        fillEl.style.background = `linear-gradient(90deg, ${colorHex}, #ffffff)`;
        fillEl.style.boxShadow = `0 0 8px ${colorHex}`;

        if (currentSelectedSubWeapon === 'shield') {
            fillEl.style.width = `${shieldGauge}%`;
            if (shieldOverheatTimer > 0) {
                statusEl.innerText = `OVERHEAT ${(shieldOverheatTimer / 60).toFixed(1)}s`;
                statusEl.style.color = '#ff3366';
            } else if (isSubShieldActive) {
                statusEl.innerText = `ACTIVE ${Math.ceil(shieldGauge)}%`;
                statusEl.style.color = colorHex;
            } else {
                statusEl.innerText = `HOLD SPACE — ${Math.ceil(shieldGauge)}%`;
                statusEl.style.color = '#ffffff';
            }
        } else {
            const readyRatio = Math.max(0, 1 - subWeaponCooldown / config.cooldown);
            fillEl.style.width = `${readyRatio * 100}%`;
            if (subWeaponCooldown > 0) {
                statusEl.innerText = `RECHARGING ${(subWeaponCooldown / 60).toFixed(1)}s`;
                statusEl.style.color = '#aaaaaa';
            } else {
                statusEl.innerText = 'READY — PRESS SPACE';
                statusEl.style.color = '#ffffff';
            }
        }
    }

    function tryQuickBoost(direction) {
        if (direction.lengthSq() === 0 || boostLockoutTimer > 0 || boostEnergy < QUICK_BOOST_ENERGY_COST) {
            return;
        }

        quickBoostDirection.copy(direction).normalize();
        quickBoostFrames = QUICK_BOOST_DURATION;
        boostEnergy = Math.max(0, boostEnergy - QUICK_BOOST_ENERGY_COST);

        if (boostEnergy <= 0) {
            boostLockoutTimer = QUICK_BOOST_LOCKOUT;
            showNotification('QUICK BOOST OVERHEAT', '#ff3366');
        }

        updateBoostUI();
    }

    function updateQuickBoostState() {
        if (boostLockoutTimer > 0) {
            boostLockoutTimer--;
            if (boostLockoutTimer === 0) {
                boostEnergy = 100;
                showNotification('QUICK BOOST RECHARGED', '#ffd740');
            }
        } else if (quickBoostFrames <= 0 && boostEnergy < 100) {
            boostEnergy = Math.min(100, boostEnergy + QUICK_BOOST_RECHARGE_PER_FRAME);
        }

        updateBoostUI();
    }

    function updateBoostUI() {
        const fillEl = document.getElementById('boost-gauge-fill');
        const statusEl = document.getElementById('boost-status');
        if (!fillEl || !statusEl) return;

        fillEl.style.width = `${boostEnergy}%`;

        if (boostLockoutTimer > 0) {
            fillEl.style.background = 'linear-gradient(90deg, #ff1744, #ff6b6b)';
            fillEl.style.boxShadow = '0 0 10px #ff1744';
            statusEl.innerText = `OVERHEAT ${(boostLockoutTimer / 60).toFixed(1)}s`;
            statusEl.style.color = '#ff5577';
        } else {
            fillEl.style.background = 'linear-gradient(90deg, #ff8a00, #fff36b)';
            fillEl.style.boxShadow = '0 0 10px #ffd740';

            if (quickBoostFrames > 0) {
                statusEl.innerText = `BOOSTING — ${Math.ceil(boostEnergy)}%`;
                statusEl.style.color = '#fff36b';
            } else if (boostEnergy >= QUICK_BOOST_ENERGY_COST) {
                statusEl.innerText = boostEnergy >= 99.9
                    ? 'READY — LEFT SHIFT'
                    : `READY ${Math.ceil(boostEnergy)}% — LEFT SHIFT`;
                statusEl.style.color = '#ffffff';
            } else {
                statusEl.innerText = `RECHARGING ${Math.ceil(boostEnergy)}%`;
                statusEl.style.color = '#aaaaaa';
            }
        }
    }

    // 被弾処理 (被弾時のカメラ揺れシェイクを完全に排除)
    function takeDamage(amount) {
        if (isGameOver || !isGameStarted || isPaused) return;

        // 選択式シールドはSpace長押し中のみダメージを完全吸収する
        if (currentSelectedSubWeapon === 'shield' && isSubShieldActive && shieldOverheatTimer <= 0) {
            drainSubShield(9);
            showNotification(`HOLD SHIELD BLOCK — ${Math.ceil(shieldGauge)}%`, '#00ffcc');
            return;
        }

        // 無敵時は一切ダメージを受けない
        if (invincibleTimer > 0) return;

        // 1. バリア耐久値の消費
        if (shieldStrength > 0) {
            shieldStrength--;
            showNotification(`BARRIER ABSORBED (STOCK: ${shieldStrength})`, "#00ffff");
            return;
        }

        // 2. 自機HP減少
        playerHP = Math.max(0, playerHP - amount);
        
        const hpBar = document.getElementById('hp-bar');
        if (hpBar) hpBar.style.width = playerHP + '%';

        // ★被弾時のカメラ揺れ（カメラシェイク）の記述を完全に廃止しました★

        if (playerHP <= 0) {
            triggerGameOver();
        }
    }

    // ゲームオーバー移行
    function triggerGameOver() {
        isGameOver = true;
        clearInterval(spawnInterval);
        clearInterval(itemSpawnInterval);

        createExplosion(player.position, 0xff0055, 45);
        disposeObject3D(player);
        player = null;

        document.getElementById('pause-btn').style.display = 'none';
        const bossHud = document.getElementById('boss-hud');
        if (bossHud) bossHud.style.display = 'none';
        document.getElementById('final-score-text').innerText = score.toLocaleString();
        document.getElementById('game-over').style.display = 'block';

        // ランキング判定とお名前入力UIの活性化
        if (checkLeaderboardEligibility(currentDifficulty, score)) {
            document.getElementById('rank-in-container').style.display = 'block';
            document.getElementById('player-name-input').value = '';
            document.getElementById('player-name-input').focus();
        } else {
            document.getElementById('rank-in-container').style.display = 'none';
        }
    }

    // 耐久成功クリア
    function triggerMissionClear() {
        isGameOver = true;
        clearInterval(spawnInterval);
        clearInterval(itemSpawnInterval);

        // クリアを画面上でお祝い
        showNotification("MISSION SUCCESS!", "#ffd700");
        document.getElementById('pause-btn').style.display = 'none';

        const clearInfo = document.getElementById('clear-info');
        if (clearInfo) {
            clearInfo.innerHTML = `SURVIVED ${survivalTimeLimit} SECONDS!<br><span style="font-size:12px;color:#aaa;">Difficulty: ${currentDifficulty.toUpperCase()}</span>`;
        }

        document.getElementById('mission-clear').style.display = 'block';
    }

    // ゲーム開始処理
    function startGame() {
        clearInterval(spawnInterval);
        clearInterval(itemSpawnInterval);
        document.getElementById('char-select-screen').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        document.getElementById('controls-layout').style.display = 'flex';
        document.getElementById('instructions').style.display = 'block';
        
        // ポーズ・HUDボタン
        document.getElementById('pause-btn').style.display = 'block';

        // 耐久モードに応じたHUDタイマーの表示切り替え
        const timerHud = document.getElementById('survival-hud-timer');
        const scoreHud = document.getElementById('standard-score-hud');
        if (isSurvivalMode) {
            if (timerHud) timerHud.style.display = 'block';
            if (scoreHud) scoreHud.style.display = 'none';
        } else {
            if (timerHud) timerHud.style.display = 'none';
            if (scoreHud) scoreHud.style.display = 'block';
        }

        resetGame();
        createPlayerShip(currentSelectedType);

        isGameStarted = true;

        // 生成サイクル調整
        let spawnRate = 750;
        let itemRate = 6000;
        
        if (currentDifficulty === 'easy') {
            spawnRate = 1200;
            itemRate = 5000; // イージーはアイテム多め
        } else if (currentDifficulty === 'hard') {
            spawnRate = 480;
            itemRate = 9000; // ハードは厳しめ
        }

        spawnInterval = setInterval(spawnEnemy, spawnRate);
        itemSpawnInterval = setInterval(() => spawnItem(), itemRate);
    }

    // 直接リトライ
    function retryDirectly() {
        startGame();
    }

    // 一時停止（ポーズ）の切り替え
    function togglePause() {
        if (!isGameStarted || isGameOver) return;
        
        isPaused = !isPaused;
        const pauseMenu = document.getElementById('pause-menu');
        
        if (isPaused) {
            pauseMenu.style.display = 'block';
            document.getElementById('pause-btn').innerText = 'RESUME';
        } else {
            pauseMenu.style.display = 'none';
            document.getElementById('pause-btn').innerText = 'PAUSE';
        }
    }

    // ポーズ画面からの遷移処理
    function goToCharSelectFromPause() {
        togglePause(); // ポーズを一旦戻す
        openCharSelect();
    }

    function goToTitleFromPause() {
        togglePause();
        openCharSelect();
        backToTitleFromChar();
    }

    function updateScoreDisplay() {
        const scoreText = document.getElementById('score-text');
        if (scoreText) scoreText.innerText = score.toLocaleString();
    }

    function addScore(amount, allowBossCheck = true) {
        score += amount;
        updateScoreDisplay();
        if (allowBossCheck) checkBossEncounter();
    }

    function checkBossEncounter() {
        if (isSurvivalMode || bossActive || !isGameStarted || isGameOver) return;
        if (score >= nextBossScore) startBossEncounter();
    }

    function createBossArenaBoundary() {
        if (bossArenaBoundary) disposeObject3D(bossArenaBoundary);

        const x = BOSS_ARENA_HALF_WIDTH;
        const z = BOSS_ARENA_HALF_DEPTH;
        const points = [
            new THREE.Vector3(bossArenaCenter.x - x, 0.08, bossArenaCenter.z - z),
            new THREE.Vector3(bossArenaCenter.x + x, 0.08, bossArenaCenter.z - z),
            new THREE.Vector3(bossArenaCenter.x + x, 0.08, bossArenaCenter.z + z),
            new THREE.Vector3(bossArenaCenter.x - x, 0.08, bossArenaCenter.z + z)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xff1744,
            transparent: true,
            opacity: 0.9
        });
        bossArenaBoundary = new THREE.LineLoop(geometry, material);
        scene.add(bossArenaBoundary);
    }

    function clearBossProjectiles() {
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (!bullets[i].isEnemy) continue;
            disposeObject3D(bullets[i].mesh);
            bullets.splice(i, 1);
        }
    }

    function startBossEncounter() {
        if (bossActive || isSurvivalMode || !player) return;

        bossActive = true;
        bossCount++;
        nextBossScore += BOSS_SCORE_INTERVAL;
        bossArenaCenter.set(player.position.x, 0, player.position.z);

        // 通常敵と敵弾を一度片づけ、ボス戦へ明確に切り替える。
        enemies.forEach(enemy => {
            if (enemy && enemy.mesh) disposeObject3D(enemy.mesh);
        });
        enemies = [];
        clearBossProjectiles();
        createBossArenaBoundary();

        const bossMesh = new THREE.Group();
        const coreGeometry = new THREE.IcosahedronGeometry(2.4, 1);
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a0010,
            emissive: 0xff1744,
            emissiveIntensity: 0.85,
            metalness: 0.85,
            roughness: 0.2
        });
        bossMesh.add(new THREE.Mesh(coreGeometry, coreMaterial));

        const shellGeometry = new THREE.TorusGeometry(3.2, 0.22, 8, 32);
        const shellMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3355,
            transparent: true,
            opacity: 0.9
        });
        const ringA = new THREE.Mesh(shellGeometry, shellMaterial);
        ringA.rotation.x = Math.PI / 2;
        bossMesh.add(ringA);

        const ringB = new THREE.Mesh(shellGeometry, shellMaterial.clone());
        ringB.rotation.y = Math.PI / 2;
        bossMesh.add(ringB);

        const wingGeometry = new THREE.BoxGeometry(6.2, 0.38, 1.2);
        const wingMaterial = new THREE.MeshStandardMaterial({
            color: 0x220008,
            emissive: 0xff0033,
            emissiveIntensity: 0.55,
            metalness: 0.9
        });
        bossMesh.add(new THREE.Mesh(wingGeometry, wingMaterial));

        let baseHp = 80;
        if (currentDifficulty === 'easy') baseHp = 55;
        if (currentDifficulty === 'hard') baseHp = 115;
        const maxHp = baseHp + (bossCount - 1) * 20;

        bossMesh.position.set(
            bossArenaCenter.x,
            0,
            bossArenaCenter.z - BOSS_ARENA_HALF_DEPTH + 3
        );
        scene.add(bossMesh);

        bossEntity = {
            mesh: bossMesh,
            isBoss: true,
            isElite: false,
            hp: maxHp,
            maxHp: maxHp,
            speed: 0,
            shootTimer: 0,
            phase: 0,
            contactCooldown: 0,
            level: bossCount,
            attackPatternIndex: 0,
            spiralAngle: 0
        };
        enemies.push(bossEntity);
        updateBossUI(bossEntity);

        const bossHud = document.getElementById('boss-hud');
        if (bossHud) bossHud.style.display = 'flex';
        const bossTitle = document.getElementById('boss-title');
        if (bossTitle) {
            bossTitle.innerText = `BOSS ${String(bossCount).padStart(2, '0')} — NEON WARDEN / THREAT ${bossCount}`;
        }

        showNotification(`WARNING — BOSS AT ${score.toLocaleString()} PTS`, '#ff1744');
    }

    function updateBossUI(boss) {
        if (!boss || !boss.isBoss) return;
        const hud = document.getElementById('boss-hud');
        const fill = document.getElementById('boss-hp-fill');
        const text = document.getElementById('boss-hp-text');
        const ratio = Math.max(0, boss.hp / boss.maxHp);

        if (hud) {
            hud.style.display = 'flex';
            hud.style.visibility = 'visible';
            hud.style.opacity = '1';
        }
        if (fill) fill.style.width = `${ratio * 100}%`;
        if (text) text.innerText = `${Math.ceil(Math.max(0, boss.hp))} / ${boss.maxHp}`;
    }

    function createBossBullet(origin, direction, speed, damage, scale = 1.0) {
        if (bullets.length >= MAX_BULLETS) return;
        const velocity = direction.clone().normalize().multiplyScalar(speed);
        const bullet = createBullet(origin.clone(), velocity, 0xff1744, 180, scale, true);
        if (bullet) bullet.bossDamage = damage;
    }

    function fireBossPattern(boss) {
        const origin = boss.mesh.position.clone().add(new THREE.Vector3(0, 0, 1.6));
        const aimedDirection = player.position.clone().sub(origin);
        aimedDirection.y = 0;
        aimedDirection.normalize();

        const levelBonus = Math.min(8, Math.max(0, boss.level - 1));
        let bulletSpeed = 0.22 + Math.min(0.08, levelBonus * 0.012);
        let bossDamage = 13 + levelBonus;
        if (currentDifficulty === 'easy') {
            bulletSpeed -= 0.045;
            bossDamage -= 3;
        } else if (currentDifficulty === 'hard') {
            bulletSpeed += 0.045;
            bossDamage += 4;
        }

        const availablePatterns = Math.min(3, boss.level);
        const pattern = boss.attackPatternIndex % availablePatterns;
        boss.attackPatternIndex++;

        if (pattern === 0) {
            // THREAT 1+: プレイヤーを狙う扇状弾。段階に応じて5→7→9発へ増える。
            const fanCount = Math.min(9, 5 + Math.floor((boss.level - 1) / 2) * 2);
            const totalSpread = 0.72 + Math.min(0.22, (boss.level - 1) * 0.035);
            for (let i = 0; i < fanCount; i++) {
                const normalized = fanCount === 1 ? 0 : i / (fanCount - 1);
                const angle = -totalSpread / 2 + totalSpread * normalized;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const direction = new THREE.Vector3(
                    aimedDirection.x * cos - aimedDirection.z * sin,
                    0,
                    aimedDirection.x * sin + aimedDirection.z * cos
                );
                createBossBullet(origin, direction, bulletSpeed, bossDamage, 1.0);
            }
        } else if (pattern === 1) {
            // THREAT 2+: 全周放射弾。スコア段階に応じて弾数が増える。
            const radialCount = Math.min(14, 8 + boss.level * 2);
            for (let i = 0; i < radialCount; i++) {
                const angle = (Math.PI * 2 * i) / radialCount;
                createBossBullet(
                    origin,
                    new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)),
                    bulletSpeed * 0.88,
                    Math.max(8, bossDamage - 3),
                    0.9
                );
            }
        } else {
            // THREAT 3+: 発射角が毎回回転するスパイラル弾幕。
            const spiralCount = Math.min(12, 8 + boss.level);
            for (let i = 0; i < spiralCount; i++) {
                const angle = boss.spiralAngle + (Math.PI * 2 * i) / spiralCount;
                createBossBullet(
                    origin,
                    new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)),
                    bulletSpeed * 0.95,
                    Math.max(9, bossDamage - 2),
                    0.95
                );
            }
            boss.spiralAngle += 0.42;
        }
    }

    function updateBoss(boss) {
        const levelMotionBonus = Math.min(0.014, Math.max(0, boss.level - 1) * 0.002);
        boss.phase += 0.019 + levelMotionBonus;
        boss.mesh.position.x = bossArenaCenter.x + Math.sin(boss.phase) * 18.0;
        const desiredBossZ =
            bossArenaCenter.z - 14.0 +
            Math.sin(boss.phase * 0.55) * (2.5 + Math.min(2.5, boss.level * 0.35));
        boss.mesh.position.z = THREE.MathUtils.clamp(
            desiredBossZ,
            bossArenaCenter.z - BOSS_ARENA_HALF_DEPTH + 4,
            bossArenaCenter.z - 4
        );
        boss.mesh.rotation.y += 0.014 + levelMotionBonus * 0.5;
        boss.mesh.rotation.z = Math.sin(boss.phase * 0.7) * 0.08;

        if (boss.contactCooldown > 0) boss.contactCooldown--;
        boss.shootTimer++;

        let attackCooldown = 78;
        if (currentDifficulty === 'easy') attackCooldown = 108;
        if (currentDifficulty === 'hard') attackCooldown = 58;
        attackCooldown = Math.max(34, attackCooldown - (boss.level - 1) * 6);

        if (boss.shootTimer >= attackCooldown) {
            boss.shootTimer = 0;
            fireBossPattern(boss);
        }
    }

    function constrainPlayerToBossArena() {
        if (!bossActive || !player) return;
        player.position.x = THREE.MathUtils.clamp(
            player.position.x,
            bossArenaCenter.x - BOSS_ARENA_HALF_WIDTH,
            bossArenaCenter.x + BOSS_ARENA_HALF_WIDTH
        );
        player.position.z = THREE.MathUtils.clamp(
            player.position.z,
            bossArenaCenter.z - BOSS_ARENA_HALF_DEPTH,
            bossArenaCenter.z + BOSS_ARENA_HALF_DEPTH
        );
    }

    function defeatBoss(boss, bossIndex) {
        const defeatedPosition = boss.mesh.position.clone();
        createExplosion(defeatedPosition, 0xff1744, 70);
        disposeObject3D(boss.mesh);
        enemies.splice(bossIndex, 1);

        bossActive = false;
        bossEntity = null;
        if (bossArenaBoundary) {
            disposeObject3D(bossArenaBoundary);
            bossArenaBoundary = null;
        }
        clearBossProjectiles();

        const bossHud = document.getElementById('boss-hud');
        if (bossHud) bossHud.style.display = 'none';

        addScore(2000, false);
        spawnItem(defeatedPosition, 'repair');
        showNotification('BOSS DESTROYED — FIELD UNLOCKED', '#00ffcc');
    }

    // 敵出現ロジック
    function spawnEnemy() {
        if (!isGameStarted || isGameOver || isPaused || bossActive || enemies.length >= MAX_ENEMIES) return;

        // 🌟サバイバルモード（耐久ミッション）の場合、敵の発生頻度を半分に制限して、精密な回避活動に専念しやすくします
        if (isSurvivalMode && Math.random() < 0.5) return;

        let eliteChance = 0.22;
        if (currentDifficulty === 'easy') eliteChance = 0.12;
        if (currentDifficulty === 'hard') eliteChance = 0.32;

        const isElite = Math.random() < eliteChance;
        const enemyMesh = new THREE.Group();

        let coreGeo, mat;
        
        let maxHp = isElite ? 3 : 1;
        if (currentDifficulty === 'hard') {
            maxHp = isElite ? 5 : 2;
        } else if (currentDifficulty === 'easy') {
            maxHp = isElite ? 2 : 1;
        }

        let speedMultiplier = 1.0;
        if (currentDifficulty === 'easy') speedMultiplier = 0.65;
        if (currentDifficulty === 'hard') speedMultiplier = 1.45;

        let speed = isElite ? 0.06 : 0.09 + Math.random() * 0.05;
        speed *= speedMultiplier;

        if (isElite) {
            coreGeo = new THREE.OctahedronGeometry(1.2, 0);
            mat = new THREE.MeshStandardMaterial({
                color: 0xff0055,
                roughness: 0.2,
                emissive: 0xff0055,
                emissiveIntensity: 0.7
            });
            const core = new THREE.Mesh(coreGeo, mat);
            enemyMesh.add(core);

            const ringGeo = new THREE.TorusGeometry(1.6, 0.15, 8, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            enemyMesh.add(ring);
        } else {
            coreGeo = new THREE.ConeGeometry(0.7, 1.4, 4);
            mat = new THREE.MeshStandardMaterial({
                color: 0xffaa00,
                roughness: 0.2,
                emissive: 0xffaa00,
                emissiveIntensity: 0.5
            });
            const core = new THREE.Mesh(coreGeo, mat);
            core.rotation.x = Math.PI / 2;
            enemyMesh.add(core);
        }

        const spawnOriginX = player ? player.position.x : 0;
        const spawnOriginZ = player ? player.position.z : 8;
        enemyMesh.position.set(
            spawnOriginX + (Math.random() - 0.5) * 42,
            0,
            spawnOriginZ - 43
        );

        scene.add(enemyMesh);
        enemies.push({
            mesh: enemyMesh,
            isElite: isElite,
            hp: maxHp,
            maxHp: maxHp,
            speed: speed,
            shootTimer: isElite ? Math.random() * 60 : 0
        });
    }

    // 回復・パワーアップアイテム出現
    function spawnItem(presetPos = null, forcedType = null) {
        if (!isGameStarted || isGameOver || isPaused || items.length >= MAX_ITEMS) return;

        const types = ['shield', 'rapidfire', 'multishot', 'invincible'];
        const chosenType = forcedType || types[Math.floor(Math.random() * types.length)];

        let color = 0xffffff;
        if (chosenType === 'shield') color = 0x00ffff;
        if (chosenType === 'rapidfire') color = 0xff5500;
        if (chosenType === 'multishot') color = 0xff00ff;
        if (chosenType === 'repair') color = 0x00ff55;
        if (chosenType === 'invincible') color = 0xffd700;

        const group = new THREE.Group();

        const geo = new THREE.IcosahedronGeometry(0.7, 0);
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.1,
            metalness: 0.9,
            emissive: color,
            emissiveIntensity: 0.8
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);

        const frameGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
        const frameMat = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        group.add(frame);

        if (presetPos) {
            group.position.copy(presetPos);
        } else {
            const spawnOriginX = player ? player.position.x : 0;
            const spawnOriginZ = player ? player.position.z : 8;
            group.position.set(
                spawnOriginX + (Math.random() - 0.5) * 36,
                0.5,
                spawnOriginZ - 43
            );
        }

        scene.add(group);
        items.push({
            mesh: group,
            type: chosenType,
            color: color,
            speed: presetPos ? 0.05 : 0.12
        });
    }

    // 撃破パーティクル
    function createExplosion(pos, color, count = 12) {
        const availableSlots = Math.max(0, MAX_PARTICLES - particles.length);
        const reducedCount = Math.min(
            availableSlots,
            18,
            Math.max(2, Math.ceil(count * 0.35))
        );

        for (let i = 0; i < reducedCount; i++) {
            const size = 0.13 + Math.random() * 0.16;
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9
            });
            const particleMesh = new THREE.Mesh(geometry, material);
            particleMesh.position.copy(pos);

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.34,
                (Math.random() - 0.5) * 0.16,
                (Math.random() - 0.5) * 0.34
            );

            scene.add(particleMesh);
            particles.push({
                mesh: particleMesh,
                velocity: velocity,
                life: 22 + Math.floor(Math.random() * 12),
                maxLife: 34
            });
        }
    }

    function damageEnemy(enemy, enemyIndex, baseDamage, impactPos, color, sourceKind) {
        let damage = baseDamage;
        if (sourceKind === 'main' && currentSelectedType === 'horizon' && enemy.isElite) {
            damage *= 2.0;
        }

        createExplosion(impactPos, color, enemy.isBoss ? 14 : (sourceKind === 'beam' ? 10 : 5));
        enemy.hp -= damage;
        if (!enemy.isBoss) {
            enemy.mesh.position.z -= sourceKind === 'beam' ? 0.55 : 0.25;
        }

        if (enemy.isBoss) updateBossUI(enemy);
        if (enemy.hp > 0) return;

        if (enemy.isBoss) {
            defeatBoss(enemy, enemyIndex);
            return;
        }

        createExplosion(
            enemy.mesh.position,
            enemy.isElite ? 0xff0055 : 0xffaa00,
            enemy.isElite ? 25 : 12
        );

        if (enemy.isElite && Math.random() < 0.35) {
            spawnItem(enemy.mesh.position.clone(), 'repair');
        }

        const earnedScore = enemy.isElite ? 250 : 100;
        disposeObject3D(enemy.mesh);
        enemies.splice(enemyIndex, 1);
        addScore(earnedScore);
    }

    // 当たり判定・衝突処理
    function handleCollisions() {
        if (isGameOver || !isGameStarted) return;

        const playerRadius = 1.1;

        // 1. プレイヤー vs アイテム
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (!item || !item.mesh) continue;
            const dist = player.position.distanceTo(item.mesh.position);
            if (dist < 3.5) {
                applyPowerup(item.type);
                createExplosion(item.mesh.position, item.color, 15);
                disposeObject3D(item.mesh);
                
                items.splice(i, 1);
            }
        }

        // 2. 弾丸 vs 敵 / プレイヤー
        for (let b = bullets.length - 1; b >= 0; b--) {
            const bullet = bullets[b];
            if (!bullet || !bullet.mesh) continue;

            if (bullet.isEnemy) {
                const dist = player.position.distanceTo(bullet.mesh.position);
                if (dist < playerRadius + 0.4) {
                    let enemyDmg = 12;
                    if (currentDifficulty === 'hard') enemyDmg = 18;
                    if (currentDifficulty === 'easy') enemyDmg = 8;
                    if (bullet.bossDamage) enemyDmg = bullet.bossDamage;

                    takeDamage(enemyDmg);
                    disposeObject3D(bullet.mesh);
                    bullets.splice(b, 1);
                }
            } else if (bullet.kind === 'beam') {
                for (let e = enemies.length - 1; e >= 0; e--) {
                    const enemy = enemies[e];
                    if (!enemy || !enemy.mesh || bullet.hitEnemies.has(enemy)) continue;
                    const enemyRadius = enemy.isBoss ? 3.4 : (enemy.isElite ? 1.6 : 0.9);
                    const inBeamDepth = enemy.mesh.position.z <= bullet.beamStartZ + enemyRadius &&
                        enemy.mesh.position.z >= bullet.beamEndZ - enemyRadius;
                    const inBeamWidth = Math.abs(enemy.mesh.position.x - bullet.beamX) <
                        enemyRadius + bullet.collisionRadius;
                    if (inBeamDepth && inBeamWidth) {
                        bullet.hitEnemies.add(enemy);
                        damageEnemy(
                            enemy,
                            e,
                            bullet.damage,
                            enemy.mesh.position.clone(),
                            bullet.color,
                            bullet.kind
                        );
                    }
                }
            } else {
                for (let e = enemies.length - 1; e >= 0; e--) {
                    const enemy = enemies[e];
                    if (!enemy || !enemy.mesh || bullet.ignoreEnemy === enemy) continue;
                    
                    const dist = bullet.mesh.position.distanceTo(enemy.mesh.position);
                    const enemyRadius = enemy.isBoss ? 3.4 : (enemy.isElite ? 1.6 : 0.9);

                    if (dist < enemyRadius + (bullet.collisionRadius || 0.3)) {
                        const impactPos = bullet.mesh.position.clone();
                        disposeObject3D(bullet.mesh);
                        bullets.splice(b, 1);

                        if (bullet.kind === 'vortexMax') {
                            createExplosion(impactPos, bullet.color, 36);
                            spawnVortexFragments(impactPos, bullet.color, enemy);
                        }

                        damageEnemy(enemy, e, bullet.damage, impactPos, bullet.color, bullet.kind);
                        break;
                    }
                }
            }
        }

        // 3. 敵機 vs プレイヤー物理接触
        for (let e = enemies.length - 1; e >= 0; e--) {
            const enemy = enemies[e];
            if (!enemy || !enemy.mesh) continue;
            
            const dist = player.position.distanceTo(enemy.mesh.position);
            const enemyRadius = enemy.isBoss ? 3.2 : (enemy.isElite ? 1.4 : 0.8);

            if (dist < playerRadius + enemyRadius) {
                if (enemy.isBoss) {
                    if (enemy.contactCooldown <= 0) {
                        if (invincibleTimer <= 0) {
                            let contactDmg = 30;
                            if (currentDifficulty === 'easy') contactDmg = 20;
                            if (currentDifficulty === 'hard') contactDmg = 40;
                            takeDamage(contactDmg);
                        }
                        enemy.contactCooldown = 60;
                        const pushDirection = player.position.clone().sub(enemy.mesh.position);
                        pushDirection.y = 0;
                        if (pushDirection.lengthSq() > 0) {
                            player.position.addScaledVector(pushDirection.normalize(), 2.5);
                            constrainPlayerToBossArena();
                        }
                    }
                    continue;
                }

                if (invincibleTimer > 0) {
                    createExplosion(enemy.mesh.position, 0xffd700, 20);
                    const earnedScore = enemy.isElite ? 350 : 100;
                    disposeObject3D(enemy.mesh);
                    enemies.splice(e, 1);
                    addScore(earnedScore);
                } else {
                    let contactDmg = enemy.isElite ? 40 : 25;
                    if (currentDifficulty === 'hard') contactDmg *= 1.35;
                    if (currentDifficulty === 'easy') contactDmg *= 0.7;

                    takeDamage(Math.round(contactDmg));
                    createExplosion(enemy.mesh.position, 0xff0000, 15);
                    disposeObject3D(enemy.mesh);
                    enemies.splice(e, 1);
                }
            }
        }
    }

    // アニメーションループ
    function animate() {
        requestAnimationFrame(animate);

        if (isPaused) {
            renderer.render(scene, camera);
            return;
        }

        if (isGameStarted && !isGameOver && player) {
            if (isSurvivalMode) {
                survivalTimer -= 1 / 60;
                if (survivalTimer <= 0) {
                    survivalTimer = 0;
                    triggerMissionClear();
                }
                const timerText = document.getElementById('survival-timer-text');
                if (timerText) timerText.innerText = survivalTimer.toFixed(1) + "s";
            }

            if (shootCooldown > 0) shootCooldown--;

            if (invincibleTimer > 0) invincibleTimer--;
            if (multishotTimer > 0) multishotTimer--;
            if (rapidfireTimer > 0) rapidfireTimer--;
            updateSubWeaponState();
            updateQuickBoostState();
            updateVortexChargeState();

            if (barrierVisual) {
                barrierVisual.material.opacity = (shieldStrength > 0) ? 0.25 + Math.sin(Date.now() * 0.01) * 0.1 : 0.0;
                barrierVisual.rotation.y += 0.02;
                barrierVisual.rotation.z += 0.01;
            }
            if (invincibleBarrierVisual) {
                if (invincibleTimer > 60) {
                    invincibleBarrierVisual.material.opacity = 0.4 + Math.sin(Date.now() * 0.02) * 0.15;
                    invincibleBarrierVisual.rotation.y -= 0.03;
                } else if (invincibleTimer > 0) {
                    invincibleBarrierVisual.material.opacity = (Math.floor(invincibleTimer / 4) % 2 === 0) ? 0.3 : 0.0;
                } else {
                    invincibleBarrierVisual.material.opacity = 0.0;
                }
            }

            updatePowerUpUI();

            let isPrecisionTriggered = keys['ShiftRight'] || isMousePressing;
            let speed = isPrecisionTriggered ? 0.10 : 0.32;

            let finalDirection = new THREE.Vector3();

            if (keys['KeyA']) finalDirection.x -= 1;
            if (keys['KeyD']) finalDirection.x += 1;
            if (keys['KeyW']) finalDirection.z -= 1;
            if (keys['KeyS']) finalDirection.z += 1;

            if (joystickActive && moveDirection.lengthSq() > 0) {
                finalDirection.copy(moveDirection);
            } else if (!joystickActive) {
                moveDirection.set(0, 0, 0);
            }

            finalDirection.normalize();

            if (quickBoostRequested) {
                tryQuickBoost(finalDirection);
                quickBoostRequested = false;
            }

            player.position.addScaledVector(finalDirection, speed);

            if (quickBoostFrames > 0) {
                const boostProgress = quickBoostFrames / QUICK_BOOST_DURATION;
                const boostStep = QUICK_BOOST_SPEED * (0.45 + 0.55 * boostProgress);
                player.position.addScaledVector(quickBoostDirection, boostStep);
                quickBoostFrames--;
            }

            constrainPlayerToBossArena();

            player.rotation.z = -finalDirection.x * 0.35;
            player.rotation.x = finalDirection.z * 0.15;

            // 固定境界を廃止。グリッドを自機の近くへ再配置し、半無限フィールドに見せる
            if (gridHelper) {
                gridHelper.position.x = Math.round(player.position.x / 20) * 20;
                gridHelper.position.z = Math.round(player.position.z / 20) * 20;
            }

            if (!isSurvivalMode) {
                fireWeapons();
            }

            if (playerThruster) {
                const boostFlare = quickBoostFrames > 0 ? 1.9 : 1.0;
                playerThruster.scale.setScalar((0.85 + Math.random() * 0.3) * boostFlare);
            }

            // 矢印キーを押している間、上下・左右の視点を少しずつ変更する。
            // キーを離した後も選んだ角度を維持し、追従補間でシームレスに移動する。
            const isViewUpPressed = keys['ArrowUp'] && !keys['ArrowDown'];
            const isViewDownPressed = keys['ArrowDown'] && !keys['ArrowUp'];
            const isViewLeftPressed = keys['ArrowLeft'] && !keys['ArrowRight'];
            const isViewRightPressed = keys['ArrowRight'] && !keys['ArrowLeft'];

            if (isViewUpPressed) {
                cameraViewLevel = Math.min(CAMERA_VIEW_MAX, cameraViewLevel + CAMERA_VIEW_CHANGE_SPEED);
            } else if (isViewDownPressed) {
                cameraViewLevel = Math.max(CAMERA_VIEW_MIN, cameraViewLevel - CAMERA_VIEW_CHANGE_SPEED);
            }
            if (isViewLeftPressed) {
                cameraHorizontalLevel = Math.max(CAMERA_VIEW_MIN, cameraHorizontalLevel - CAMERA_VIEW_CHANGE_SPEED);
            } else if (isViewRightPressed) {
                cameraHorizontalLevel = Math.min(CAMERA_VIEW_MAX, cameraHorizontalLevel + CAMERA_VIEW_CHANGE_SPEED);
            }

            const cameraViewAmount = Math.abs(cameraViewLevel);
            const targetViewY = cameraViewLevel >= 0 ? 28.0 : 4.0;
            const targetViewDistance = cameraViewLevel >= 0 ? 8.5 : 18.0;
            const cameraDistance = THREE.MathUtils.lerp(12.0, targetViewDistance, cameraViewAmount);
            const targetCamY = THREE.MathUtils.lerp(14.5, targetViewY, cameraViewAmount);
            const lookAheadDistance = THREE.MathUtils.lerp(
                3.5,
                cameraViewLevel >= 0 ? 5.5 : 2.0,
                cameraViewAmount
            );

            // 注視点の周囲を左右に回り込み、機体と進行方向を見失わない範囲で旋回する。
            const cameraHorizontalAngle = cameraHorizontalLevel * CAMERA_HORIZONTAL_MAX_ANGLE;
            const orbitCenterX = player.position.x;
            const orbitCenterZ = player.position.z - lookAheadDistance;
            const orbitRadius = cameraDistance + lookAheadDistance;
            const targetCamX = orbitCenterX + Math.sin(cameraHorizontalAngle) * orbitRadius;
            const targetCamZ = orbitCenterZ + Math.cos(cameraHorizontalAngle) * orbitRadius;

            camera.position.x += (targetCamX - camera.position.x) * 0.11;
            camera.position.y += (targetCamY - camera.position.y) * 0.11;
            camera.position.z += (targetCamZ - camera.position.z) * 0.11;

            const lookAtTarget = new THREE.Vector3(
                player.position.x, 
                0, 
                player.position.z - lookAheadDistance
            );
            camera.lookAt(lookAtTarget);

            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                if (b.kind === 'beam') {
                    b.life--;
                    b.beamAge = (b.beamAge || 0) + 1;
                    const fade = Math.max(0, b.life / (b.maxLife || 22));
                    const pulse = 1 + Math.sin(b.beamAge * 0.9) * 0.12;

                    if (b.core && b.core.material) {
                        b.core.material.opacity = 0.96 * fade;
                    }
                    if (b.innerGlow && b.innerGlow.material) {
                        b.innerGlow.material.opacity = 0.54 * fade;
                        b.innerGlow.scale.set(pulse, 1, pulse);
                    }
                    if (b.outerGlow && b.outerGlow.material) {
                        b.outerGlow.material.opacity = 0.20 * fade;
                        const outerPulse = 1.15 - (pulse - 1) * 0.7;
                        b.outerGlow.scale.set(outerPulse, 1, outerPulse);
                    }
                    if (b.muzzleFlash && b.muzzleFlash.material) {
                        b.muzzleFlash.material.opacity = 0.72 * fade;
                        const muzzlePulse = 0.75 + pulse * 0.28;
                        b.muzzleFlash.scale.set(muzzlePulse, muzzlePulse, 0.65 + pulse * 0.12);
                    }
                    if (b.tipFlash && b.tipFlash.material) {
                        b.tipFlash.material.opacity = 0.45 * fade;
                        const tipPulse = 0.70 + pulse * 0.32;
                        b.tipFlash.scale.set(tipPulse, tipPulse, 1.25 + pulse * 0.22);
                    }
                    if (b.energyRings) {
                        b.energyRings.forEach((ring, ringIndex) => {
                            const travel = (b.beamAge * 2.7 + ringIndex * (b.beamLength / 2)) % b.beamLength;
                            ring.position.z = b.beamLength / 2 - travel;
                            ring.rotation.z += ringIndex === 0 ? 0.18 : -0.14;
                            ring.material.opacity = 0.68 * fade;
                            const ringPulse = 0.88 + Math.sin(b.beamAge * 0.7 + ringIndex * Math.PI) * 0.14;
                            ring.scale.setScalar(ringPulse);
                        });
                    }
                } else {
                    if (b.kind === 'missile') {
                        if (!b.target || !b.target.mesh || !enemies.includes(b.target)) {
                            b.target = getMissileTargets()[0] || null;
                        }
                        if (b.target && b.target.mesh) {
                            const desiredVelocity = b.target.mesh.position.clone()
                                .sub(b.mesh.position)
                                .normalize()
                                .multiplyScalar(0.48);
                            b.velocity.lerp(desiredVelocity, b.turnRate);
                        }
                        b.life--;
                        b.mesh.lookAt(b.mesh.position.clone().add(b.velocity));
                    } else if (b.kind === 'enemy') {
                        b.life--;
                    } else if (
                        b.kind === 'vortexCharge' ||
                        b.kind === 'vortexMax' ||
                        b.kind === 'vortexFragment' ||
                        b.kind === 'redlineSpread'
                    ) {
                        b.life--;
                        b.mesh.rotation.x += 0.08;
                        b.mesh.rotation.y += 0.11;
                    }
                    b.mesh.position.add(b.velocity);
                }

                const relativeX = b.mesh.position.x - player.position.x;
                const relativeZ = b.mesh.position.z - player.position.z;
                const specialExpired = (
                    b.kind === 'missile' ||
                    b.kind === 'beam' ||
                    b.kind === 'enemy' ||
                    b.kind === 'vortexCharge' ||
                    b.kind === 'vortexMax' ||
                    b.kind === 'vortexFragment' ||
                    b.kind === 'redlineSpread'
                ) && b.life <= 0;
                if (specialExpired || Math.abs(relativeZ) > 90 || Math.abs(relativeX) > 90) {
                    disposeObject3D(b.mesh);
                    bullets.splice(i, 1);
                }
            }

            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];

                if (e.isBoss) {
                    updateBoss(e);
                    continue;
                }

                e.mesh.position.z += e.speed;

                let eliteCooldown = 110;
                if (currentDifficulty === 'hard') eliteCooldown = 75;
                if (currentDifficulty === 'easy') eliteCooldown = 160;

                if (e.isElite) {
                    e.shootTimer++;
                    if (e.shootTimer > eliteCooldown) {
                        e.shootTimer = 0;
                        const enemyPos = e.mesh.position.clone();
                        let bulletSpeed = 0.24;
                        if (currentDifficulty === 'easy') bulletSpeed = 0.16;
                        if (currentDifficulty === 'hard') bulletSpeed = 0.32;

                        const targetDir = player.position.clone().sub(enemyPos).normalize().multiplyScalar(bulletSpeed);
                        createBullet(enemyPos.add(new THREE.Vector3(0, 0, 1.2)), targetDir, 0xff0000, 240, 1.0, true);
                    }
                }
                else if (isSurvivalMode) {
                    e.shootTimer = (e.shootTimer || 0) + 1;
                    if (e.shootTimer > 130) {
                        e.shootTimer = 0;
                        const enemyPos = e.mesh.position.clone();
                        createBullet(enemyPos.add(new THREE.Vector3(0, 0, 1.2)), new THREE.Vector3(0, 0, 0.2), 0xffaa00, 240, 0.8, true);
                    }
                }

                if (e.mesh.position.z > player.position.z + 28 || Math.abs(e.mesh.position.x - player.position.x) > 80) {
                    disposeObject3D(e.mesh);
                    enemies.splice(i, 1);
                }
            }

            for (let i = items.length - 1; i >= 0; i--) {
                const item = items[i];
                item.mesh.position.z += item.speed;
                item.mesh.rotation.x += 0.02;
                item.mesh.rotation.y += 0.03;

                if (item.mesh.position.z > player.position.z + 28 || Math.abs(item.mesh.position.x - player.position.x) > 80) {
                    disposeObject3D(item.mesh);
                    items.splice(i, 1);
                }
            }
        } else if (isGameOver || document.getElementById('mission-clear').style.display === 'block') {
            camera.position.x += (0 - camera.position.x) * 0.05;
            camera.position.y += (15 - camera.position.y) * 0.05;
            camera.position.z += (18 - camera.position.z) * 0.05;
            camera.lookAt(0, 0, -2);
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.mesh.position.add(p.velocity);
            p.life--;
            p.mesh.material.opacity = Math.max(0, Math.min(1, p.life / (p.maxLife || 34)));

            if (p.life <= 0) {
                disposeObject3D(p.mesh);
                particles.splice(i, 1);
            }
        }

        handleCollisions();

        renderer.render(scene, camera);
    }

    // パワーアップ状態のUIバッジ更新
    function updatePowerUpUI() {
        const badgeInv = document.getElementById('badge-invincible');
        const badgeMulti = document.getElementById('badge-multishot');
        const badgeRapid = document.getElementById('badge-rapidfire');
        const badgeShield = document.getElementById('badge-shield');

        if (invincibleTimer > 0) {
            badgeInv.style.display = 'flex';
            document.getElementById('val-invincible').innerText = (invincibleTimer / 60).toFixed(1);
        } else {
            badgeInv.style.display = 'none';
        }

        if (multishotTimer > 0) {
            badgeMulti.style.display = 'flex';
            document.getElementById('val-multishot').innerText = (multishotTimer / 60).toFixed(1);
        } else {
            badgeMulti.style.display = 'none';
        }

        if (rapidfireTimer > 0) {
            badgeRapid.style.display = 'flex';
            document.getElementById('val-rapidfire').innerText = (rapidfireTimer / 60).toFixed(1);
        } else {
            badgeRapid.style.display = 'none';
        }

        if (shieldStrength > 0) {
            badgeShield.style.display = 'flex';
            document.getElementById('val-shield').innerText = shieldStrength;
        } else {
            badgeShield.style.display = 'none';
        }
    }

    // パワーアップ効果適用
    function applyPowerup(type) {
        if (type === 'shield') {
            shieldStrength = Math.min(2, shieldStrength + 1); 
            showNotification("SHIELD ACTIVE", "#00ffff");
        } 
        else if (type === 'repair') {
            playerHP = Math.min(100, playerHP + 10);
            const hpBar = document.getElementById('hp-bar');
            if (hpBar) hpBar.style.width = playerHP + '%';
            showNotification("REPAIR COMPLETED (+10 HP)", "#00ff55");
        }
        else if (type === 'rapidfire') {
            if (!isSurvivalMode) {
                rapidfireTimer = 480; 
                showNotification("RAPID FIRE ENGAGED", "#ff5500");
            } else {
                showNotification("RAPID POWER DISCARDED (DODGE MODE)", "#ff5500");
            }
        } 
        else if (type === 'multishot') {
            if (!isSurvivalMode) {
                multishotTimer = 480; 
                showNotification("MULTISHOT ACTIVE", "#ff00ff");
            } else {
                showNotification("MULTI SHOT DISCARDED (DODGE MODE)", "#ff00ff");
            }
        } 
        else if (type === 'invincible') {
            invincibleTimer = 420; 
            showNotification("NANO-BARRIER INVINCIBLE", "#ffd700");
        }
    }
