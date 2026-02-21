# MiniBolt About 페이지 - 파일 가이드

## 📁 프로젝트에 넣는 방법

### 1. 이미지 파일 복사
다운받은 `about_images` 폴더를 프로젝트의 `public/images/about/` 경로에 넣으세요:

```
minibolt-shop/my-app/public/images/about/
├── factory/
│   ├── heading_machines.jpg    ← 헤딩머신 라인
│   ├── floor_overview.jpg      ← 공장 전경
│   ├── wire_materials.jpg      ← 와이어 원자재
│   ├── lathe_milling.jpg       ← 선반/밀링 설비
│   ├── heading_detail.jpg      ← 헤딩머신 상세
│   ├── threading_machines.jpg  ← 전조/탭핑 설비
│   └── production_line.jpg     ← 생산 라인 전경
└── products/
    ├── small_screws.jpg         ← 일반 소형 나사
    ├── zero_screw_camera.jpg    ← 소형 0번 / 카메라 스크류
    ├── wrench_star_screws.jpg   ← 렌지나사 / 별나사
    ├── sems_hex_bolts.jpg       ← 쌤스 / 육각볼트
    ├── rivet_terminal_sems.jpg  ← 리벳 / 단자 / 쌤스
    └── wrench_terminal_bolts.jpg← 렌치볼트 / 단자볼트
```

### 2. 페이지 파일 복사
`about.jsx` 파일을 프로젝트에 넣으세요:

```
minibolt-shop/my-app/app/about/page.tsx
```

> Next.js에서 사용하려면 파일 상단에 `"use client";` 를 추가하고,
> 확장자를 `.tsx`로 변경하세요.

### 3. Claude Code에서 할 일

Claude Code에 이렇게 전달하세요:

```
about 페이지를 추가해줘.
- about.jsx 파일 내용을 app/about/page.tsx로 넣어줘 (상단에 "use client" 추가)
- about_images 폴더를 public/images/about/ 경로에 복사해줘
- Header 네비게이션에 "회사소개" 링크 (/about) 추가해줘
```

## 🖼️ 이미지 목록

### 공장 사진 (7장)
| 파일명 | 설명 | 크기 |
|--------|------|------|
| heading_machines.jpg | 헤딩머신(냉간단조기) 라인 | 1495x756 |
| floor_overview.jpg | 공장 작업장 전경 | 1495x757 |
| wire_materials.jpg | 와이어 원자재 보관 | 1495x722 |
| lathe_milling.jpg | 선반, 밀링, 집진기 | 1495x838 |
| heading_detail.jpg | 헤딩머신 클로즈업 | 722x566 |
| threading_machines.jpg | 전조/탭핑 설비 | 759x568 |
| production_line.jpg | 종합 생산 라인 | 1495x935 |

### 제품 사진 (6장)
| 파일명 | 설명 | 크기 |
|--------|------|------|
| small_screws.jpg | 일반 소형 나사 (와샤붙이) | 549x352 |
| zero_screw_camera.jpg | 0번 스크류 / M1~M2 카메라 스크류 | 549x352 |
| wrench_star_screws.jpg | 소형 렌지나사, 별나사 | 549x352 |
| sems_hex_bolts.jpg | 쌤스, 육각볼트 | 549x352 |
| rivet_terminal_sems.jpg | 리벳, 단자, 쌤스 등 | 549x352 |
| wrench_terminal_bolts.jpg | 렌치볼트, 단자볼트 | 549x352 |
