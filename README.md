## 1. Доменная область приложения

В качестве проекта я разработал веб-сервис **Park PSU**, предназначенный для автоматизации учета и бронирования парковочных мест на территории университетского городка ПГНИУ.

Основная проблема, которую решает приложение — нехватка парковочных мест в часы пик и хаотичный поиск свободного пространства. Сервис позволяет:
- в реальном времени видеть список парковок кампуса и количество свободных мест на каждой из них;
- открывать интерактивную карту конкретной парковки и видеть статус каждого машино-места (свободно, занято кем-то, занято текущим пользователем);
- бронировать место на определенный промежуток времени (как прямо сейчас, так и заранее на будущее);
- отслеживать свои брони в личном кабинете и досрочно отменять их, если необходимость в месте отпала;
- автоматически освобождать места по истечении тайм-аута и активировать запланированные брони через фоновый шедулер.

---

## 2. Стек технологий

Проект организован в виде монорепозитория, разделенного на два независимых компонента — `Backend` и `Frontend`:

* **Бэкенд (`Backend/`):**
    * Java 21, фреймворк Spring Boot 3.4.3;
    * Сборка через Gradle Wrapper (Gradle 8.13);
    * Spring Data JPA + Hibernate для работы с БД, пул HikariCP;
    * Spring Security + JWT (библиотека JJWT 0.11.5) для аутентификации;
    * Миграции базы данных через Liquibase;
    * Spring Scheduling для периодических фоновых задач;
    * Логирование — нативное структурированное JSON-логирование Spring Boot 3.4 (ECS формат: `@timestamp`, `log.level`, `service.name`, `message`, `logger`, `thread`) в stdout контейнера.

* **Фронтенд (`Frontend/`):**
    * Node.js 20, Next.js 15.2.4 (App Router) + React 19;
    * Язык TypeScript;
    * Стилизация — Tailwind CSS v4, компоненты на базе Radix UI и Lucide Icons;
    * Запросы к бэкенду — Axios с перехватчиком для автоматического обновления токенов;
    * Режим сборки `output: 'standalone'` для минимального размера Docker-образа.

* **База данных:**
    * PostgreSQL 16 (запускается в контейнере `postgres:16-alpine`);
    * Триггеры и хранимые функции на PL/pgSQL для автоматического пересчета счетчиков свободных мест и поддержания целостности.

* **Оркестрация и инфраструктура (Kubernetes / Minikube):**
    * Декларативные манифесты Kubernetes в каталоге `k8s/` (`Deployment`, `Service`, `ConfigMap`, `Secret`, `PersistentVolumeClaim`, `DaemonSet`);
    * Multi-stage Dockerfile для каждого сервиса;
    * Корневой `docker-compose.yml` для альтернативного локального запуска;
    * GitHub Actions (`.github/workflows/ci.yml`) для CI-проверок.

* **Централизованное логирование и мониторинг:**
    * **Victoria Logs (single-node):** высокопроизводительная СУБД для хранения и поиска логов с движком запросов LogsQL и встроенным веб-интерфейсом `vmui`;
    * **Log Shipper (DaemonSet):** агент на уровне ноды кластера, выполняющий непрерывный сбор CRI-логов из `/var/log/pods`, парсинг JSON полезной нагрузки и стриминг в Victoria Logs по HTTP (`/insert/jsonline`);
    * **Grafana (с официальным плагином Victoria Logs):** инструмент визуализации с предустановленным плагином `victoriametrics-logs-datasource` и настроенным datasource для анализа логов через Explore.


---

## 3. Основные сущности и структура данных

В базе данных выделены 4 основные таблицы:

1. **`users` (Пользователи):**
    * Хранит учетные записи: `id`, `email`, захэшированный пароль `password` (BCrypt).
    * Связан с логами бронирований и занятыми местами (отношение один-ко-многим).

2. **`parkings` (Парковки):**
    * Описывает парковочные зоны на кампусе: `id`, `location` (название или номер корпуса), `parking_average` (общая вместимость), `parking_free` (количество свободных мест).
    * Поле `parking_free` автоматически обновляется триггерами при изменении статуса мест.

3. **`places` (Машино-места):**
    * Конкретные физические места на парковке. Имеет составной первичный ключ (`place_number` + `parking_id`).
    * Поля: `user_id` (кто сейчас занимает), флаг `is_occupied`, временные метки `booking_time` и `parking_end_time`.
    * Отражает оперативное состояние «прямо сейчас».

