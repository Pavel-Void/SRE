const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const BACKEND_HOST = process.env.TARGET_HOST || '127.0.0.1';
const BACKEND_PORT = parseInt(process.env.TARGET_PORT || '8080', 10);
const PROBER_PORT = parseInt(process.env.PROBER_PORT || '9090', 10);
const ALERTMANAGER_PORT = parseInt(process.env.ALERTMANAGER_PORT || '9093', 10);
const VMALERT_PORT = parseInt(process.env.VMALERT_PORT || '8880', 10);
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || '5001', 10);

function sendHttp(port, path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve) => {
    const reqOptions = {
      hostname: BACKEND_HOST,
      port: port,
      path: path,
      method: method,
      headers: { ...headers }
    };

    if (data) {
      if (!reqOptions.headers['Content-Type']) {
        reqOptions.headers['Content-Type'] = 'application/json';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', (err) => resolve({ status: 503, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 504, error: 'timeout' });
    });

    if (data) req.write(data);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function queryVm(query) {
  const res = await sendHttp(8428, '/api/v1/query?query=' + encodeURIComponent(query));
  if (res.status === 200) {
    try {
      const parsed = JSON.parse(res.body);
      return parsed.data?.result?.[0]?.value?.[1] || 'N/A';
    } catch {
      return 'parse error';
    }
  }
  return 'error';
}

async function printMetrics() {
  console.log('========================================================================');
  console.log('  ТЕКУЩИЕ ЗНАЧЕНИЯ МЕТРИК В VICTORIAMETRICS (ДЛЯ ПРАВИЛ АЛЕРТОВ)');
  console.log('========================================================================\n');

  const heapPct = await queryVm('sum(jvm_memory_used_bytes{area="heap"}) / sum(jvm_memory_max_bytes{area="heap"}) * 100');
  const proberVal = await queryVm('app_prober_probe_success{target="health"}');
  const errorRate = await queryVm('clamp_max(clamp_min((sum(rate(http_server_requests_seconds_count{status!~"2.."}[1m])) or vector(0)) / (sum(rate(http_server_requests_seconds_count[1m])) or vector(1)) * 100, 0), 100)');
  const authFailRate = await queryVm('sum(rate(parking_auth_attempts_total{status="failed"}[1m])) or vector(0)');
  const hikariPending = await queryVm('sum(hikaricp_connections_pending) or vector(0)');
  const hikariActive = await queryVm('(sum(hikaricp_connections_active) / sum(hikaricp_connections_max) * 100) or vector(0)');

  console.log(`  * JVM Heap Usage:            ${parseFloat(heapPct).toFixed(1)}% (порог алерта: > 80%)`);
  console.log(`  * Prober Success:            ${proberVal} (порог алерта: == 0)`);
  console.log(`  * HTTP Error Rate:           ${parseFloat(errorRate).toFixed(2)}% (порог алерта: > 5.0%)`);
  console.log(`  * Auth Failures Rate:        ${parseFloat(authFailRate).toFixed(2)} оп/сек (порог: > 0.5 оп/сек)`);
  console.log(`  * HikariCP Active %:         ${parseFloat(hikariActive).toFixed(1)}% (порог: > 80%)`);
  console.log(`  * HikariCP Pending Threads:  ${hikariPending} (порог: > 0)\n`);
  console.log('========================================================================\n');
}

async function getStatus() {
  console.log('========================================================================');
  console.log('  ТЕКУЩИЙ СТАТУС ПОДСИСТЕМЫ АЛЕРТИНГА (VMALERT + ALERTMANAGER + WEBHOOK)');
  console.log('========================================================================\n');

  // 1. vmalert
  const vmalertRes = await sendHttp(VMALERT_PORT, '/api/v1/rules');
  if (vmalertRes.status === 200) {
    try {
      const data = JSON.parse(vmalertRes.body);
      console.log('>>> [vmalert: http://localhost:8880]');
      for (const group of data.data.groups) {
        console.log(`  Группа: ${group.name}`);
        for (const rule of group.rules) {
          const stateBadge = rule.state === 'firing' ? '🔴 FIRING' : (rule.state === 'pending' ? '🟡 PENDING' : '🟢 INACTIVE');
          console.log(`    * [${stateBadge}] ${rule.name} (health: ${rule.health})`);
        }
      }
    } catch (e) {
      console.log('  Ошибка парсинга vmalert JSON:', e.message);
    }
  } else {
    console.log(`  vmalert недоступен на порту ${VMALERT_PORT}`);
  }

  // 2. Alertmanager
  console.log('\n>>> [Alertmanager: http://localhost:9093]');
  const amRes = await sendHttp(ALERTMANAGER_PORT, '/api/v2/alerts');
  if (amRes.status === 200) {
    try {
      const alerts = JSON.parse(amRes.body);
      console.log(`  Количество активных алертов в Alertmanager: ${alerts.length}`);
      for (const a of alerts) {
        console.log(`    * [${a.status.state.toUpperCase()}] ${a.labels.alertname} (${a.labels.severity}): ${a.annotations.summary || ''}`);
      }
    } catch (e) {
      console.log('  Ошибка парсинга Alertmanager JSON:', e.message);
    }
  } else {
    console.log(`  Alertmanager недоступен на порту ${ALERTMANAGER_PORT}`);
  }

  // 3. Webhook Receiver
  console.log('\n>>> [Webhook Receiver UI: http://localhost:5001]');
  const whRes = await sendHttp(WEBHOOK_PORT, '/api/alerts');
  if (whRes.status === 200) {
    try {
      const history = JSON.parse(whRes.body);
      console.log(`  Всего получено уведомлений по вебхуку: ${history.length}`);
      for (const h of history.slice(0, 5)) {
        const badge = h.status === 'firing' ? '🔴 FIRING' : '🟢 RESOLVED';
        console.log(`    * [${badge}] ${h.alertname} (${h.severity}) в ${new Date(h.receivedAt).toLocaleTimeString()}: ${h.summary}`);
      }
    } catch (e) {
      console.log('  Ошибка парсинга Webhook JSON:', e.message);
    }
  } else {
    console.log(`  Webhook Receiver недоступен на порту ${WEBHOOK_PORT}`);
  }
  console.log('\n========================================================================\n');
}

async function triggerProberFail() {
  console.log('>>> [СИМУЛЯЦИЯ АЛЕРТА: ProberServiceDown]');
  console.log('    Отправляю запрос /fail на порт автономного пробера (9090)...');
  const res = await sendHttp(PROBER_PORT, '/fail');
  console.log(`    Ответ пробера: статус ${res.status}.`);
  console.log('    [!] Пробер переведен в режим имитации отказа.');
  console.log('    Через ~20-30 секунд сработает алерт "ProberServiceDown" в Alertmanager и вебхуке!');
}

async function triggerProberRecover() {
  console.log('>>> [ВОССТАНОВЛЕНИЕ: ProberServiceDown]');
  console.log('    Отправляю запросы /recover и /nodelay на порт автономного пробера (9090)...');
  const res = await sendHttp(PROBER_PORT, '/recover');
  await sendHttp(PROBER_PORT, '/nodelay');
  console.log(`    Ответ пробера: статус ${res.status}.`);
  console.log('    [OK] Пробер восстановлен в штатный режим (SLI 3 вернётся к 100%).');
  console.log('    В Alertmanager и вебхуке статус алерта изменится на RESOLVED.');
}

async function triggerHttpErrors(seconds = 35) {
  console.log(`>>> [СИМУЛЯЦИЯ АЛЕРТА: HighHttpErrorRate] на ${seconds} секунд...`);
  console.log('    Генерирую поток запросов с ошибками (403 Forbidden к /api/parkingList)...');

  const endTime = Date.now() + seconds * 1000;
  let sent = 0;
  while (Date.now() < endTime) {
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(sendHttp(BACKEND_PORT, '/api/parkingList'));
      sent++;
    }
    await Promise.all(promises);
    process.stdout.write('!');
    await sleep(250);
  }
  console.log(`\n    [OK] Отправлено ${sent} сбойных запросов. Доля ошибок > 5%.`);
  console.log('    Через ~20-30 секунд алерт "HighHttpErrorRate" перейдет в FIRING.');
}

