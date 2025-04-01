const express = require('express');
const router = express.Router();
const { deployProject, verifySignature } = require('../utils/webhookHandler');

// Add a root route handler
router.get('/', (req, res) => {
    res.json({ message: 'Webhook service is running' });
});

router.post('/webhook/github', async (req, res) => {
    // Log all headers for debugging
    console.log('All Headers:', req.headers);
    
    const signature = req.headers['x-hub-signature-256'];
    const githubEvent = req.headers['x-github-event'];
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    
    console.log('Webhook Details:', {
        signature: signature || 'not provided',
        githubEvent: githubEvent || 'not provided',
        webhookSecret: webhookSecret || 'not set',
        body: req.body
    });

    if (!signature) {
        return res.status(401).json({ error: 'No signature found' });
    }

    // Verify webhook signature
    try {
        const isValid = verifySignature(
            signature,
            JSON.stringify(req.body),
            webhookSecret
        );

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Signature verification failed:', error);
        return res.status(500).json({ error: 'Signature verification failed' });
    }

    // Handle push event
    if (githubEvent === 'push') {
        try {
            await deployProject();
            res.json({ success: true, message: 'Deployment triggered successfully' });
        } catch (error) {
            console.error('Deployment failed:', error);
            res.status(500).json({ error: 'Deployment failed' });
        }
    } else {
        res.json({ success: true, message: 'Event received but no action taken' });
    }
});

module.exports = router; 