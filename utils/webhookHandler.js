const { exec } = require('child_process');
const crypto = require('crypto');

const deployProject = () => {
    console.log('Starting deployment process...');
    return new Promise((resolve, reject) => {
        // Use the correct bitnami path
        const command = 'cd /home/bitnami/crickflix/backend && ' +
                       'git config --global --add safe.directory /home/bitnami/crickflix/backend && ' +
                       'git fetch origin && ' +
                       'git reset --hard origin/main && ' +
                       'npm install && ' +
                       'pm2 restart crickflix-backend';
        
        console.log('Executing command:', command);
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Deployment Error:', error);
                console.error('Error details:', stderr);
                reject(error);
                return;
            }
            console.log('Deployment Output:', stdout);
            if (stderr) console.log('Deployment Warnings:', stderr);
            console.log('Deployment completed successfully');
            resolve(stdout);
        });
    });
};

const verifySignature = (signature, payload, secret) => {
    try {
        console.log('Verifying signature...');
        console.log('Received signature:', signature);
        
        const hmac = crypto.createHmac('sha256', secret);
        const calculatedSignature = 'sha256=' + hmac.update(payload).digest('hex');
        console.log('Calculated signature:', calculatedSignature);
        
        const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature));
        console.log('Signature valid:', isValid);
        
        return isValid;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
};

module.exports = { deployProject, verifySignature }; 