async function triggerAuthFailures(count = 40) {
  console.log(`>>> [СИМУЛЯЦИЯ АЛЕРТА: HighAuthFailureRate] (${count} неудачных попыток входа)...`);
  for (let i = 0; i < count; i++) {
    await sendHttp(BACKEND_PORT, '/api/login', 'POST', JSON.stringify({
      email: `intruder_${i}@attack.com`,
      password: 'wrong_password_attempt'
    }));
    process.stdout.write('X');
    await sleep(100);
  }
  console.log(`\n    [OK] Отправлено ${count} неудачных попыток входа.`);
  console.log('    Через ~15-20 секунд алерт "HighAuthFailureRate" перейдет в FIRING.');
}

function setJvmThreshold(percent, forceRestart = false) {
  try {
    if (!forceRestart) {
      const current = execSync('kubectl get configmap alert-rules -o "jsonpath={.data[\'alerts\\.yaml\']}"', { encoding: 'utf8' });
      const curMatch = current.match(/jvm_memory_max_bytes\{area="heap"\} > 0\)\) \* 100 > (\d+)/);
      if (curMatch && parseInt(curMatch[1], 10) === percent) {
        return false; // уже нужный порог
      }
    }
    const raw = fs.readFileSync(path.join(__dirname, 'k8s', '11-alert-rules.yaml'), 'utf8');
    const match = raw.match(/alerts\.yaml:\s*\|\r?\n([\s\S]+)$/);
    if (!match) throw new Error('Не найден блок alerts.yaml в k8s/11-alert-rules.yaml');

    const alertsBody = match[1]
      .split(/\r?\n/)
      .map(l => l.replace(/^    /, ''))
      .join('\n')
      .replace(/(jvm_memory_max_bytes\{area="heap"\} > 0\)\) \* 100 > )\d+/, `$1${percent}`);

    const tmpPath = path.join(os.tmpdir(), 'park-psu-alerts.yaml');
    fs.writeFileSync(tmpPath, alertsBody, 'utf8');

    execSync(`kubectl create configmap alert-rules --from-file=alerts.yaml="${tmpPath}" -o yaml --dry-run=client | kubectl apply -f -`, { stdio: 'pipe' });
    execSync('kubectl rollout restart deployment/vmalert && kubectl rollout status deployment/vmalert --timeout=45s', { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.log(`    [!] Не удалось переключить порог JVM через kubectl: ${e.message}`);
    return false;
  }
}

