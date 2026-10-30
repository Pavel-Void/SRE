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
// errorPercentage: процент ошибок (0 = все 200 OK, 2.5 = контролируемый расход бюджета, 80 = авария)
async function sendBackendBatch(errorPercentage, count = 40) {
  const promises = [];
  const errorCount = Math.round((errorPercentage / 100) * count);
  const successCount = count - errorCount;

  for (let i = 0; i < successCount; i++) {
    // 200 OK
    promises.push(sendRequest(BACKEND_PORT, '/actuator/health'));
  }
  for (let i = 0; i < errorCount; i++) {
    // 403 Forbidden (ошибка клиента/доступа, фиксируется в метриках Spring)
    promises.push(sendRequest(BACKEND_PORT, '/api/parkingList'));
  }

  await Promise.all(promises);
}

// Управление состоянием автономного пробера
async function setProberFailure(enabled) {
  const path = enabled ? '/fail' : '/recover';
  await sendRequest(PROBER_PORT, path);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('========================================================================');
  console.log(' СЦЕНАРИЙ ДЕМОНСТРАЦИИ SLI / SLO / SLA ДЛЯ СКРИНКАСТА');
  console.log('========================================================================\n');

  // Убеждаемся, что пробер в штатном режиме
  await setProberFailure(false);

  // ФАЗА 1: 100% Успешность (20 секунд)
  console.log('>>> [ФАЗА 1: ШТАТНЫЙ РЕЖИМ] (20 сек)');
  console.log('    * SLI 1 = 100% (зеленый)');
  console.log('    * Error Budget = 100% (зеленый)');
  console.log('    * SLI 3 (Пробер) = 100%');
  const p1End = Date.now() + 20000;
  while (Date.now() < p1End) {
    await sendBackendBatch(0, 40);
    process.stdout.write('.');
    await sleep(300);
  }
  console.log('\n[OK] Фаза 1 завершена: система стабильна.\n');

  // ФАЗА 2: Умеренная нагрузка (25 секунд) - 2.5% ошибок
  // SLA порог = 5% ошибок. При 2.5% сгорает ровно 50% бюджета (остаток 50%)!
  // SLI 1 опускается до 97.5% (ниже SLO 99%, но выше SLA 95%)
  console.log('>>> [ФАЗА 2: КОНТРОЛИРУЕМАЯ НАГРУЗКА] (25 сек) - 2.5% ошибок');
  console.log('    * SLI 1 снижается до ~97-98% (пробит SLO 99%, но SLA 95% соблюден)');
  console.log('    * Error Budget плавно снижается со 100% до ~50% (желтая зона!)');
  console.log('    * SLI 3 (Пробер) = 100% (сервис в целом жив)');
  const p2End = Date.now() + 25000;
  while (Date.now() < p2End) {
    await sendBackendBatch(2.5, 40);
    process.stdout.write('-');
    await sleep(300);
  }
  console.log('\n[!] Фаза 2 завершена: наглядно продемонстрирован расход бюджета до ~50%!\n');

  // ФАЗА 3: Критический сбой (30 секунд) - 80% ошибок + сбой пробера
  // SLI 1 падает глубоко до ~20%, Error Budget опускается точно до 0% (полное исчерпание)
  // SLI 3 падает до 0%
  console.log('>>> [ФАЗА 3: ВЫРАЗИТЕЛЬНЫЙ КРИТИЧЕСКИЙ СБОЙ] (30 сек) - 80% ошибок');
  console.log('    * SLI 1 падает глубоко до ~20% (красная зона, нарушение SLA)');
  console.log('    * Error Budget сгорает ровно до 0% (исчерпан, линия на 0%)');
  console.log('    * SLI 3 (Пробер) падает до 0%');
  await setProberFailure(true);

  const p3End = Date.now() + 30000;
  while (Date.now() < p3End) {
    await sendBackendBatch(80, 40);
    process.stdout.write('X');
    await sleep(300);
  }
  console.log('\n[!] Фаза 3 завершена: глубокая авария четко зафиксирована на всех графиках!\n');

  // ФАЗА 4: Полное восстановление (25 секунд)
  console.log('>>> [ФАЗА 4: ВОССТАНОВЛЕНИЕ СИСТЕМЫ] (25 сек)');
  console.log('    * Пробер возвращается в строй (/recover)');
  console.log('    * SLI 1, SLI 3 и Error Budget плавно возвращаются к 100%');
  await setProberFailure(false);

  const p4End = Date.now() + 25000;
  while (Date.now() < p4End) {
    await sendBackendBatch(0, 40);
    process.stdout.write('.');
    await sleep(300);
  }
  console.log('\n[OK] Фаза 4 завершена: система полностью восстановилась до 100%!');
  console.log('========================================================================');
}

main();
