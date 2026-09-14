# UI-only Docker 실행 안내

이 이미지는 정적 UI만 제공합니다. OpenAI API 키, 백엔드, Python 또는 Java가 필요하지 않습니다.

## 실행

프로젝트 폴더에서 실행합니다.

```powershell
docker compose up --build -d
```

본인 PC에서는 http://localhost:3000 으로 접속합니다.

같은 Wi-Fi 또는 사내 네트워크의 구성원은 호스트 PC의 IPv4 주소로 접속합니다.

```powershell
ipconfig
```

예를 들어 IPv4 주소가 `192.168.0.187`이면 아래 주소를 전달합니다.

```text
http://192.168.0.187:3000
```

Windows 방화벽에서 Docker 또는 TCP 3000 포트의 사설 네트워크 접근을 허용해야 할 수 있습니다.

## 구성원에게 Docker 이미지 파일로 전달하기

이미지를 만든 뒤 파일 하나로 내보냅니다.

```powershell
docker compose build
docker save -o blockflow-ui.tar blockflow-ui:latest
```

구성원은 `blockflow-ui.tar`를 받은 뒤 아래 명령으로 불러와 실행합니다.

```powershell
docker load -i blockflow-ui.tar
docker run -d --name blockflow-ui -p 3000:80 blockflow-ui:latest
```

실행을 멈추려면 아래 명령을 사용합니다.

```powershell
docker compose down
```