async function triggerJvmFail() {
  console.log('>>> [СИМУЛЯЦИЯ АЛЕРТА: JvmHeapMemoryUsageHigh]');
  console.log('    Временно снижаю порог JVM Heap в кластере до > 25% (боевой порог в файле остается 80%)...');
  const restarted = setJvmThreshold(25, true);
  if (restarted) {
    console.log('    [!] Тестовый порог > 25% активирован в vmalert.');
    console.log('    Через ~15-20 секунд сработает алерт "JvmHeapMemoryUsageHigh" на метрику Spring Actuator!');
  }
}

async function triggerJvmRecover() {
  console.log('>>> [ВОССТАНОВЛЕНИЕ ПОРОГА: JvmHeapMemoryUsageHigh]');
  const restarted = setJvmThreshold(80, false);
  if (restarted) {
    console.log('    [OK] Возвращен боевой порог JVM Heap (> 80%).');
    console.log('    Через ~15-20 секунд придет уведомление RESOLVED для JvmHeapMemoryUsageHigh.');
  } else {
    console.log('    [OK] Боевой порог JVM Heap (> 80%) уже активен.');
  }
}

async function triggerAllRecover() {
  await triggerProberRecover();
  await triggerJvmRecover();
}

async function runDemo() {
  console.log('========================================================================');
  console.log('  ПОЛНЫЙ СКВОЗНОЙ ДЕМО-СЦЕНАРИЙ (СБОЙ -> АЛЕРТЫ -> АВТОВОССТАНОВЛЕНИЕ)');
  console.log('========================================================================\n');

  console.log('1. Подготовка исходного состояния (пробер и боевой порог JVM 80%)...');
  await triggerProberRecover();
  setJvmThreshold(80, false);
  await sleep(3000);
  await getStatus();

  console.log('2. Фаза сбоев — запуск инцидентов:');
  await triggerJvmFail();
  await triggerProberFail();
  await triggerAuthFailures(45);
  await triggerHttpErrors(25);

  console.log('\n3. Ожидание оценки правил vmalert и доставки FIRING в Alertmanager (25 секунд)...');
  for (let s = 25; s > 0; s -= 5) {
    console.log(`   Осталось ${s} секунд...`);
    await sleep(5000);
  }

  console.log('\n4. Фиксация активных сработавших алертов (FIRING):');
  await getStatus();

  console.log('========================================================================');
  console.log('  АЛЕРТЫ АКТИВНЫ (FIRING)! Можно посмотреть в браузере:');
  console.log('  1. Webhook Receiver UI:     http://localhost:5001');
  console.log('  2. Alertmanager Web UI:     http://localhost:9093');
  console.log('  Пауза 15 секунд перед автоматическим восстановлением...');
  console.log('========================================================================\n');
  await sleep(15000);

  console.log('5. Фаза автоматического восстановления всех сервисов и порогов...');
  await triggerAllRecover();

  console.log('\n6. Генерация штатного трафика (200 OK) и ожидание уведомлений RESOLVED (55 секунд)...');
  const recEnd = Date.now() + 25000;
  while (Date.now() < recEnd) {
    const batch = [];
    for (let i = 0; i < 25; i++) batch.push(sendHttp(BACKEND_PORT, '/actuator/health'));
    await Promise.all(batch);
    process.stdout.write('.');
    await sleep(250);
  }
  console.log('\n   Штатный трафик отправлен, дожидаемся закрытия алертов в Alertmanager (30 секунд)...');
  for (let s = 30; s > 0; s -= 5) {
    console.log(`   Осталось ${s} секунд...`);
    await sleep(5000);
  }

  console.log('\n7. Финальное состояние системы после восстановления:');
  await getStatus();
}

