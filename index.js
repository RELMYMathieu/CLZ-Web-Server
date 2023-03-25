const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3001;
const receiverEmail = process.env['eml'];
const emailPassword = process.env['emlps'];
const discordWebhookURL = process.env['discordWebhookURL'];

console.log('Receiver email:', receiverEmail);

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

let maintenance = false;

app.get('/', (req, res) => {
  if (maintenance) {
    res.status(503).send('Service Unavailable');
  } else {
    res.send('Hello, this is the root path of the email sending server. Please use a POST request to send an email.');
  }
});

app.post('/', async (req, res) => {
  console.log('Request received', req.body);

  const formData = req.body;
  const formId = req.body.formId;

  delete formData.formId;

  const mailOptions = {
    from: `Application from ${formData.phone} - ${formId}`,
    to: receiverEmail,
    subject: `Application from ${formData.phone} - ${formId}`,
    text: `Form ID: ${formId}\n\n` +
      Object.entries(formData)
        .map(([key, value]) => `${key}: ${value}\n\n`)
        .join(''),
  };

  // Send the email
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: receiverEmail,
        pass: emailPassword,
      },
    });

    console.log(formData);
    console.log('Sending email');

    await transporter.sendMail(mailOptions);
    console.log('Email sent');
    res.status(200).send('Email sent');
  } catch (error) {
    console.log('Error sending email:', error);
    res.status(500).send('Error sending email: ' + error.message);
  }

  // Send the form data to Discord
  await sendToDiscord(formData, formId);
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: receiverEmail,
    pass: emailPassword,
  },
});

transporter.verify(function(error, success) {
  if (error) {
    console.log('Error verifying email service and credentials:', error);
  } else {
    console.log('Login is good');
  }
});

async function sendToDiscord(formData, formId) {
  const content = `Form ID: ${formId}\n\n` +
    Object.entries(formData)
      .map(([key, value]) => `${key}: ${value}\n\n`)
      .join('');

  const payload = {
    content: content,
  };

  try {
    const response = await fetch(discordWebhookURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    console.log('Message sent to Discord');
  } catch (error) {
    console.error('Error sending message to Discord:', error);
  }
}

app.get('/', (req, res) => {
  if (maintenance) {
    res.status(503).send('Service Unavailable');
  } else {
    res.send('im alive');
  }
});

app.listen(3000, () => {
  console.log('App listening to 3000');
});

app.put('/maintenance', (req, res) => {
  const { maintenance: maintenanceFlag } = req.body;
  if (typeof maintenanceFlag === 'boolean') {
    maintenance = maintenanceFlag;
    const message = maintenance ? 'Maintenance mode enabled' : 'Maintenance mode disabled';
    console.log(message);
    res.send(message);

    // If maintenance is enabled, shut down the server
    if (maintenance) {
      console.log('Shutting down server due to maintenance mode');
      server.close(() => {
        console.log('Server has been shut down');
        process.exit(0);
      });
    }

  } else {
    res.status(400).send('Invalid maintenance flag');
  }
});

app.get('/', (req, res) => {
  if (maintenance) {
    res.status(503).send('Service Unavailable');
  } else {
    // Handle request as usual
    res.send('Hello, world!');
  }
});

const server = app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
});