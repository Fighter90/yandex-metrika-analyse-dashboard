# Установка ProductCamp Analytics

**Версия 2.9.3 · Май 2026 · Windows + macOS**

> Инструкция по установке локального дашборда ProductCamp Conversion Analytics Tool
> с нуля на Windows и macOS.
>
> Репозиторий: `git@github.com:Fighter90/yandex-metrika-analyse-dashboard.git`
> Альтернативно (HTTPS): `https://github.com/Fighter90/yandex-metrika-analyse-dashboard.git`

---

## Часть 0. Что нужно установить заранее

| Что               | Версия | Зачем                                     |
| ----------------- | ------ | ----------------------------------------- |
| **Node.js**       | ≥ 20   | Среда исполнения backend + frontend       |
| **pnpm**          | ≥ 9    | Менеджер пакетов (workspace)              |
| **Git**           | любая  | Клонирование репозитория                  |
| **Google Chrome** | любая  | Только для экспорта PDF (DOCX — без него) |

**Не нужно:**

- Docker / контейнеры — всё работает локально
- Облачные сервисы — данные только в локальной SQLite

**Опционально (для работы с реальными данными):**

- OAuth-токен Яндекс.Метрики (scope `metrika:read`)
- Anthropic API key (для AI-анализа отчёта)

Без них дашборд запустится на детерминированных демо-данных.

---

# Часть A. Установка на macOS

## A.1. Установить Homebrew (если нет)

Открыть Терминал (`Cmd + Space` → «Terminal»):

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

После установки перезапустить Терминал.

## A.2. Установить Node.js, pnpm, Git, Chrome

```bash
brew install node@20 pnpm git
brew install --cask google-chrome     # для экспорта PDF
```

Проверка:

```bash
node --version    # должно быть v20.x.x или выше
pnpm --version    # 9.x.x или выше
git --version     # любая
```

## A.3. Сгенерировать SSH-ключ для GitHub (если нет)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# нажать Enter на все вопросы (default путь и без passphrase)
pbcopy < ~/.ssh/id_ed25519.pub
```

Открыть https://github.com/settings/keys → **«New SSH key»** → вставить из буфера → **«Add SSH key»**.

Проверка подключения:

```bash
ssh -T git@github.com
# должно вывести "Hi Fighter90! You've successfully authenticated..."
```

## A.4. Клонировать репозиторий

```bash
cd ~/Projects                                    # или любая рабочая папка
git clone git@github.com:Fighter90/yandex-metrika-analyse-dashboard.git
cd yandex-metrika-analyse-dashboard
```

Если SSH не настроен — используйте HTTPS:

```bash
git clone https://github.com/Fighter90/yandex-metrika-analyse-dashboard.git
```

## A.5. Установить и запустить (одной командой)

```bash
chmod +x setup.sh init.sh run.sh
./setup.sh
```

`./setup.sh` последовательно: **install → init → start**.

Откроется браузер на http://localhost:5173.

## A.6. По шагам (если нужен контроль)

```bash
pnpm install            # зависимости
./init.sh               # интерактивно создаст .env
./run.sh                # миграции → sync (или seed) → дашборд
```

`./init.sh` спросит:

1. `ANTHROPIC_API_KEY` — можно пропустить (Enter)
2. `COUNTER_ID` — ID счётчика Яндекс.Метрики
3. `GOAL_ID` — `0` для авто-определения, или конкретный ID
4. Предложит запустить OAuth (`pnpm auth`)

## A.7. Проверка

```bash
curl -s http://localhost:4000/api/health
# должно вернуть {"status":"ok", ...}
open http://localhost:5173
```

---

# Часть B. Установка на Windows

> Рекомендуется **WSL 2** (Windows Subsystem for Linux) — самый стабильный путь. Альтернатива: PowerShell + Git Bash.

## B.1. Установить WSL 2 (рекомендуется)

В PowerShell от имени администратора:

```powershell
wsl --install
# перезагрузить компьютер
wsl --set-default-version 2
```

После перезагрузки откроется Ubuntu — задать имя пользователя и пароль.

Далее **все команды выполнять в Ubuntu WSL terminal** (как на Linux/macOS).

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

Дальше — **переходите к шагам A.2–A.7 (как на macOS)**, заменив `brew install` на `apt install`:

```bash
# Node.js 20 через NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
npm install -g pnpm

# Chrome (для PDF)
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install -y google-chrome-stable
```

## B.2. Альтернатива — нативный Windows (без WSL)

Подходит, если WSL установить не получается.

### B.2.1. Установить Node.js

Скачать installer с https://nodejs.org/ → **LTS версию (≥ 20)** → запустить.

Перезапустить терминал. Проверка в PowerShell:

```powershell
node --version
```

### B.2.2. Установить pnpm

```powershell
npm install -g pnpm
pnpm --version
```

### B.2.3. Установить Git

Скачать с https://git-scm.com/download/win → запустить → опция **«Git Bash Here»** включена.

### B.2.4. Установить Google Chrome

Скачать с https://www.google.com/chrome/ → установить.

### B.2.5. Сгенерировать SSH-ключ

В Git Bash (правый клик → Git Bash Here в любой папке):

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Enter на все вопросы
clip < ~/.ssh/id_ed25519.pub
```

Добавить в GitHub: https://github.com/settings/keys → New SSH key.

### B.2.6. Клонировать репозиторий

В Git Bash:

```bash
cd /c/Users/<ваш_пользователь>/Projects     # или любая папка
git clone git@github.com:Fighter90/yandex-metrika-analyse-dashboard.git
cd yandex-metrika-analyse-dashboard
```

### B.2.7. Установить зависимости

В Git Bash:

```bash
pnpm install
```

