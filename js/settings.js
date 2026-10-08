/* =========================================================
   커피 러시 - 설정 (오른쪽 위 ⚙ 버튼)
   - 구글 로그인: 닉네임 변경 · 내 기록(연승 · 승률) · 말 색 · 소리 · 로그아웃
   - 게스트: 소리 · "로그인하면 기록이 저장돼요" 안내
   설정과 기록은 이 브라우저에 저장됨 (localStorage)
   구글 로그인을 연결하면 로그인할 때 saveSet()으로 user를 넣어 주면 됨
     예) set.user = { nickname: '민지' }; saveSet();
   ========================================================= */


/* ===== 저장된 설정 불러오기 ===== */
const SET_KEY = 'coffeeRush';

// 처음 쓰는 사람의 기본값
function baseSet() {
  return {
    user: null,       // 로그인한 사람 { nickname } · 게스트면 null
    sound: true,      // 소리 켜기
    pawn: 'red',      // 내 말 색: 'red' 또는 'blue' (AI는 반대 색)
    wins: 0,          // 이긴 판
    losses: 0,        // 진 판
    ties: 0,          // 비긴 판 (공동 승리)
    streak: 0,        // 지금 몇 연승 중인지
  };
}

function loadSet() {
  try {
    return Object.assign(baseSet(), JSON.parse(localStorage.getItem(SET_KEY)));
  } catch (e) {
    return baseSet();   // 저장된 게 없거나 읽을 수 없으면 기본값
  }
}

let set = loadSet();

function saveSet() {
  try {
    localStorage.setItem(SET_KEY, JSON.stringify(set));
  } catch (e) {
    // 저장이 막힌 브라우저(시크릿 창 등)에서는 이번 접속 동안만 유지
  }
}

// 로그인했으면 닉네임을 게임 화면에 씀 ("(닉네임) 바리스타")
nickname = set.user ? set.user.nickname : null;


/* ===== 말 색 =====
   <html>에 blue 클래스가 있으면 내 말이 파랑, AI 말이 빨강 (css: --pawn-me · --pawn-ai) */
function applyPawn() {
  document.documentElement.classList.toggle('blue', set.pawn === 'blue');
}
applyPawn();


/* ===== 소리 =====
   효과음을 만들면 소리를 내기 전에 soundOn()으로 확인
   예) if (soundOn()) new Audio('../sound/serve.mp3').play(); */
function soundOn() {
  return set.sound;
}


/* ===== 기록: 게임이 끝날 때 한 번 (turn.js의 nextTurn에서 부름) =====
   게스트는 저장하지 않음 */
function saveRecord() {
  if (!set.user || game.recorded) return;
  game.recorded = true;   // 같은 판을 두 번 세지 않게

  const win = winner();
  if (win === 'me') {
    set.wins += 1;
    set.streak += 1;
  } else if (win === 'ai') {
    set.losses += 1;
    set.streak = 0;
  } else {
    set.ties += 1;
    set.streak = 0;       // 비기면 연승이 끊김
  }
  saveSet();
}

// 승률(%) = 이긴 판 ÷ 전체 판 (한 판도 안 했으면 0)
function winRate() {
  const all = set.wins + set.losses + set.ties;
  return all ? Math.round((set.wins / all) * 100) : 0;
}


/* ===== 설정 창 그리기 ===== */

