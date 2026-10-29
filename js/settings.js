/* =========================================================
   커피 러시 - 설정 (오른쪽 위 ⚙ 버튼)
   - 구글 로그인: 닉네임 변경 · 내 기록(승률 · 전적) · 말 색 · 소리 · 로그아웃
   - 게스트: 소리 · "로그인하면 기록이 저장돼요" 안내
   설정과 기록은 이 브라우저에 저장됨 (localStorage)
   로그인한 사람의 기록(닉네임 · 승 · 패 · 무)은 Firebase DB에도 저장 (firebase.js의 saveDB)
   로그인은 메인 화면(main.js)에서 하고, 성공하면 user · 기록을 이 저장 칸에 넣어 줌
   처음 온 사람은 닉네임 정하기 창(openWelcome), 다시 온 사람은 인사(sayHi) — click.js 맨 끝에서 부름
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

// 게스트는 쉬움만 (보통은 로그인하면 열림)
if (!set.user) mode = 'easy';


/* ===== 말 색 =====
   <html>에 blue 클래스가 있으면 내 말이 파랑, AI 말이 빨강 (css: --pawn-me · --pawn-ai)
   말 색은 로그인한 사람만 → 게스트는 항상 빨강 · 고른 색은 DB에도 저장(다른 기기에서도 같은 색) */
function applyPawn() {
  document.documentElement.classList.toggle('blue', !!set.user && set.pawn === 'blue');
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
  if (win === 'me') set.wins += 1;
  else if (win === 'ai') set.losses += 1;
  else set.ties += 1;

  saveSet();
  saveDB(myRec());   // DB에도 저장
}

// DB에 보낼 내 기록
function myRec() {
  return { nickname: set.user.nickname, wins: set.wins, losses: set.losses, ties: set.ties, pawn: set.pawn };
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
        <small>내 닉네임으로 플레이 · 승률 · 전적 기록</small>
        <button class="g-btn" type="button"><img src="../logo/Google.svg" alt="Google로 계속하기"></button>
        <small class="g-wait">로그인 중…</small>
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
  saveDB(myRec());
  draw();        // 게임 화면의 "(닉네임) 바리스타"도 바뀜
  drawSet();
  $('nickMsg').textContent = '닉네임을 바꿨어요';
}

function logout() {
  if (window.googleLogout) googleLogout();
  set.user = null;
  nickname = null;
  set.pawn = 'red';                // 게스트는 빨강 (내 색은 DB에 있어서 다시 로그인하면 돌아옴)
  applyPawn();
  if (game.table) mode = 'easy';   // 게임 준비 중이면 바로 쉬움으로 (게임 중이면 다음 판부터)
  saveSet();
  draw();
  drawSet();     // 게스트 화면으로
}

/* ===== 처음 온 사람: 닉네임 정하기 창 (구글 로그인 직후 한 번) =====
   닉네임을 정해야 DB에 기록이 생김 → 정하지 않고 나가면 다음 로그인 때 다시 물어봄 */
function openWelcome() {
  $('hello').hidden = false;
  $('helloInput').focus();
}

// [튜토리얼 먼저] → tutorialFirst = true, [바로 시작] → false
function makeUser(tutorialFirst) {
  const text = $('helloInput').value.trim();
  if (!text) {
    $('helloMsg').textContent = '닉네임을 적어 주세요';
    $('helloInput').focus();
    return;
  }
  set.user = { nickname: text };
  set.wins = 0;
  set.losses = 0;
  set.ties = 0;
  nickname = text;
  saveSet();
  // 이때 DB에 내 기록이 처음 생김 (결과 창에서 로그인했으면 방금 끝낸 판이 첫 기록 · saveRecord가 DB에도 저장)
  if (game.over && !game.recorded) saveRecord();
  else saveDB(myRec());
  $('hello').hidden = true;
  if (tutorialFirst) startTutorial();
  else draw();       // 게임 준비 화면의 "(닉네임) 바리스타"
}


/* ===== 게임 화면에서 바로 구글 로그인 (설정 창 · 결과 창의 Google 버튼) =====
   다시 온 사람: 기록을 불러오고 인사 · 지금 판은 기록하지 않음 (다음 판부터 · 이긴 판만 골라 저장하는 걸 막음)
   처음 온 사람: 닉네임 정하기 창 → 지금 판이 첫 기록 (끝났으면 바로, 하는 중이면 끝날 때) */
async function gameLogin() {
  if (typeof googleLogin !== 'function') return;   // Firebase를 아직 받는 중
  document.body.classList.add('logging');          // 버튼을 흐리게 + "로그인 중…"
  try {
    const rec = await googleLogin();   // 처음 온 사람은 null
    applyLogin(set, rec);
    saveSet();
    applyPawn();                       // 다시 온 사람: 계정에 저장된 말 색으로
    if (rec) {
      game.recorded = true;
      game.login = 'back';
      nickname = set.user.nickname;
      draw();
      drawSet();
      sayHi();
    } else {
      game.login = 'new';
      closeSet();
      openWelcome();
    }
  } catch (e) {
    console.log('로그인 취소 또는 실패', e);   // 창을 닫았을 때 등 → 그대로 둠
  }
  document.body.classList.remove('logging');
}


/* ===== 다시 온 사람: 인사 (2.5초 뒤 사라짐) ===== */
function sayHi() {
  if (!set.user) return;
  $('hi').textContent = `다시 오셨네요, ${set.user.nickname} 바리스타님!`;
  $('hi').hidden = false;
  setTimeout(() => { $('hi').hidden = true; }, 2500);
}


$('setBtn').addEventListener('click', openSet);
$('setClose').addEventListener('click', closeSet);
$('set').addEventListener('click', (e) => {
  if (e.target === $('set')) closeSet();   // 어두운 바깥을 누르면 닫힘
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSet();
  if (e.key === 'Enter' && e.target.id === 'nickInput') changeNick();
  if (e.key === 'Enter' && e.target.id === 'helloInput') makeUser(false);
});

$('resultLogin').addEventListener('click', (e) => {
  if (e.target.closest('.g-btn')) gameLogin();
});
$('helloTut').addEventListener('click', () => makeUser(true));
$('helloGo').addEventListener('click', () => makeUser(false));

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
    saveDB(myRec());   // 다른 기기에서도 같은 색
    applyPawn();
    drawSet();
  }
  if (e.target.closest('.g-btn')) gameLogin();
  if (e.target.closest('#nickBtn')) changeNick();
  if (e.target.closest('#logoutBtn')) logout();
});