### B.2.8. Создать `.env` вручную

`./init.sh` — bash-скрипт; на нативном Windows его проще обойти. Скопируйте `.env.example` в `.env` и заполните в любом текстовом редакторе:

```bash
cp .env.example .env
notepad .env
```

Минимум — указать `COUNTER_ID` (или оставить 0 для демо).

### B.2.9. Запустить

В Git Bash:

```bash
./run.sh
```

Или эквивалент в PowerShell:

```powershell
pnpm --filter @pca/backend migrate
pnpm seed                           # или: pnpm sync  (если задан YANDEX_OAUTH_TOKEN)
pnpm dev                            # backend + frontend
```

Браузер откроет http://localhost:5173.

---

# Часть C. Получение токенов (обе ОС)

## C.1. Яндекс.Метрика OAuth-токен

Нужен токен со scope `metrika:read`.

**Способ 1 (рекомендуется) — через помощник:**

```bash
pnpm auth
```

1. Скрипт распечатает ссылку авторизации — открыть.
2. Подтвердить доступ → скопировать **код подтверждения**.
3. Вставить в терминал → токен автоматически попадёт в `.env`.

**Способ 2 — вручную (implicit flow):**

1. Открыть в браузере:
   ```
   https://oauth.yandex.ru/authorize?response_type=token&client_id=<YANDEX_CLIENT_ID>
   ```
2. Подтвердить доступ.
3. Токен будет в URL после `#access_token=...`.
4. Вписать в `.env`: `YANDEX_OAUTH_TOKEN=<токен>`.

## C.2. Anthropic API key

Для AI-анализа отчёта:

1. Зарегистрироваться на https://console.anthropic.com/
2. Создать API key.
3. Вписать в `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
   Или в UI: Настройки → поле «Anthropic API Key» → Сохранить.

Без ключа дашборд и DOCX/PDF работают, нет только AI-нарратива.

## C.3. COUNTER_ID

ID счётчика Яндекс.Метрики смотрите в кабинете Метрики (URL вида `https://metrika.yandex.ru/dashboard?id=XXXXXX`).

---

# Часть D. Перезапуск и обновление

## D.1. Перезапуск дашборда

```bash
# macOS / WSL / Git Bash
pkill -f "tsx watch src/server.ts"
pkill -f "vite"
./run.sh
```

PowerShell:

```powershell
Get-Process node | Stop-Process
.\run.sh    # или через Git Bash
```

## D.2. Обновление до новой версии

```bash
cd yandex-metrika-analyse-dashboard
git pull
pnpm install                                # подтянуть новые зависимости
pnpm --filter @pca/backend migrate         # применить миграции
./run.sh
```

## D.3. Чистая база (при смене KPI-цели)

```bash
rm data/productcamp.sqlite*
pnpm --filter @pca/backend migrate
pnpm seed                                   # или pnpm sync
```

---

# Часть E. Типичные проблемы

| Симптом                                       | Решение                                                               |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `Node.js 20+ required`                        | Установить Node ≥ 20 (см. A.2/B.2.1)                                  |
| `pnpm: command not found`                     | `npm install -g pnpm` или `corepack enable`                           |
| `Permission denied (publickey)` при git clone | SSH-ключ не добавлен в GitHub (A.3 / B.2.5)                           |
| Порт 5173 или 4000 занят                      | `pkill -f vite`, `pkill -f "tsx watch"` (или закрыть старый процесс)  |
| PDF: `executablePath ... must be specified`   | Установить Chrome или задать `PUPPETEER_EXECUTABLE_PATH` в `.env`     |
| Пустой дашборд, нет данных                    | Проверить `COUNTER_ID` и `YANDEX_OAUTH_TOKEN` либо `pnpm seed` (демо) |
| `ENOSPC` при генерации отчётов                | Освободить место на диске (отчёты + Chrome пишут во временные файлы)  |
| Windows: `./run.sh: command not found`        | Запускать в **Git Bash**, не в PowerShell                             |
| WSL: `Cannot connect to display`              | Frontend в WSL → открыть http://localhost:5173 в Windows-браузере     |

---

# Часть F. Проверка качества (для разработчиков)

После клонирования и `pnpm install`:

```bash
pnpm -r typecheck
pnpm lint
pnpm format:check
pnpm -r coverage              # должно быть 100%
pnpm build
pnpm exec playwright test     # e2e: desktop + mobile-iphone-14
```

Все 7 команд должны быть зелёные.

---

# Часть G. Контрольный лист установки

После завершения проверьте:

- [ ] `git --version` показывает версию Git
- [ ] `node --version` ≥ v20
- [ ] `pnpm --version` ≥ 9
- [ ] Репозиторий склонирован, текущая папка — `yandex-metrika-analyse-dashboard`
- [ ] `pnpm install` прошёл без ошибок
- [ ] Файл `.env` создан (минимум есть `COUNTER_ID`, остальное опционально)
- [ ] `./run.sh` запустился, выводит «Local: http://localhost:5173/»
- [ ] http://localhost:5173 открывается в браузере
- [ ] http://localhost:4000/api/health возвращает `{"status":"ok",...}`
- [ ] (если есть Метрика-токен) данные загружены: на Обзоре есть KPI и каналы
- [ ] (если нет токена) загружены демо-данные (`pnpm seed` показывает 20 каналов)
- [ ] (если есть Anthropic key) в Настройках видна маска `sk-a****AA`

Если все 11 пунктов зелёные — установка завершена.

---

**Версия документа:** v2.9.3 · 2026-05-29
**Репозиторий:** `git@github.com:Fighter90/yandex-metrika-analyse-dashboard.git`
**Поддержка:** GitHub Issues в репозитории Fighter90/yandex-metrika-analyse-dashboard
