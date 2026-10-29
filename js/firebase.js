// Firebase 연결 설정
// 받은 곳: Firebase 콘솔 → 프로젝트 설정 → 내 앱 → coffeerush-web
// 이 값들은 공개돼도 괜찮음 (보안은 firestore.rules 와 승인된 도메인이 맡음)
// 불러오는 순서: Firebase 3줄(HTML) → 이 파일 → main.js / settings.js

const firebaseConfig = {
  apiKey: "AIzaSyA9wAJv3yPdGZ_6W-92e74Vga63QlQ6YnU",
  authDomain: "coffeerush-9b72c.firebaseapp.com",
  projectId: "coffeerush-9b72c",
  storageBucket: "coffeerush-9b72c.firebasestorage.app",
  messagingSenderId: "778260911087",
  appId: "1:778260911087:web:9f015faefda23556175c1a"
};


// Firebase 시작
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();      // 로그인
const db = firebase.firestore();   // DB

// 구글 로그인 → 전에 온 사람은 내 기록 { nickname, wins, losses, ties }, 처음 온 사람은 null
// 처음 온 사람의 기록은 게임 화면에서 닉네임을 정할 때 만듦 (settings.js의 makeUser)
async function googleLogin() {
  const res = await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  const doc = await db.collection('users').doc(res.user.uid).get();
  return doc.exists ? doc.data() : null;
}

// 로그인 결과를 설정 · 기록 칸(box)에 넣음 (메인 main.js · 게임 화면 settings.js가 같이 씀)
// 다시 온 사람: 저장된 닉네임 · 기록 / 처음 온 사람: 아직 없음(닉네임 정하기 창에서 만듦)
function applyLogin(box, rec) {
  box.user = rec ? { nickname: rec.nickname } : null;
  box.wins = rec ? rec.wins : 0;
  box.losses = rec ? rec.losses : 0;
  box.ties = rec ? rec.ties : 0;
  box.pawn = rec && rec.pawn ? rec.pawn : 'red';   // 말 색도 계정을 따라옴 (예전 기록엔 없음 → 빨강)
}

// 로그인 확인이 끝날 때까지 기다림 (새로 연 페이지는 확인에 잠깐 걸림)
function whenReady() {
  return new Promise((ok) => {
    const stop = auth.onAuthStateChanged((user) => {
      stop();
      ok(user);
    });
  });
}

// 내 기록을 DB에 저장 (로그인 안 했으면 안 함)
async function saveDB(rec) {
  const user = await whenReady();
  if (!user) return;
  db.collection('users').doc(user.uid).set(rec)
    .catch((e) => console.log('기록 저장 실패', e));
}

// 로그아웃
function googleLogout() {
  return auth.signOut();
}
