/**
 * Purge RabbitMQ queue messages for a target vhost (topology unchanged).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

/**
 * @param {string} vhost
 */
function encodeMgmtVhost(vhost) {
  const name = vhost.startsWith('/') ? vhost : `/${vhost}`;
  return encodeURIComponent(name);
}

/**
 * @param {string} root
 * @param {ReturnType<typeof import('../db/lib/target.mjs').resolveTarget>} target
 */
function dockerRabbitmqExec(root, target, subcommand) {
  const args = ['compose'];
  if (target.project) args.push('-p', target.project);
  for (const file of target.composeFiles) {
    args.push('-f', path.join(root, file));
  }
  args.push('exec', '-T', target.rabbitmqService, ...subcommand);
  return spawnSync('docker', args, { encoding: 'utf8' });
}

/**
 * @param {string} root
 * @param {ReturnType<typeof import('../db/lib/target.mjs').resolveTarget>} target
 */
export async function resetTargetMessaging(root, target) {
  const mgmtPort = target.rabbitmqMgmtPort;
  const vhostEnc = encodeMgmtVhost(target.rabbitmqVhost);
  const auth = Buffer.from(`${target.rabbitmqUser}:${target.rabbitmqPassword}`).toString('base64');

  let queues = [];
  try {
    const res = await fetch(`http://localhost:${mgmtPort}/api/queues/${vhostEnc}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`[state] RabbitMQ vhost ${target.rabbitmqVhost} not found — skipping purge`);
        return;
      }
      throw new Error(`RabbitMQ API list queues failed: ${res.status}`);
    }
    queues = await res.json();
  } catch (err) {
    console.warn(`[state] RabbitMQ management unreachable on :${mgmtPort} — ${err.message}`);
    purgeViaRabbitmqctl(root, target);
    return;
  }

  for (const q of queues) {
    const nameEnc = encodeURIComponent(q.name);
    const purgeRes = await fetch(
      `http://localhost:${mgmtPort}/api/queues/${vhostEnc}/${nameEnc}/contents`,
      {
        method: 'DELETE',
        headers: { Authorization: `Basic ${auth}` },
      },
    );
    if (!purgeRes.ok) {
      console.warn(`[state] failed to purge queue ${q.name}: ${purgeRes.status}`);
    } else {
      console.log(`[state] purged queue ${target.rabbitmqVhost}/${q.name}`);
    }
  }
}

/**
 * @param {string} root
 * @param {ReturnType<typeof import('../db/lib/target.mjs').resolveTarget>} target
 */
function purgeViaRabbitmqctl(root, target) {
  const listResult = dockerRabbitmqExec(root, target, [
    'rabbitmqctl',
    'list_queues',
    '-p',
    target.rabbitmqVhost,
    'name',
  ]);

  if (listResult.status !== 0) {
    console.warn('[state] rabbitmqctl list_queues failed — broker may be down');
    return;
  }

  const names = listResult.stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== 'name' && !l.startsWith('Listing'));

  for (const name of names) {
    dockerRabbitmqExec(root, target, [
      'rabbitmqctl',
      'purge_queue',
      '-p',
      target.rabbitmqVhost,
      name,
    ]);
    console.log(`[state] purged queue ${target.rabbitmqVhost}/${name}`);
  }
}
