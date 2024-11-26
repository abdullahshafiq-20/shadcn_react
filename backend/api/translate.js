const express = require('express');
const router = express.Router();
const { translate } = require('@vitalets/google-translate-api');

router.post('/translate', async (req, res) => {
  try {
    const { text, from, to } = req.body;
    
    const result = await translate(text, { from, to });
    
    res.json({
      success: true,
      translatedText: result.text
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      success: false,
      message: 'Translation failed',
      error: error.message
    });
  }
});

module.exports = router; 