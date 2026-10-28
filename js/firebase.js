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

// 구글 로그인 → 내 기록 { nickname, wins, losses, ties } 를 돌려줌
async function googleLogin() {
  const res = await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  const ref = db.collection('users').doc(res.user.uid);
  const doc = await ref.get();
  if (doc.exists) return doc.data();          // 전에 온 사람: 저장된 기록

  // 처음 온 사람: 구글 이름(8글자까지) · 0승 0패 0무
  const rec = { nickname: (res.user.displayName || '바리스타').slice(0, 8), wins: 0, losses: 0, ties: 0 };
  await ref.set(rec);
  return rec;
}

// 내 기록을 DB에 저장 (로그인 안 했으면 안 함)
function saveDB(rec) {
  const user = auth.currentUser;
  if (!user) return;
  db.collection('users').doc(user.uid).set(rec)
    .catch((e) => console.log('기록 저장 실패', e));
}

// 로그아웃
function googleLogout() {
  return auth.signOut();
}
