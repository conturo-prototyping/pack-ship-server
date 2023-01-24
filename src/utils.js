/* eslint-disable no-console */
const { createTransport } = require('nodemailer');
const { ObjectId } = require('mongodb');

// Maximum number of times to attempt the MyRetry function before giving up.
const MAX_ATTEMPTS = 100;

/**
 * Encode an error in a format accepted by ExpressHandler
 * @param {string} errorMessage The error message to show a client
 * @param {number?} status HTTP status code to serve client
 */
const HTTPError = (errorMessage, status = 500) => ({
  status,
  data: errorMessage,
});

/**
 * Retry a specified function a number of times before giving up.
 * If the call is unsuccessful, the last error is returned.
 *
 * @param {Function} f The function to run
 * @param {String} errorMessage A message to display should there be errors.
 */
const MyRetry = async (
  f,
  errorMessage,
  delay_ms = undefined,
  maxAttempts = MAX_ATTEMPTS,
) => {
  const errors = [];

  for (let i = 0; i < maxAttempts; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await f();
      return res;
    } catch (e) {
      errors.push(e);
    }

    if (delay_ms) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, delay_ms);
      });
    }
  }

  console.error(`There were ${errors.length} errors ${errorMessage}.`);
  throw errors.at(-1);
};

/**
 * Genering handler to wrap express route handler logic in.
 * @param {Function} f
 * @param {express.Response} res
 * @param {String} actionMessage
 */
const ExpressHandler = async (f, res, actionMessage) => {
  try {
    const result = await f();
    const { status, data } = result || {};

    res.status(status || 200).send(data);
  } catch (e) {
    LogError(e);
    res.status(500).send(`Unexpected error ${actionMessage}`);
  }
};

/**
 * Send an error log to developer address.
 * For debugging use the flags NO_EMAIL=1 and NO_EMAIL_LOG=0
 *
 * @param {*} error The error to output. Assumes NodeJS.Error structure
 */
const LogError = (error) => {
  console.error(error);

  const messageHtml = `<div>
  <p>
    <b>Message:</b> ${error.message}
  </p>

  <hr>

  <p>
    <b>Stack:</b>
    ${stackToDivs(error?.stack || 'N/A')}
  </p>

  <hr>

  <pre>
    ${JSON.stringify(error, null, 2)}
  </pre>
</div>`;

  const subject = `Pack-Ship Error on ${new Date().toLocaleString()}`;
  sendMailTo(process.env.ERRORS_ADDR, subject, '', messageHtml);
};

/**
 *
 * @param {string} toAddr
 * @param {string} subject
 * @param {string} text
 * @param {string} html The HTML content to send
 */
async function sendMailTo(toAddr, subject, text, html) {
  const mailOptions = {
    from: process.env.MAILER_ADDR,
    to: toAddr,
    subject,
    text,
  };
  if (html) mailOptions.html = html;

  if (process.env.NO_EMAIL === '1') {
    if (process.env.NO_EMAIL_LOG === '1') {
      console.debug(
        'Email suppressed. Use env NO_EMAIL_LOG=0 to see contents.',
      );
    } else {
      console.debug(mailOptions);
    }

    return [null, null];
  }

  try {
    await MyRetry(() => sendMailP(mailOptions), 'sending email');
  } catch (e) {
    console.log('Critical error sending mail');
    console.error(e);

    return [e];
  }

  return [null, null];
}

async function sendMailP(mailOptions) {
  const transporter = createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAILER_ADDR,
      pass: process.env.MAILER_PASS,
    },
  });

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) reject(err);
      else resolve(info);
    });
  });
}

function stackToDivs(stack) {
  return stack
    ?.split('\n')
    .map((line) => `<div>${line}</div>`)
    .join('');
}

async function checkId(res, next, model, id) {
  if (!id) {
    // Make sure id is provided
    res
      .status(400)
      .send(`Please provide an id for ${model.collection.collectionName}`);
  } else if (!ObjectId.isValid(id)) {
    // Verify if id is valid
    res
      .status(404)
      .send(`${id} for ${model.collection.collectionName} not valid`);
  } else {
    // Find the id and if it doesnt exist, raise an error
    const data = await model.findById(id).lean();
    // Check if the data exists
    if (!data) {
      res
        .status(404)
        .send(`${id} for ${model.collection.collectionName} not found`);
    } else {
      res.locals.data = data;
      next();
    }
  }
}

module.exports = {
  ExpressHandler,
  HTTPError,
  LogError,
  MyRetry,
  checkId,
};
