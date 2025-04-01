const { exec } = require('child_process');
const crypto = require('crypto');

const deployProject = () => {
    return new Promise((resolve, reject) => {
        exec('cd /home/bitnami/crickflix/backend && git pull && npm install && pm2 restart all', 
            (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error: ${error}`);
                    reject(error);
                    return;
                }
                console.log(`stdout: ${stdout}`);
                console.error(`stderr: ${stderr}`);
                resolve(stdout);
            }
        );
    });
};

const verifySignature = (signature, payload, secret) => {
    const hmac = crypto.createHmac('sha256', secret);
    const calculatedSignature = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature));
};

module.exports = { deployProject, verifySignature }; 