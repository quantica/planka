// eslint-disable-next-line import/no-extraneous-dependencies
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || ''),
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

module.exports = {
  inputs: {
    to: {
      type: 'string',
      isEmail: true,
      required: true,
    },
    cardId: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const values = _.pick(inputs, ['to', 'cardId']);
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: values.to,
      subject: 'Card atualiado - kanban.quanti.ca',
      html: ``,
    });

    console.log('Message sent: %s', info.messageId);

    return info.messageId;
  },
};
