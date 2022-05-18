// Maximum number of times to attempt the MyRetry function before giving up.
const MAX_ATTEMPTS = 100;

/**
 * Encode an error in a format accepted by ExpressHandler
 * @param {string} errorMessage The error message to show a client
 * @param {number?} status HTTP status code to serve client
 */
 const HTTPError = (errorMessage, status=500) => ({
  status,
  data: errorMessage
});

/**
 * Retry a specified function a number of times before giving up.
 * If the call is unsuccessful, the last error is returned.
 * 
 * @param {Function} f The function to run
 * @param {String} errorMessage A message to display should there be errors.
 */
const MyRetry = async (f, errorMessage, delay_ms=undefined, maxAttempts=MAX_ATTEMPTS) => {
  const errors = [];

  for (let i=0; i < maxAttempts; i++) {
    try {
      const res = await f();
      return res;
    }
    catch (e) {
      errors.push(e);
    }

    if (delay_ms) {
      await (new Promise( (resolve) => {
        setTimeout(resolve, delay_ms)
      } ));
    }
  }

  console.error(`There were ${errors.length} errors ${errorMessage}.`);
    throw errors.at(-1);
}

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
  }
  catch (e) {
    LogError(e);
    res.status(500).send('Unexpected error ' + actionMessage);
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

  const messageHtml =
`<div>
  <p>
    <b>Message:</b> ${error.message}
  </p>

  <hr>

  <p>
    <b>Stack:</b>
    ${ stackToDivs(error?.stack || 'N/A') }
  </p>

  <hr>

  <pre>
    ${ JSON.stringify(error, null, 2) }
  </pre>
</div>`;

  const subject = `Pack-Ship Error on ${new Date().toLocaleString()}`;
  sendMailTo( process.env.ERRORS_ADDR,  subject, '', messageHtml);
}

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
    text
  };
  if (html) mailOptions.html = html;

  if (process.env.NO_EMAIL === '1') {

    if (process.env.NO_EMAIL_LOG === '1') {
      console.debug('Email suppressed. Use env NO_EMAIL_LOG=0 to see contents.');
    }
    else {
      console.debug(mailOptions);
    }

    return;
  }

  try {
    await MyRetry(() => sendMailP(mailOptions), 'sending email');
  }
  catch (e) {
    console.log('Critical error sending mail');
    console.error(e);

    return [e];
  }

  return [null, null];
}

async function sendMailP(mailOptions) {
  return new Promise( (resolve, reject) => {
    transporter.sendMail(mailOptions, function(err, info) {
      if (err) reject(err);
      else resolve(info);
    });
  });
}

module.exports = {
  ExpressHandler,
  HTTPError,
  LogError,
  MyRetry
};