4. **`booking_logs` (История и журнал броней):**
    * Хранит все бронирования — прошедшие, текущие и запланированные на будущее.
    * Поля: `id`, `user_id`, `parking_id`, `place_number`, `booked_at` (начало), `released_at` (конец), флаг `activated`.

---

## 4. Реализованные CRUD-операции

Для взаимодействия с данными в бэкенде написан REST API:

| Сущность | Операция | Эндпоинт | Реализация в коде | Что делает |
| :--- | :--- | :--- | :--- | :--- |
| **User** | Create | `POST /api/register` | `AuthController.register` | Регистрация нового аккаунта с валидацией пароля |
| **User** | Read | `POST /api/login` | `AuthController.login` | Проверка пароля и выдача JWT access/refresh токенов |
| **User** | Update | `POST /api/refresh` | `AuthController.refresh` | Обновление просроченного токена через refresh-токен |
| **Parking** | Read | `GET /api/parkingList` | `ParkingController.findAll` | Список всех парковок кампуса и количество свободных мест |
| **Place** | Read | `GET /api/spotsForMapList` | `PlaceController.getSpotsForMapList` | Получение схемы конкретной парковки со статусами мест |
| **Place** | Read | `GET /api/spotsList` | `SpotController.getUserSpots` | Список активных мест текущего авторизованного пользователя |
| **Place** | Update | Фоновый воркер | `BookingScheduler.releaseExpiredPlaces` | Авто-освобождение мест по окончании времени брони |
| **Booking** | Create | `POST /api/booking` | `BookingController.bookPlace` | Создание новой брони с проверкой пересечения интервалов |
| **Booking** | Read | `GET /api/bookedList` | `BookingController.getBookedList` | Получение занятых интервалов по выбранному месту |
| **Booking** | Read | `GET /api/user_profile/bookingLogs` | `BookingHistoryController.getAllUserSpots` | Вся история бронирований текущего пользователя |
| **Booking** | Delete | `POST /api/cancelBooking` | `BookingController.cancelBooking` | Досрочная отмена активной брони и освобождение места |

---

## 5. Инструкция по запуску проекта

### Вариант 1: Запуск в Kubernetes (Minikube) с Victoria Logs и Grafana (Основной способ)

1. **Запустить Minikube и применить манифесты:**
   ```powershell
   minikube start
   kubectl apply -f k8s/all-in-one.yaml
   ```
   *(Или по отдельности: `kubectl apply -f k8s/`)*

2. **Запустить проброс портов на хост-машину:**
   ```powershell
   .\start-port-forward.ps1
   ```

3. **Доступные сервисы и веб-интерфейсы:**
   * **Пользовательский интерфейс (Frontend):** [http://localhost:3000](http://localhost:3000)
   * **REST API бэкенда:** [http://localhost:8080/api/parkingList](http://localhost:8080/api/parkingList)
   * **Веб-интерфейс Victoria Logs (vmui):** [http://localhost:9428/select/vmui/](http://localhost:9428/select/vmui/)
   * **Grafana (с источником VictoriaLogs):** [http://localhost:3001](http://localhost:3001) *(логин: `admin`, пароль: `admin`)*

---

### Вариант 2: Запуск всего стека через Docker Compose

1. Клонировать репозиторий и перейти в корень проекта:
2. Запустить контейнеры с пересборкой:
   ```bash
   docker compose up --build
   ```
   *(Если база запускалась ранее и хочется создать её заново с нуля, предварительно выполнить `docker compose down -v`)*.

3. После запуска сервисы доступны по адресам:
    * **Веб-интерфейс (Frontend):** [http://localhost:3000](http://localhost:3000)
    * **API бэкенда:** [http://localhost:8080/api/parkingList](http://localhost:8080/api/parkingList)
    * **База данных PostgreSQL:** `localhost:5432` (`db: park_psu`, `user: postgres`, `password: postgres`)

### Ручной локальный запуск для разработки

Если нужно вносить изменения и запускать сервисы локально на машине:

1. **Поднять базу данных:**
   ```bash
   docker run -d --name park_psu_db -p 5432:5432 -e POSTGRES_DB=park_psu -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:16-alpine
   ```

2. **Запустить бэкенд:**
   ```bash
   cd Backend
   .\gradlew.bat bootRun
   ```

3. **Запустить фронтенд:**
   ```bash
   cd Frontend
   npm ci --legacy-peer-deps
   npm run dev
   ```