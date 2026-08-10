# MINT 배포 가이드 (GitHub → Vercel)

도메인은 지금 필요 없습니다. 아래 순서만 따라 하면 `https://○○.vercel.app` 무료 주소가 생기고 **QR이 실제로 작동**합니다.

## 0. 배포 전 꼭 알아둘 점 (저장 방식)

현재는 데이터를 파일(`data/records.json`)과 `public/uploads` 폴더에 저장합니다.
Vercel(무료 서버)은 파일을 저장하지 못하기 때문에:

- ✅ **공개 조회 / QR 스캔 / 관리자 로그인·QR 생성** → 잘 작동
- ⚠️ **배포된 사이트의 관리자에서 "저장·사진 업로드·링크 불러오기"** → 안 됨

그래서 지금 방식의 운영 흐름은:

1. **내 컴퓨터(로컬)에서** 음반 추가·사진·등급 입력 (`npm run dev`)
2. `git add -A && git commit -m "내용 수정"` 후 `git push`
3. → Vercel이 자동으로 사이트를 새로 배포 (몇 초~1분)
4. **배포된 관리자에서 QR 생성** → 인쇄 → 실물에 부착

> 나중에 "배포된 사이트에서 바로 편집"까지 원하면, 무료 데이터베이스(예: Neon/Postgres)와 이미지 저장소(Vercel Blob)로 업그레이드하면 됩니다. (그때 코드는 제가 바꿔드립니다.)

## 1. GitHub에 코드 올리기

1. https://github.com 가입/로그인 → 우측 상단 **+** → **New repository**
2. 이름(예: `mint-grading`) 입력 → **Private** 선택 → **Create repository**
3. 생성된 페이지의 주소(`https://github.com/내아이디/mint-grading.git`)를 복사
4. 이 폴더에서 아래 실행 (`내아이디` 부분 교체):

```
git remote add origin https://github.com/내아이디/mint-grading.git
git branch -M main
git push -u origin main
```

(비밀번호를 물어보면 GitHub 로그인/토큰으로 인증하면 됩니다.)

## 2. Vercel에 연결

1. https://vercel.com → **Continue with GitHub** 로 로그인
2. **Add New… → Project** → 방금 만든 저장소 **Import**
3. **Environment Variables** 에 아래 추가 (⚠️ 꼭!):
   - Name: `ADMIN_PASSWORD`
   - Value: **새 관리자 비밀번호** (mint1234 말고 강한 걸로)
4. **Deploy** 클릭 → 1~2분 뒤 `https://○○.vercel.app` 완성

## 3. 확인

- `https://○○.vercel.app` → 대문
- `https://○○.vercel.app/admin` → 관리자 (위에서 정한 비밀번호)
- 관리자에서 음반 열고 **QR 출력** → 그 QR을 폰으로 스캔 → 리포트가 열리면 성공 🎉

## 참고: 로컬 개발 재시작

```
cd "C:/Users/ldy07/Desktop/mvp 1차/mint"
npm run dev
```
