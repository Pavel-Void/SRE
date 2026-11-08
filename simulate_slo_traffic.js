const http = require('http');

const BACKEND_HOST = process.env.TARGET_HOST || '127.0.0.1';
const BACKEND_PORT = parseInt(process.env.TARGET_PORT || '8080', 10);
const PROBER_PORT = parseInt(process.env.PROBER_PORT || '9090', 10);

function sendRequest(port, path, method = 'GET') {
  return new Promise((resolve) => {
    const reqOptions = {
      hostname: BACKEND_HOST,
      port: port,
      path: path,
      method: method,
      headers: {
        'Connection': 'keep-alive'
      }
    };

    const req = http.request(reqOptions, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });

    req.on('error', () => resolve(503));
    req.on('timeout', () => {
      req.destroy();
      resolve(504);
    });

    req.end();
  });
}

// Отправка батча запросов к бэкенду
async function sendBackendBatch(errorPercentage, count = 40) {
  const promises = [];
  const errorCount = Math.round((errorPercentage / 100) * count);
  const successCount = count - errorCount;

  for (let i = 0; i < successCount; i++) {
    // 200 OK (быстрый штатный эндпоинт проверки здоровья)
    promises.push(sendRequest(BACKEND_PORT, '/actuator/health'));
  }
  for (let i = 0; i < errorCount; i++) {
    // 403 Forbidden (ошибка доступа, фиксируется в счетчике ошибок Actuator)
    promises.push(sendRequest(BACKEND_PORT, '/api/parkingList'));
  }

  await Promise.all(promises);
}

// Управление состоянием автономного пробера (авария / восстановление)
async function setProberFailure(enabled) {
  const path = enabled ? '/fail' : '/recover';
  await sendRequest(PROBER_PORT, path);
}

// Управление задержкой автономного пробера (деградация Latency)
async function setProberDelay(enabled) {
  const path = enabled ? '/delay' : '/nodelay';
  await sendRequest(PROBER_PORT, path);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('========================================================================');
  console.log(' СЦЕНАРИЙ ДЕМОНСТРАЦИИ SLI / SLO / SLA ДЛЯ СКРИНКАСТА');
  console.log(' Сервис: Park PSU | Мониторинг: VictoriaMetrics + Grafana');
  console.log('========================================================================\n');

  // Инициализация исходного чистого состояния
  await setProberFailure(false);
  await setProberDelay(false);

  // ФАЗА 1: ШТАТНЫЙ РЕЖИМ (20 секунд)
  console.log('>>> [ФАЗА 1: ШТАТНЫЙ РЕЖИМ РАБОТЫ] (20 сек)');
  console.log('    * Сервис стабилен: все индикаторы SLI находятся в зелёной зоне выше порогов SLO.');
  console.log('    * Бюджет ошибок полон, соглашение SLA полностью соблюдается.');
  const p1End = Date.now() + 20000;
  while (Date.now() < p1End) {
    await sendBackendBatch(0, 40);
    process.stdout.write('.');
    await sleep(300);
  }
  console.log('\n[OK] Фаза 1 завершена: сервис работает в идеальном штатном режиме.\n');

  // ФАЗА 2: ДЕГРАДАЦИЯ ЗАДЕРЖКИ (API LATENCY) (20 секунд)
  console.log('>>> [ФАЗА 2: ДЕГРАДАЦИЯ ВРЕМЕНИ ОТКЛИКА (LATENCY)] (20 сек)');
  console.log('    * Моделирование сетевых задержек и медленных ответов (превышение порога 200 мс).');
  console.log('    * На графике SLI 2 наблюдается выраженное падение ниже целевого порога SLO.');
  console.log('    * Успешность запросов сохраняется (ошибок нет, но время обработки деградировало).');
  await setProberDelay(true);
  const p2End = Date.now() + 20000;
  while (Date.now() < p2End) {
    await sendBackendBatch(0, 40);
    process.stdout.write('~');
    await sleep(300);
  }
  await setProberDelay(false);
  console.log('\n[OK] Фаза 2 завершена: график SLI 2 наглядно продемонстрировал задержку отклика.\n');

  // ФАЗА 3: КОНТРОЛИРУЕМЫЙ РАСХОД БЮДЖЕТА ОШИБОК (25 секунд)
  console.log('>>> [ФАЗА 3: КОНТРОЛИРУЕМЫЙ РАСХОД БЮДЖЕТА ОШИБОК] (25 сек)');
  console.log('    * Генерация умеренного потока сбойных ответов.');
  console.log('    * Внутренний инженерный SLO по доступности нарушен, начинается расходование Error Budget.');
  console.log('    * Демонстрация принципа SRE: команда видит таяние бюджета ошибок до срыва клиентского SLA.');
  const p3End = Date.now() + 25000;
  while (Date.now() < p3End) {
    await sendBackendBatch(2.5, 40);
    process.stdout.write('-');
    await sleep(300);
  }
  console.log('\n[!] Фаза 3 завершена: контролируемый расход бюджета ошибок наглядно отображён.\n');

  // ФАЗА 4: КРИТИЧЕСКИЙ СБОЙ И АВАРИЯ (25 секунд)
  console.log('>>> [ФАЗА 4: КРИТИЧЕСКИЙ СБОЙ И ИСЧЕРПАНИЕ БЮДЖЕТА] (25 сек)');
  console.log('    * Массовый поток ошибок API и отказ сквозного синтетического пробера.');
  console.log('    * Метрики доступности переходят в аварийную зону, бюджет ошибок полностью исчерпан.');
  console.log('    * Сигнал к блокировке релизов (Feature Freeze), накопительный показатель SLA фиксирует нарушение.');
  await setProberFailure(true);

  const p4End = Date.now() + 25000;
  while (Date.now() < p4End) {
    await sendBackendBatch(80, 40);
    process.stdout.write('X');
    await sleep(300);
  }
  console.log('\n[!] Фаза 4 завершена: авария синхронно зафиксирована на графиках доступности и SLA.\n');

  // ФАЗА 5: ПОЛНОЕ ВОССТАНОВЛЕНИЕ (20 секунд)
  console.log('>>> [ФАЗА 5: ВОССТАНОВЛЕНИЕ СИСТЕМЫ] (20 сек)');
  console.log('    * Устранение неисправностей и прекращение генерации сбоев.');
  console.log('    * Индикаторы SLI и остаток бюджета ошибок возвращаются в зелёную зону стабильности.');
  await setProberFailure(false);
  await setProberDelay(false);

  const p5End = Date.now() + 20000;
  while (Date.now() < p5End) {
    await sendBackendBatch(0, 40);
    process.stdout.write('.');
    await sleep(300);
  }
  console.log('\n[OK] Фаза 5 завершена: все компоненты вернулись к нормальной работе!');
  console.log('========================================================================\n');
}

main();
