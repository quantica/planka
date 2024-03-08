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
    name: {
      type: 'string',
      required: true,
    },
    password: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const values = _.pick(inputs, ['to', 'name', 'password']);
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: values.to,
      subject: 'Você foi convidado para o kanban.quanti.ca',
      html: `
      <!DOCTYPE html>
      <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center}
                p {text-align: left}
                .header { color: #333; text-align: center; }
                .content { margin-top: 20px; }
                .ii a[href] {color: #fff;}
                .logo {width: 100px}
                .button { display: inline-block; padding: 10px 20px; background-color: #0092db; color: #fff; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
          <div class="container">
          <h1 class="header">Bem-Vindo(a) ${values.name}!</h1>
            <div class="content">
              <p>Sua conta foi criada com sucesso.</p>
              <p>Sua senha é: <b>${values.password}</b></p>
              <p>Para começar, clique no botão abaixo:</p>
              <a href="https://kanban.quanti.ca" class="button">Acessar Minha Conta</a>
            </div>
          </div>
        </body>
      </html>
      `,
    });

    console.log('Message sent: %s', info.messageId);

    return info.messageId;
  },
};