async function main() {
  const cmd = process.argv[2] || 'status';

  switch (cmd) {
    case 'status':
      await getStatus();
      break;
    case 'metrics':
      await printMetrics();
      break;
    case 'prober':
    case 'prober-fail':
      await triggerProberFail();
      break;
    case 'jvm':
    case 'jvm-fail':
      await triggerJvmFail();
      break;
    case 'jvm-recover':
      await triggerJvmRecover();
      break;
    case 'recover':
      await triggerAllRecover();
      break;
    case 'prober-recover':
      await triggerProberRecover();
      break;
    case 'http-errors':
      const secs = parseInt(process.argv[3] || '35', 10);
      await triggerHttpErrors(secs);
      break;
    case 'auth':
    case 'auth-failures':
      const cnt = parseInt(process.argv[3] || '45', 10);
      await triggerAuthFailures(cnt);
      break;
    case 'demo':
      await runDemo();
      break;
    default:
      console.log(`Неизвестная команда: ${cmd}`);
      console.log('Доступные команды:');
      console.log('  node trigger_alerts.js status          - проверить текущий статус алертов');
      console.log('  node trigger_alerts.js metrics         - значения метрик в VictoriaMetrics');
      console.log('  node trigger_alerts.js demo            - полный сценарий: сбой -> FIRING -> автовосстановление -> RESOLVED');
      console.log('  node trigger_alerts.js prober-fail     - вызвать отказ пробера (ProberServiceDown)');
      console.log('  node trigger_alerts.js jvm-fail        - активировать демо-порог JVM (25%) для JvmHeapMemoryUsageHigh');
      console.log('  node trigger_alerts.js recover         - восстановить пробер и вернуть боевой порог JVM (80%)');
      console.log('  node trigger_alerts.js http-errors     - сгенерировать поток ошибок API');
      console.log('  node trigger_alerts.js auth-failures   - сгенерировать всплеск ошибок входа');
      break;
  }
}

main();
