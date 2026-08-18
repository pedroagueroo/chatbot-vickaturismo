const { spawn } = require('child_process');

function setVercelEnv(key, value) {
  return new Promise((resolve, reject) => {
    console.log(`Setting ${key}...`);
    const child = spawn('npx.cmd', ['vercel', 'env', 'add', key, 'production'], {
      stdio: ['pipe', 'inherit', 'inherit']
    });

    child.stdin.write(value);
    child.stdin.end();

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Process exited with code ${code}`));
    });
  });
}

async function run() {
  try {
    await setVercelEnv('VITE_SUPABASE_URL', 'https://eyvitviyjykgqawuwhzl.supabase.co');
    await setVercelEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5dml0dml5anlrZ3Fhd3V3aHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzY5MzMsImV4cCI6MjEwMjA1MjkzM30.9sL_vAJHzmgLaWpDKy63-Za0BC_gyQyTxHBZOSiZt9Q');
    console.log('Successfully set Vercel env vars!');
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
