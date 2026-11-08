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
    * Логирование — нативное структурированное JSON-логирование Spring Boot 3.4 (ECS формат: `@timestamp`, `log.level`, `service.name`, `message`, `logger`, `thread`) в stdout контейнера;
    * Метрики — Spring Boot Actuator и Micrometer Prometheus registry (`/actuator/prometheus`) для сбора метрик рантайма (JVM, HikariCP, HTTP) и кастомных бизнес-метрик приложения (`MeterRegistry`).

* **Фронтенд (`Frontend/`):**
    * Node.js 20, Next.js 15.2.4 (App Router) + React 19;
    * Язык TypeScript;
    * Стилизация — Tailwind CSS v4, компоненты на базе Radix UI и Lucide Icons;
    * Запросы к бэкенду — Axios с перехватчиком для автоматического обновления токенов;
    * Режим сборки `output: 'standalone'` для минимального размера Docker-образа.

* **База данных:**
    * PostgreSQL 16 (запускается в контейнере `postgres:16-alpine`);
    * Триггеры и хранимые функции на PL/pgSQL для автоматического пересчета счетчиков свободных мест и поддержания целостности;
    * Сайдкар экспортер метрик: `postgres-exporter:v0.16.0` (порт 9187, OpenMetrics) для сбора метрик СУБД.

* **Оркестрация и инфраструктура (Kubernetes / Minikube):**
    * Декларативные манифесты Kubernetes в каталоге `k8s/` (`Deployment`, `Service`, `ConfigMap`, `Secret`, `PersistentVolumeClaim`, `DaemonSet`);
    * Пакетный менеджер Helm v3 для управления релизами мониторинга VictoriaMetrics;
    * Multi-stage Dockerfile для каждого сервиса;
    * Корневой `docker-compose.yml` для альтернативного локального запуска;
    * GitHub Actions (`.github/workflows/ci.yml`) для CI-проверок.

* **Централизованный мониторинг и сбор метрик (VictoriaMetrics Stack):**
    * **VictoriaMetrics Single Server:** высокопроизводительная TSDB для долгосрочного хранения временных рядов с поддержкой PromQL/MetricsQL API (порт `8428`);
    * **VictoriaMetrics Agent (`vmagent`):** легковесный агент для сбора метрик с подов кластера через автоматический Kubernetes Service Discovery по аннотациям `prometheus.io/scrape: "true"` (порт `8429`);
    * **Экспорт метрик рантайма и бизнес-метрик:** Spring Boot Actuator Prometheus эндпоинт (`/actuator/prometheus`, порт `8080`);
    * **Экспорт метрик PostgreSQL:** `postgres-exporter` sidecar (порт `9187`, эндпоинт `/metrics`);
    * **Кастомные бизнес-метрики:** счетчики бронирований (`parking_bookings_total`), отмен (`parking_booking_cancellations_total`), состояние свободных мест (`parking_spots_status`), попытки авторизации (`parking_auth_attempts_total`) и таймер длительности создания брони (`parking_booking_duration_seconds`).

* **Централизованное логирование:**
    * **Victoria Logs (single-node):** высокопроизводительная СУБД для хранения и поиска логов с движком запросов LogsQL и встроенным веб-интерфейсом `vmui` (порт `9428`);
    * **Log Shipper (DaemonSet):** агент на уровне ноды кластера, выполняющий непрерывный сбор CRI-логов из `/var/log/pods`, парсинг JSON полезной нагрузки и стриминг в Victoria Logs по HTTP (`/insert/jsonline`);
    * **Grafana:** инструмент визуализации с настроенными источниками данных для анализа логов и метрик (порт `3001`).

* **SRE, мониторинг надежности (SLI / SLO / SLA) и автономный пробер:**
    * **Автономный синтетический пробер (Вариант А):** отдельный микросервис в Kubernetes (`k8s/10-prober.yaml`, Node.js 20 Alpine), непрерывно зондирующий эндпоинт доступности бэкенда (`/actuator/health`) каждые 2 секунды. Отдает OpenMetrics метрики на порту `9090` (`app_prober_probe_success`, `app_prober_probe_duration_seconds`, `app_prober_probes_total`) и поддерживает управляемые эндпоинты симуляции сбоев (`/fail`, `/recover`);
    * **Автоматический провижининг Grafana SRE Dashboard:** преднастроенный дашборд `Park PSU - SRE Мониторинг SLI / SLO / SLA` (`k8s/09-grafana-dashboards.yaml`) с мгновенными спидометрами доступности и задержки, графиками SLI vs SLO/SLA, визуализацией остатка бюджета ошибок (Error Budget Remaining) с защитой от ухода в отрицательные значения;
    * **Скрипт симуляции изменения поведения трафика (`simulate_slo_traffic.js`):** 4-фазный нагрузочный тест для контролируемого расхода бюджета ошибок и демонстрации полного цикла «норма → контролируемый расход → критическая авария → восстановление» на скринкасте.

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