// 닉네임에 < > 같은 글자가 있어도 글자 그대로 보이게
function esc(text) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function drawSet() {
  const sound = `
    <div class="set-row">
      <div><b>소리</b><small>효과음 켜기 · 끄기</small></div>
      <button class="sw ${set.sound ? 'on' : ''}" type="button" id="soundBtn" aria-pressed="${set.sound}">
        <i></i><span>${set.sound ? '켜짐' : '꺼짐'}</span>
      </button>
    </div>`;

  // 게스트
  if (!set.user) {
    $('setBody').innerHTML = `
      <div class="set-box who">
        <span class="face">G</span>
        <div><b>게스트</b><small>체험판으로 플레이 중</small></div>
      </div>
      <div class="set-box">${sound}</div>
      <div class="set-note">
        <b>로그인하면 기록이 저장돼요</b>
        <small>닉네임 · 연승 · 승률 · 말 색을 쓸 수 있어요</small>
        <a class="set-btn main" href="../index.html" id="toLogin">로그인하러 가기</a>
      </div>`;
    return;
  }

  // 구글 로그인
  const name = esc(set.user.nickname);
  $('setBody').innerHTML = `
    <div class="set-box">
      <div class="who">
        <span class="face">${name.charAt(0)}</span>
        <div><b>${name} 바리스타</b><small>구글 계정으로 로그인됨</small></div>
      </div>
      <label class="set-label" for="nickInput">닉네임</label>
      <div class="nick">
        <input id="nickInput" type="text" maxlength="8" value="${name}" placeholder="최대 8글자">
        <button class="set-btn" type="button" id="nickBtn">바꾸기</button>
      </div>
      <small class="nick-msg" id="nickMsg"></small>
    </div>

    <div class="set-box">
      <span class="set-label">내 기록</span>
      <div class="rec">
        <div><b>${set.streak}</b><small>연승</small></div>
        <div><b>${winRate()}<em>%</em></b><small>승률</small></div>
        <div><b>${set.wins}<em>승</em> ${set.losses}<em>패</em></b><small>전적</small></div>
      </div>
    </div>

    <div class="set-box">
      <div class="set-row">
        <div><b>내 말 색</b><small>AI 말은 반대 색이 돼요</small></div>
        <div class="colors">
          <button class="color ${set.pawn === 'red' ? 'on' : ''}" type="button" data-pawn="red"><i class="red"></i>빨강</button>
          <button class="color ${set.pawn === 'blue' ? 'on' : ''}" type="button" data-pawn="blue"><i class="blue"></i>파랑</button>
        </div>
      </div>
      <div class="line"></div>
      ${sound}
    </div>

    <button class="set-btn out" type="button" id="logoutBtn">로그아웃</button>`;
}


/* ===== 설정 창 열기 · 닫기 · 버튼 ===== */
function openSet() {
  drawSet();
  $('set').hidden = false;
}
function closeSet() {
  $('set').hidden = true;
}

// 닉네임 바꾸기 (빈칸은 안 됨)
function changeNick() {
  const text = $('nickInput').value.trim();
  if (!text) {
    $('nickMsg').textContent = '닉네임을 적어 주세요';
    return;
  }
  set.user.nickname = text;
  nickname = text;
  saveSet();
  draw();        // 게임 화면의 "(닉네임) 바리스타"도 바뀜
  drawSet();
  $('nickMsg').textContent = '닉네임을 바꿨어요';
}

function logout() {
  set.user = null;
  nickname = null;
  saveSet();
  draw();
  drawSet();     // 게스트 화면으로
}

$('setBtn').addEventListener('click', openSet);
$('setClose').addEventListener('click', closeSet);
$('set').addEventListener('click', (e) => {
  if (e.target === $('set')) closeSet();   // 어두운 바깥을 누르면 닫힘
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSet();
  if (e.key === 'Enter' && e.target.id === 'nickInput') changeNick();
});

// 창 안의 버튼들 (그릴 때마다 새로 생기므로 감싸는 상자에 한 번만 연결)
$('setBody').addEventListener('click', (e) => {
  if (e.target.closest('#soundBtn')) {
    set.sound = !set.sound;
    saveSet();
    drawSet();
  }
  const color = e.target.closest('[data-pawn]');
  if (color) {
    set.pawn = color.dataset.pawn;
    saveSet();
    applyPawn();
    drawSet();
  }
  if (e.target.closest('#toLogin')) {
    try { sessionStorage.setItem('coffeeRushLogin', '1'); } catch (err) {}   // 메인에서 로그인 창을 바로 열게
  }
  if (e.target.closest('#nickBtn')) changeNick();
  if (e.target.closest('#logoutBtn')) logout();
});