### Вариант 1: Запуск в Kubernetes (Minikube) с мониторингом VictoriaMetrics и Victoria Logs (Основной способ)

1. **Запустить Minikube:**
   ```powershell
   minikube start
   ```

2. **Развернуть TSDB VictoriaMetrics и сборщик vmagent через Helm:**
   ```powershell
   # Добавить репозиторий VictoriaMetrics
   helm repo add vm https://victoriametrics.github.io/helm-charts/
   helm repo update

   # Создать пространство имён monitoring
   kubectl create namespace monitoring

   # Установить VictoriaMetrics Single Server (хранилище метрик)
   helm install vm-single vm/victoria-metrics-single -n monitoring -f k8s/monitoring/vmsingle-values.yaml

   # Установить VictoriaMetrics Agent (сборщик метрик vmagent с Service Discovery)
   helm install vmagent vm/victoria-metrics-agent -n monitoring -f k8s/monitoring/vmagent-values.yaml
   ```
   *(Также доступны статические манифесты: `kubectl apply -f k8s/monitoring/`)*

3. **Развернуть сервисы приложения (PostgreSQL, Backend, Frontend, VictoriaLogs, Grafana):**
   ```powershell
   kubectl apply -f k8s/all-in-one.yaml
   ```
   *(Или по отдельности: `kubectl apply -f k8s/`)*

4. **Запустить проброс портов на хост-машину:**
   ```powershell
   .\start-port-forward.ps1
   ```

5. **Доступные сервисы и веб-интерфейсы:**
   * **Пользовательский интерфейс (Frontend):** [http://localhost:3000](http://localhost:3000)
   * **REST API бэкенда:** [http://localhost:8080/api/parkingList](http://localhost:8080/api/parkingList)
   * **VictoriaMetrics Single Server (TSDB & PromQL API):** [http://localhost:8428](http://localhost:8428)
   * **vmagent Web UI / Metrics:** [http://localhost:8429/metrics](http://localhost:8429/metrics)
   * **PostgreSQL Exporter (metrics):** [http://localhost:9187/metrics](http://localhost:9187/metrics)
   * **Spring Boot Actuator (Prometheus):** [http://localhost:8080/actuator/prometheus](http://localhost:8080/actuator/prometheus)
   * **Внешний синтетический пробер (OpenMetrics):** [http://localhost:9090/metrics](http://localhost:9090/metrics)
   * **Веб-интерфейс Victoria Logs (vmui):** [http://localhost:9428/select/vmui/](http://localhost:9428/select/vmui/)
   * **Grafana (SRE Дашборд SLI / SLO / SLA):** [http://localhost:3001](http://localhost:3001) *(логин: `admin`, пароль: `admin`)*

---

### Вариант 2: Запуск всего стека через Docker Compose

1. Клонировать репозиторий и перейти в корень проекта.
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

---

## 6. SRE: Мониторинг SLI, SLO, SLA и управление бюджетом ошибок

Реализована полноценная SRE-подсистема мониторинга надёжности и качества обслуживания на базе VictoriaMetrics и Grafana.

### 6.1. Матрица показателей надёжности

| Индикатор (SLI) | Тип | Целевой SLO | Порог SLA | Бюджет ошибок (Error Budget) | PromQL / MetricsQL запрос |
|:---|:---:|:---:|:---:|:---:|:---|
| **SLI 1: Доступность API** (RBSLO Success Rate) | Request-based | **99.0%** | **95.0%** | 5.0% (от SLA) / 1.0% (от SLO) | `sum(rate(http_server_requests_seconds_count{status=~"2.."}[20s])) / sum(rate(http_server_requests_seconds_count[20s])) * 100` |
| **SLI 2: Задержка обработки** (Latency < 200ms) | Request-based | **95.0%** | **90.0%** | 10.0% | `clamp_max(clamp_min((1 - (rate(sum) / rate(count) / 0.200)) * 100, 0), 100)` |
| **SLI 3: Внешний синтетический пробер** (Prober Success Rate) | Blackbox probe | **99.5%** | **98.0%** | 2.0% | `avg(avg_over_time(app_prober_probe_success{target="health"}[20s])) * 100` |
| **SLI 4: Аптайм подов бэкенда** (TBSLO Pod Availability) | Time-based | **99.9%** | **99.0%** | 1.0% | `sum(up{job="kubernetes-pods", app="backend"}) / count(...) * 100` |

### 6.2. Составной SLA и Бюджет ошибок
* **Составной SLA (Composite SLA):** комплексная доступность сервиса гарантируется при одновременном выполнении условий:
  $$\text{SLA}_{\text{total}} = (\text{SLI}_{\text{avail}} \ge 95.0\%) \land (\text{SLI}_{\text{latency}} \ge 90.0\%) \land (\text{SLI}_{\text{prober}} \ge 98.0\%)$$
* **Остаток бюджета ошибок (Error Budget Remaining %):**
  Нормализованный процент оставшегося бюджета относительно порога SLA (5.0% допустимых ошибок):
  $$\text{Error Budget Remaining} = \max\left(0, \min\left(100, 100\% - \frac{\text{Error Rate}}{5.0\%} \times 100\%\right)\right)$$
  * При 0% ошибок: **100%** (зеленая зона, норма);
  * При контролируемой нагрузке (2.5% ошибок): **~50%** (желтая зона — сигнал команде о деградации до наступления штрафов SLA);
  * При критической аварии ($\ge 5.0\%$ ошибок): **0%** (красная зона — бюджет полностью исчерпан, линия фиксируется ровно на нуле).

### 6.3. Демонстрационный скрипт для скринкаста

Для наглядной демонстрации динамики изменения индикаторов на дашборде Grafana ([http://localhost:3001](http://localhost:3001)) подготовлен скрипт `simulate_slo_traffic.js`:
```powershell
node simulate_slo_traffic.js
```

Сценарий последовательно проходит 4 калиброванные фазы:
1. **Фаза 1: Штатный режим (20 сек)** — 100% успешных запросов:
   * SLI 1 = 100%, Error Budget = 100%, SLI 3 (Пробер) = 100%.
2. **Фаза 2: Контролируемая нагрузка (25 сек)** — 2.5% ошибок:
   * SLI 1 опускается до ~97.5% (нарушен SLO 99%, но сохранен SLA 95%);
   * Error Budget плавно снижается со 100% до ~50% (демонстрация постепенного расхода бюджета ошибок).
3. **Фаза 3: Выразительный критический сбой (30 сек)** — 80% ошибок + программный сбой пробера (`/fail`):
   * SLI 1 глубоко падает до ~20% (красная зона, существенное нарушение SLA);
   * SLI 3 (Пробер) падает до 0%;
   * Error Budget сгорает ровно до 0% (исчерпан, линия на 0%, без ухода в минус).
4. **Фаза 4: Полное восстановление (25 сек)** — вызов `/recover` на пробере и прекращение ошибок:
   * Все показатели SLI и остаток бюджета плавно и синхронно возвращаются к 100%.

---

## 7. Мониторинг инцидентов и алертинг (vmalert + Prometheus Alertmanager)

В системе реализован контур автоматического обнаружения инцидентов и доставки оповещений:

### 7.1. Архитектура компонентов алертинга
* **Движок правил `vmalert` (порт 8880):** опрашивает TSDB VictoriaMetrics по правилам из `k8s/11-alert-rules.yaml` каждые 10 секунд и транслирует активные алерты в Alertmanager;
* **Prometheus Alertmanager (порт 9093):** выполняет дедупликацию, группировку, подавление и маршрутизацию уведомлений;
* **Alert Webhook Receiver (порт 5001):** автономный легковесный сервис с интерактивным веб-интерфейсом для приёма и визуализации доставленных вебхук-уведомлений в реальном времени.

### 7.2. Настроенные правила алертинга

| Алерт | Уровень | Категория | Условие срабатывания | Описание проблемы |
|:---|:---:|:---:|:---|:---|
| **HighHttpErrorRate** | Critical | Сервис (API) | Ошибки API > 5% за 1 мин | Превышение допустимого порога SLA, исчерпание Error Budget |
| **ProberServiceDown** | Critical | Сервис (Пробер) | `probe_success == 0` > 20 сек | Полная функциональная или сетевая недоступность бэкенда |
| **HighAuthFailureRate** | Warning | Сервис (Auth) | Неудачный вход > 0.5 оп/сек | Аномальный всплеск ошибок входа / brute-force атака |
| **JvmHeapMemoryUsageHigh** | Warning | Рантайм (Actuator) | JVM Heap > 25% (демо) / 80% (prod) | Риск отказа JVM-процесса по OutOfMemoryError |
| **HikariPoolExhaustion** | Critical | Рантайм (HikariCP) | Pending потоки > 0 или утилизация > 80% | Дефицит соединений пула БД, зависание транзакций |

### 7.3. Управление и проверка алертов
```powershell
# Просмотр текущего статуса всех правил в vmalert, Alertmanager и Webhook
node trigger_alerts.js status

# Просмотр реальных метрик из VictoriaMetrics
node trigger_alerts.js metrics

# Запуск полного сценария проверки для скриншотов
node trigger_alerts.js demo
```
